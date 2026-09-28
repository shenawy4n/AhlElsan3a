import { useState, useRef, useEffect } from "react";
import { UploadCloud, Image as ImageIcon, Trash2, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  validatePhotoFile,
  ALLOWED_PHOTO_EXTENSIONS,
  MAX_PHOTO_SIZE_BYTES,
} from "@/lib/provider-photos";

interface ProviderPhotoUploaderProps {
  currentPhotoUrl: string | null;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onRemovePhoto: () => void;
  isUploading?: boolean;
}

export function ProviderPhotoUploader({
  currentPhotoUrl,
  selectedFile,
  onFileSelect,
  onRemovePhoto,
  isUploading = false,
}: ProviderPhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Manage object URL for local preview
  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      return;
    }

    const objUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objUrl);

    return () => {
      URL.revokeObjectURL(objUrl);
    };
  }, [selectedFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "الملف غير صالح");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    onFileSelect(file);
  }

  function handleClearSelection() {
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemove() {
    handleClearSelection();
    onRemovePhoto();
  }

  const effectivePreview = localPreviewUrl || currentPhotoUrl;

  return (
    <div className="surface grid gap-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-extrabold text-foreground flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          <span>صورة الصنايعي</span>
        </label>
        <span className="text-[11px] font-bold text-muted-foreground">
          JPG, PNG, WebP (بحد أقصى 5 ميجابايت)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      {effectivePreview ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border bg-card/60 p-3">
          {/* Image Thumbnail */}
          <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
            <img
              src={effectivePreview}
              alt="معاينة صورة الصنايعي"
              className="size-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-xs">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 grid gap-1.5 text-center sm:text-start">
            {selectedFile ? (
              <>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                  <CheckCircle2 className="size-3.5" /> صورة جديدة مختارة وجاهزة للرفع
                </p>
                <p className="text-xs font-bold text-foreground truncate max-w-xs" dir="ltr">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  سيتم رفع الصورة وحفظها تلقائياً عند الضغط على زر الحفظ.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-foreground">
                  توجد صورة حالية مسجلة للصنايعي.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  يمكنك استبدالها بصورة جديدة أو حذفها.
                </p>
              </>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted active:brightness-95 disabled:opacity-60"
              >
                {selectedFile ? "اختيار صورة أخرى" : "تغيير الصورة"}
              </button>

              {selectedFile ? (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleClearSelection}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:brightness-95"
                >
                  إلغاء التحديد
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleRemove}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 active:brightness-95"
                >
                  <Trash2 className="size-3.5 inline ml-1" /> حذف الصورة
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-card/70"
        >
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <UploadCloud className="size-6" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-foreground">
              اضغط لرفع صورة الصنايعي الحقيقية
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              الصيغ المدعومة: {ALLOWED_PHOTO_EXTENSIONS.map((e) => `.${e}`).join("، ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
