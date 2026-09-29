import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, MapPin, ShieldCheck, Lightbulb, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitPublicForm, publicFormError } from "@/lib/public-forms.functions";
import { categoriesQuery, areasQuery, providersQuery } from "@/lib/directory";
import { ProviderCard } from "@/components/ProviderCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "أهل الصنعة — صنايعية وخدمات قريتك" },
      {
        name: "description",
        content:
          "دليل بسيط لأرقام الصنايعية وأصحاب الخدمات في القرية: كهربائي، سباك، نجار وغيرهم. اتصل أو كلّمهم على واتساب مباشرة.",
      },
      { property: "og:title", content: "أهل الصنعة — صنايعية وخدمات قريتك" },
      {
        property: "og:description",
        content: "ابحث عن صنايعي قريب منك واتصل بيه على طول.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");

  const categories = useQuery(categoriesQuery);
  const areas = useQuery(areasQuery);
  const featured = useQuery(providersQuery({ premiumOnly: true, areaId: areaId || undefined, limit: 6 }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: search || undefined, area: areaId || undefined } });
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4">
        <section className="pt-6">
          <h1 className="text-3xl font-extrabold text-foreground">محتاج صنايعي؟</h1>
          <p className="mt-1 text-muted-foreground">
            كل أرقام الصنايعية في مكان واحد. اتصل أو كلّمه واتساب على طول.
          </p>

          <form onSubmit={submit} className="mt-4 space-y-3" suppressHydrationWarning>
            <div className="surface flex items-center gap-3 px-4 py-3.5">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={60}
                className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                placeholder="ابحث باسم الصنايعي أو الخدمة"
                suppressHydrationWarning
              />
            </div>
            <div className="surface flex items-center gap-3 px-4 py-2.5">
              <MapPin className="size-5 shrink-0 text-primary" />
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full bg-transparent py-1 text-base outline-none"
                suppressHydrationWarning
              >
                <option value="">كل القرى والمناطق</option>
                {(areas.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="min-h-14 w-full rounded-xl bg-accent text-lg font-extrabold text-accent-foreground active:brightness-95"
            >
              ابحث عن صنايعي
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/search"
              search={{ filter: "available_now", area: areaId || undefined }}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition-all"
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>متاح الآن فقط</span>
            </Link>

            <Link
              to="/search"
              search={{ filter: "emergency_now", area: areaId || undefined }}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-all"
            >
              <Zap className="size-3.5 fill-current" />
              <span>خدمة طوارئ ٢٤ ساعة</span>
            </Link>
          </div>
        </section>

        <section className="pt-8">
          <h2 className="mb-3 text-xl font-extrabold">الخدمات</h2>
          {categories.isLoading ? (
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="surface h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {(categories.data ?? []).map((c) => (
                <Link
                  key={c.id}
                  to="/category/$id"
                  params={{ id: c.id }}
                  className="surface flex flex-col items-center justify-center gap-2 px-2 py-4 text-center active:brightness-95"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CategoryIcon name={c.icon} className="size-6" />
                  </span>
                  <span className="text-sm font-bold leading-tight">{c.name}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {(featured.data?.length ?? 0) > 0 ? (
          <section className="pt-8">
            <h2 className="mb-3 text-xl font-extrabold">صنايعية مميزين</h2>
            <div className="space-y-3">
              {featured.data!.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          </section>
        ) : null}

        <SuggestService />
        <NominateProvider categories={categories.data ?? []} areas={areas.data ?? []} />
      </main>

      <SiteFooter />
    </div>
  );
}

function SuggestService() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [hp, setHp] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim();
    if (v.length < 2) return;
    setBusy(true);
    const res = await submitPublicForm({ data: { form: "service_suggestion", name: v.slice(0, 60), website: hp } }).catch(() => ({ ok: false as const, code: "error" as const }));
    setBusy(false);
    if (!res.ok) { toast.error(publicFormError(res.code)); return; }
    toast.success("شكراً! وصلنا اقتراحك");
    setName("");
    setOpen(false);
  }
  return (
    <section className="surface mt-8 p-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 py-2 font-bold text-primary">
          <Lightbulb className="size-5" /> مش لاقي الخدمة؟ اقترح خدمة
        </button>
      ) : (
        <form onSubmit={send} className="grid gap-2" suppressHydrationWarning>
          <p className="font-extrabold">اقترح خدمة مش موجودة</p>
          <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" suppressHydrationWarning />
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="مثال: تصليح موبايلات" className="rounded-xl border border-border bg-card px-3 py-3 text-base" suppressHydrationWarning />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} className="rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">إرسال</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border py-3 font-bold">إلغاء</button>
          </div>
        </form>
      )}
    </section>
  );
}

function NominateProvider({ categories, areas }: { categories: { id: string; name: string }[]; areas: { id: string; name: string }[] }) {
  const empty = { name: "", phone: "", whatsapp: "", category_id: "", area_id: "", description: "", services: "" };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const cls = "rounded-xl border border-border bg-card px-3 py-3 text-base";
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2 || !f.phone.trim() || !f.category_id || !f.area_id) { toast.error("اكمل الاسم والتليفون والقسم والمنطقة"); return; }
    setBusy(true);
    const res = await submitPublicForm({ data: { form: "provider_application", website: hp, ...f, whatsapp: f.whatsapp || undefined, description: f.description || undefined, services: f.services || undefined } }).catch(() => ({ ok: false as const, code: "error" as const }));
    setBusy(false);
    if (!res.ok) { toast.error(publicFormError(res.code)); return; }
    toast.success("شكراً! الطلب هيتراجع وينزل بعد الموافقة");
    setF(empty);
    setOpen(false);
  }
  return (
    <section className="surface mt-4 p-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 py-2 font-bold text-primary">
          <UserPlus className="size-5" /> رشح حد
        </button>
      ) : (
        <form onSubmit={send} className="grid gap-2" suppressHydrationWarning>
          <p className="font-extrabold">رشح صنايعي</p>
          <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" suppressHydrationWarning />
          <input value={f.name} onChange={set("name")} maxLength={80} placeholder="الاسم" className={cls} suppressHydrationWarning />
          <input value={f.phone} onChange={set("phone")} maxLength={30} inputMode="tel" placeholder="التليفون" className={cls} suppressHydrationWarning />
          <input value={f.whatsapp} onChange={set("whatsapp")} maxLength={30} inputMode="tel" placeholder="واتساب (اختياري)" className={cls} suppressHydrationWarning />
          <select value={f.category_id} onChange={set("category_id")} className={cls} suppressHydrationWarning>
            <option value="">القسم</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={f.area_id} onChange={set("area_id")} className={cls} suppressHydrationWarning>
            <option value="">المنطقة</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <textarea value={f.description} onChange={set("description")} maxLength={500} rows={2} placeholder="الوصف (اختياري)" className={cls} suppressHydrationWarning />
          <input value={f.services} onChange={set("services")} maxLength={300} placeholder="الخدمات (اختياري)" className={cls} suppressHydrationWarning />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} className="rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">إرسال</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border py-3 font-bold">إلغاء</button>
          </div>
        </form>
      )}
    </section>
  );
}
