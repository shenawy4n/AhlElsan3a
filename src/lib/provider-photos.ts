import { supabase } from "@/lib/supabase-runtime";

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const BUCKET_NAME = "provider-photos";

export type AllowedMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

export interface PhotoValidationResult {
  valid: boolean;
  ext: string;
  error?: string;
}

/**
 * Strict file validation:
 * - Checks file size (<= 5MB)
 * - Checks MIME type (image/jpeg, image/png, image/webp)
 * - Checks file extension (.jpg, .jpeg, .png, .webp)
 */
export function validatePhotoFile(file: File): PhotoValidationResult {
  if (!file) {
    return { valid: false, ext: "", error: "يرجى اختيار ملف صورة" };
  }

  // 1. File size check
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      ext: "",
      error: `حجم الصورة (${sizeMb} ميجابايت) يتجاوز الحد الأقصى المسموح به وهو 5 ميجابايت`,
    };
  }

  // 2. MIME type check
  if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      ext: "",
      error: "نوع الملف غير مدعوم. الصيغ المسموح بها فقط هي: JPG و PNG و WebP",
    };
  }

  // 3. Extension check
  const parts = file.name.split(".");
  const ext = (parts.length > 1 ? parts.pop() : "")?.toLowerCase() || "";
  if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext as (typeof ALLOWED_PHOTO_EXTENSIONS)[number])) {
    return {
      valid: false,
      ext: "",
      error: `امتداد الملف (.${ext}) غير مسموح به. الصيغ المسموحة: .jpg, .jpeg, .png, .webp`,
    };
  }

  // Normalize ext: "jpeg" -> "jpg" or keep as is
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  return { valid: true, ext: normalizedExt };
}

/**
 * Builds a secure UUID-based path: provider_id/uuid.ext
 * Strictly prevents directory traversal or arbitrary paths.
 */
export function buildPhotoStoragePath(providerId: string, ext: string): string {
  // Ensure providerId is a safe identifier (UUID or alphanumeric with dashes)
  const safeProviderId = providerId.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeProviderId) {
    throw new Error("معرّف الصنايعي غير صالح");
  }

  const fileUuid = crypto.randomUUID();
  const safeExt = ext.replace(/[^a-z0-9]/g, "");
  return `${safeProviderId}/${fileUuid}.${safeExt}`;
}

/**
 * Extracts storage relative path if URL belongs to provider-photos bucket
 */
export function getStoragePathFromUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  const bucketMarker = `/${BUCKET_NAME}/`;
  const idx = photoUrl.indexOf(bucketMarker);
  if (idx === -1) return null;
  const pathPart = photoUrl.slice(idx + bucketMarker.length).split("?")[0];
  return pathPart ? decodeURIComponent(pathPart) : null;
}

/**
 * Uploads a provider photo to Supabase storage with safe validation and UUID path.
 */
export async function uploadProviderPhoto(
  providerId: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const validation = validatePhotoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "الملف غير صالح");
  }

  const storagePath = buildPhotoStoragePath(providerId, validation.ext);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(`فشل رفع الصورة: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return {
    path: storagePath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Deletes a photo from the provider-photos bucket if it belongs there.
 */
export async function deleteProviderPhotoFromStorage(photoUrl: string): Promise<boolean> {
  const storagePath = getStoragePathFromUrl(photoUrl);
  if (!storagePath) return false;

  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    if (error) {
      console.warn("Storage removal warning:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to delete old photo:", err);
    return false;
  }
}
