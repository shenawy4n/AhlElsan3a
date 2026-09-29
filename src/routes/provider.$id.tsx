import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Clock, Wallet, Wrench, Flag, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-runtime";
import { isPremiumActive, providerQuery } from "@/lib/directory";
import { PremiumBadge, VerifiedBadge, ProviderRatingBadge, EmergencyBadge } from "@/components/ProviderCard";
import { parseWorkingHours } from "@/lib/working-hours";
import { ContactButtons } from "@/components/ContactButtons";
import { SiteHeader } from "@/components/SiteHeader";
import { track } from "@/lib/track";
import { submitPublicForm, publicFormError } from "@/lib/public-forms.functions";
import { ProviderReviews } from "@/components/ProviderReviews";
import { WorkingHoursView } from "@/components/WorkingHoursView";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/provider/$id")({
  head: () => ({
    meta: [
      { title: "ملف الصنايعي — أهل الصنعة" },
      { name: "description", content: "بيانات الصنايعي ورقم التليفون والواتساب للتواصل المباشر." },
      { property: "og:title", content: "ملف الصنايعي — أهل الصنعة" },
      { property: "og:description", content: "اتصل بالصنايعي مباشرة من أهل الصنعة." },
    ],
  }),
  component: ProviderPage,
});

function Row({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 border-t border-border py-3.5">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <p className="whitespace-pre-line text-base">{value}</p>
      </div>
    </div>
  );
}

function ProviderPage() {
  const { id } = Route.useParams();
  const { data: p, isLoading } = useQuery(providerQuery(id));
  const pid = p?.id;
  const pcat = p?.category_id;
  useEffect(() => {
    if (pid) track("profile_view", { provider_id: pid, category_id: pcat });
  }, [pid, pcat]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pt-5">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <ArrowRight className="size-4" /> الرئيسية
        </Link>
        {isLoading ? (
          <p className="text-muted-foreground">جاري التحميل...</p>
        ) : !p ? (
          <p className="surface p-6 text-center text-lg font-bold">الصنايعي ده مش موجود.</p>
        ) : (
          <>
            <section className="surface p-5">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="mb-4 aspect-video w-full rounded-xl object-cover" />
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-extrabold">{p.name}</h1>
                <div className="flex flex-wrap justify-end gap-1">
                  {parseWorkingHours(p.working_hours)?.isEmergency24h ? <EmergencyBadge /> : null}
                  {p.is_verified ? <VerifiedBadge /> : null}
                  {isPremiumActive(p) ? <PremiumBadge /> : null}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-base text-muted-foreground">
                  <span className="font-bold text-primary">{p.categories?.name}</span>
                  <span className="mx-1.5">·</span>
                  <MapPin className="inline size-4 align-[-2px]" /> {p.areas?.name}
                </p>
                <ProviderRatingBadge providerId={p.id} />
              </div>
              <div className="mt-5">
                <ContactButtons
                  providerId={p.id}
                  hasWhatsapp={p.has_whatsapp}
                  big
                  providerInfo={{
                    name: p.name,
                    categoryName: p.categories?.name,
                    areaName: p.areas?.name,
                    isEmergency24h: parseWorkingHours(p.working_hours)?.isEmergency24h,
                  }}
                />
              </div>
              <div className="mt-5">
                {p.description ? <p className="mb-3 whitespace-pre-line text-base">{p.description}</p> : null}
                <Row icon={Award} label="سنوات الخبرة" value={p.experience_options?.label ?? null} />
                <Row icon={Wrench} label="الخدمات" value={p.services} />
                <Row icon={Wallet} label="الأسعار" value={p.price_description} />
                <WorkingHoursView workingHoursRaw={p.working_hours} />
              </div>
            </section>
            <ProviderReviews providerId={p.id} providerName={p.name} />
            <ReportBox providerId={p.id} />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function ReportBox({ providerId }: { providerId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"رقم الهاتف لا يعمل" | "البيانات غير صحيحة" | "الصنايعي لا يعمل بهذه الصنعة" | "البيانات قديمة" | "سبب آخر">("رقم الهاتف لا يعمل");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [hp, setHp] = useState("");

  async function submit() {
    setBusy(true);
    const res = await submitPublicForm({ data: { form: "report", provider_id: providerId, reason, details: details.trim().slice(0, 500), website: hp } }).catch(() => ({ ok: false as const, code: "error" as const }));
    setBusy(false);
    if (!res.ok) { toast.error(publicFormError(res.code)); return; }
    toast.success("شكراً! وصلنا البلاغ");
    setOpen(false);
    setDetails("");
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 py-3 font-bold text-muted-foreground">
        <Flag className="size-4" /> الإبلاغ عن مشكلة
      </button>
    );

  return (
    <section className="surface mt-4 grid gap-3 p-5" suppressHydrationWarning>
      <h2 className="text-lg font-extrabold">الإبلاغ عن مشكلة</h2>
      <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" suppressHydrationWarning />
      <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="rounded-xl border border-border bg-card px-3 py-3 text-base" suppressHydrationWarning>
        <option>رقم الهاتف لا يعمل</option>
        <option>البيانات غير صحيحة</option>
        <option>الصنايعي لا يعمل بهذه الصنعة</option>
        <option>البيانات قديمة</option>
        <option>سبب آخر</option>
      </select>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} placeholder="تفاصيل (اختياري)" className="rounded-xl border border-border bg-card px-3 py-3 text-base" suppressHydrationWarning />
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy} onClick={submit} className="rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">إرسال</button>
        <button onClick={() => setOpen(false)} className="rounded-xl border border-border py-3 font-bold">إلغاء</button>
      </div>
    </section>
  );
}
