import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Public Form Gateway: every anonymous form goes through here.
// Order: honeypot -> validation/sanitization -> DB rate limit -> insert with server credentials.
// Future forms (provider applications, reviews) add a schema + handler below.

const clean = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

const REPORT_REASONS = [
  "رقم الهاتف لا يعمل",
  "البيانات غير صحيحة",
  "الصنايعي لا يعمل بهذه الصنعة",
  "البيانات قديمة",
  "سبب آخر",
] as const;

const schema = z.discriminatedUnion("form", [
  z.object({
    form: z.literal("service_suggestion"),
    website: z.string().optional(),
    name: clean(60).pipe(z.string().min(2)),
  }),
  z.object({
    form: z.literal("report"),
    website: z.string().optional(),
    provider_id: z.string().uuid(),
    reason: z.enum(REPORT_REASONS),
    details: z
      .string()
      .optional()
      .transform((s) => (s ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, " ").trim().slice(0, 500) || null),
  }),
  z.object({
    form: z.literal("provider_application"),
    website: z.string().optional(),
    name: clean(80).pipe(z.string().min(2)),
    phone: z.string().max(30),
    whatsapp: z.string().max(30).optional(),
    category_id: z.string().uuid(),
    area_id: z.string().uuid(),
    description: clean(500).optional(),
    services: clean(300).optional(),
  }),
  z.object({
    form: z.literal("review"),
    website: z.string().optional(),
    provider_id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: clean(500).pipe(z.string().min(3)),
    reviewer_name: clean(50).optional(),
  }),
]);

type Result = { ok: true } | { ok: false; code: "invalid" | "rate_limited" | "error" | "invalid_phone" | "duplicate_phone" | "invalid_rating" | "short_comment" };

export const submitPublicForm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d)
  .handler(async ({ data: raw }): Promise<Result> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, code: "invalid" };
    const data = parsed.data;
    // Honeypot: bots fill the hidden field; pretend success, store nothing.
    if (data.website) return { ok: true };

    let phone: string | null = null;
    let whatsapp: string | null = null;
    if (data.form === "provider_application") {
      const { normalizeEgPhone } = await import("./directory");
      phone = normalizeEgPhone(data.phone);
      if (!phone) return { ok: false, code: "invalid_phone" };
      if (data.whatsapp?.trim()) {
        whatsapp = normalizeEgPhone(data.whatsapp);
        if (!whatsapp) return { ok: false, code: "invalid_phone" };
      }
    }

    const { checkRateLimit, getClientIp } = await import("./rate-limit.server");
    const allowed = await checkRateLimit(getClientIp(getRequest()), data.form);
    if (!allowed) return { ok: false, code: "rate_limited" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.form === "service_suggestion") {
      const { error } = await supabaseAdmin.from("service_suggestions").insert({ name: data.name });
      return error ? { ok: false, code: "error" } : { ok: true };
    }
    if (data.form === "provider_application") {
      const [cat, area, dupe, dupeApp] = await Promise.all([
        supabaseAdmin.from("categories").select("id").eq("id", data.category_id).eq("status", "active").maybeSingle(),
        supabaseAdmin.from("areas").select("id").eq("id", data.area_id).eq("status", "active").maybeSingle(),
        supabaseAdmin.from("providers").select("id,phone"),
        supabaseAdmin.from("provider_applications").select("id").eq("phone", phone!).eq("status", "pending").limit(1),
      ]);
      if (!cat.data || !area.data) return { ok: false, code: "invalid" };
      const { normalizeEgPhone } = await import("./directory");
      if ((dupe.data ?? []).some((p) => normalizeEgPhone(p.phone) === phone) || (dupeApp.data?.length ?? 0) > 0)
        return { ok: false, code: "duplicate_phone" };
      const { error } = await supabaseAdmin.from("provider_applications").insert({
        name: data.name, phone: phone!, whatsapp, category_id: data.category_id, area_id: data.area_id,
        description: data.description || null, services: data.services || null,
      });
      return error ? { ok: false, code: "error" } : { ok: true };
    }
    if (data.form === "review") {
      const { data: prov } = await supabaseAdmin
        .from("providers")
        .select("id")
        .eq("id", data.provider_id)
        .eq("status", "active")
        .maybeSingle();
      if (!prov) return { ok: false, code: "invalid" };
      const { createReview } = await import("./reviews.server");
      const res = await createReview({
        provider_id: data.provider_id,
        rating: data.rating,
        comment: data.comment,
        reviewer_name: data.reviewer_name || null,
      });
      return res.ok ? { ok: true } : { ok: false, code: "error" };
    }
    const { data: prov } = await supabaseAdmin
      .from("providers").select("id").eq("id", data.provider_id).eq("status", "active").maybeSingle();
    if (!prov) return { ok: false, code: "invalid" };
    const { error } = await supabaseAdmin
      .from("reports").insert({ provider_id: data.provider_id, reason: data.reason, details: data.details });
    return error ? { ok: false, code: "error" } : { ok: true };
  });

export function publicFormError(code: string) {
  if (code === "invalid_phone") return "رقم التليفون مش صحيح";
  if (code === "duplicate_phone") return "الرقم ده مسجل بالفعل";
  if (code === "invalid_rating") return "التقييم يجب أن يكون بين ١ و ٥ نجوم";
  if (code === "short_comment") return "يرجى كتابة تعليق لا يقل عن ٣ أحرف";
  return code === "rate_limited" ? "طلبات كتير في وقت قصير، حاول بعد شوية" : code === "invalid" ? "البيانات مش صحيحة" : "حصلت مشكلة، حاول تاني";
}
