import { ChangePassword } from "./ChangePassword";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle, Eye, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/directory";
import { ExperienceManager } from "./Lists";
import { useAll, RangePicker, rangeStart, StatCard, input, btn, btnGhost, type Range } from "./shared";
import { adminListReviews } from "@/lib/reviews.functions";

type Ev = { event_type: string; provider_id: string | null; category_id: string | null };

function useEvents(range: Range) {
  return useQuery({
    queryKey: ["admin", "events", range],
    queryFn: async () => {
      const start = rangeStart(range);
      const out: Ev[] = [];
      for (let from = 0; from < 100000; from += 1000) {
        let q = supabase.from("analytics_events").select("event_type,provider_id,category_id").range(from, from + 999);
        if (start) q = q.gte("created_at", start);
        const { data, error } = await q;
        if (error) throw error;
        out.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return out;
    },
  });
}

export function Overview({ go }: { go: (tab: string, action?: string) => void }) {
  const { providers, categories, areas } = useAll();
  const ev = useEvents("all");
  const rev = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => adminListReviews({ data: { status: "all" } }),
  });
  const p = providers.data ?? [];
  const e = ev.data ?? [];
  const rList = rev.data ?? [];
  const pendingReviewsCount = rList.filter((r) => r.status === "pending").length;
  const approvedReviewsCount = rList.filter((r) => r.status === "approved").length;
  const c = (t: string) => e.filter((x) => x.event_type === t).length;
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => go("providers", "new")} className={btn}>+ صنايعي</button>
        <button onClick={() => go("categories", "new")} className={btn}>+ قسم</button>
        <button onClick={() => go("areas")} className={btn}>+ منطقة</button>
        <button onClick={() => go("reviews")} className={btnGhost}>التقييمات {pendingReviewsCount > 0 ? `(${pendingReviewsCount})` : ""}</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="إجمالي الصنايعية" value={p.length} />
        <StatCard label="الصنايعية النشطين" value={p.filter((x) => x.status === "active").length} />
        <StatCard label="تقييمات قيد المراجعة" value={pendingReviewsCount} />
        <StatCard label="تقييمات معتمدة" value={approvedReviewsCount} />
        <StatCard label="إجمالي الأقسام" value={categories.data?.length ?? 0} />
        <StatCard label="إجمالي المناطق" value={areas.data?.length ?? 0} />
        <StatCard label="مشاهدات الملفات" value={c("profile_view")} />
        <StatCard label="ضغطات الاتصال" value={c("phone_click")} />
        <StatCard label="ضغطات واتساب" value={c("whatsapp_click")} />
      </div>
    </div>
  );
}

type Sort = "profile_view" | "phone_click" | "whatsapp_click" | "phone_reveal";
const KINDS: Sort[] = ["profile_view", "phone_click", "whatsapp_click", "phone_reveal"];
const blank = () => ({ profile_view: 0, phone_click: 0, whatsapp_click: 0, phone_reveal: 0 });
const rate = (clicks: number, views: number) => (views ? `${Math.round((clicks / views) * 100)}%` : "—");

export function Analytics() {
  const [range, setRange] = useState<Range>("30");
  const [sort, setSort] = useState<Sort>("phone_click");
  const { providers, categories } = useAll();
  const ev = useEvents(range);
  const e = ev.data ?? [];

  const { byCat, byProv } = useMemo(() => {
    const provCat = new Map((providers.data ?? []).map((p) => [p.id, p.category_id]));
    const byCat = new Map<string, ReturnType<typeof blank>>();
    const byProv = new Map<string, ReturnType<typeof blank>>();
    for (const x of e) {
      if (!KINDS.includes(x.event_type as Sort)) continue;
      const t = x.event_type as Sort;
      const cat = x.category_id ?? (x.provider_id ? provCat.get(x.provider_id) : undefined);
      if (cat) { const o = byCat.get(cat) ?? blank(); o[t]++; byCat.set(cat, o); }
      if (x.provider_id) { const o = byProv.get(x.provider_id) ?? blank(); o[t]++; byProv.set(x.provider_id, o); }
    }
    return { byCat, byProv };
  }, [e, providers.data]);

  const cnt = (t: string) => e.filter((x) => x.event_type === t).length;
  const catRows = (categories.data ?? []).map((c) => ({ c, n: (providers.data ?? []).filter((p) => p.category_id === c.id).length, s: byCat.get(c.id) ?? blank() })).sort((a, b) => b.s[sort] - a.s[sort]);
  const provRows = (providers.data ?? []).map((p) => ({ p, s: byProv.get(p.id) ?? blank() }));
  const topBy = (k: Sort) => [...provRows].filter((r) => r.s[k] > 0).sort((a, b) => b.s[k] - a.s[k]).slice(0, 10);
  const provSorted = [...provRows].sort((a, b) => b.s[sort] - a.s[sort]).slice(0, 50);

  const th = "p-2 text-start font-bold";
  const sortBtn = (k: Sort, l: string) => <button onClick={() => setSort(k)} className={`${btnGhost} ${sort === k ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>;
  const topList = (k: Sort, title: string, Icon: typeof Phone, empty: string) => {
    const rows = topBy(k);
    return (
      <section className="surface p-4">
        <h2 className="mb-3 text-lg font-extrabold">{title}</h2>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
          <ol className="grid gap-2">
            {rows.map((r, i) => (
              <li key={r.p.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span className="font-bold">{i + 1}. {r.p.name} <span className="text-sm font-normal text-muted-foreground">· {r.p.categories?.name}</span></span>
                <span className="flex items-center gap-1 font-extrabold text-primary"><Icon className="size-4" />{r.s[k]}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  };

  return (
    <div className="grid gap-5">
      <RangePicker value={range} onChange={setRange} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="مشاهدات الملفات" value={cnt("profile_view")} />
        <StatCard label="ضغطات الاتصال" value={cnt("phone_click")} />
        <StatCard label="ضغطات WhatsApp" value={cnt("whatsapp_click")} />
        <StatCard label="عمليات البحث" value={cnt("search")} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {topList("phone_click", "الأكثر ضغطات اتصال", Phone, "مفيش ضغطات اتصال في الفترة دي.")}
        {topList("whatsapp_click", "الأكثر ضغطات WhatsApp", MessageCircle, "مفيش ضغطات واتساب في الفترة دي.")}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm"><span className="font-bold">ترتيب حسب:</span>{sortBtn("phone_click", "ضغطات الاتصال")}{sortBtn("profile_view", "المشاهدات")}{sortBtn("whatsapp_click", "WhatsApp")}</div>

      <section className="surface overflow-x-auto p-2">
        <h2 className="p-2 text-lg font-extrabold">حسب القسم</h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className={th}>القسم</th><th className={th}>الصنايعية</th><th className={th}>المشاهدات</th><th className={th}>ضغطات الاتصال</th><th className={th}>ضغطات WhatsApp</th></tr></thead>
          <tbody>{catRows.map((r) => <tr key={r.c.id} className="border-t border-border"><td className="p-2 font-bold">{r.c.name}</td><td className="p-2">{r.n}</td><td className="p-2">{r.s.profile_view}</td><td className="p-2">{r.s.phone_click}</td><td className="p-2">{r.s.whatsapp_click}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="surface overflow-x-auto p-2">
        <h2 className="p-2 text-lg font-extrabold">حسب الصنايعي</h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className={th}>اسم الصنايعي</th><th className={th}>الخدمة/الصنعة</th><th className={th}>عدد المشاهدات</th><th className={th}>ضغطات الاتصال</th><th className={th}>ضغطات WhatsApp</th><th className={th}>نسبة التحويل للاتصال</th></tr></thead>
          <tbody>{provSorted.map((r) => <tr key={r.p.id} className="border-t border-border"><td className="p-2 font-bold">{r.p.name}</td><td className="p-2">{r.p.categories?.name}</td><td className="p-2">{r.s.profile_view}</td><td className="p-2">{r.s.phone_click}</td><td className="p-2">{r.s.whatsapp_click}</td><td className="p-2">{rate(r.s.phone_click, r.s.profile_view)}</td></tr>)}</tbody>
        </table>
      </section>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Search className="size-3" /> زياراتك كمسؤول مش بتتحسب. ضغطة "اتصال" معناها إن الزائر ضغط الزرار، مش إن المكالمة تمت.</p>
    </div>
  );
}

type Report = { id: string; reason: string; details: string | null; status: string; created_at: string; provider_id: string; providers: { name: string; status: string } | null };
const R_STATUS: Record<string, string> = { new: "جديد", reviewing: "قيد المراجعة", resolved: "تم الحل", rejected: "مرفوض" };

export function Reports({ onEdit }: { onEdit: (providerId: string) => void }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const { data = [] } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*, providers(name,status)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Report[];
    },
  });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
  }
  async function hide(pid: string) {
    const { error } = await supabase.from("providers").update({ status: "hidden" }).eq("id", pid);
    if (error) { toast.error(error.message); return; }
    toast.success("اتخفى");
    qc.invalidateQueries();
  }
  const list = data.filter((r) => filter === "all" || (filter === "open" ? r.status === "new" || r.status === "reviewing" : r.status === filter));
  return (
    <div className="grid gap-3">
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className={input}>
        <option value="open">المفتوحة</option><option value="all">الكل</option>
        {Object.entries(R_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {list.length === 0 ? <p className="p-6 text-center text-muted-foreground">مفيش بلاغات</p> : null}
      {list.map((r) => (
        <div key={r.id} className={`surface p-4 ${r.status === "resolved" || r.status === "rejected" ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-extrabold">{r.providers?.name ?? "—"} {r.providers?.status === "hidden" ? <span className="text-xs text-destructive">(مخفي)</span> : null}</p>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold">{R_STATUS[r.status] ?? r.status}</span>
          </div>
          <p className="mt-1 font-bold text-primary">{r.reason}</p>
          {r.details ? <p className="mt-1 text-sm">{r.details}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-EG")}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.status === "new" ? <button className={btnGhost} onClick={() => setStatus(r.id, "reviewing")}>مراجعة</button> : null}
            <button className={btnGhost} onClick={() => onEdit(r.provider_id)}>تعديل الصنايعي</button>
            {r.providers?.status !== "hidden" ? <button className={btnGhost} onClick={() => hide(r.provider_id)}>إخفاء الصنايعي</button> : null}
            <button className={btnGhost} onClick={() => setStatus(r.id, "resolved")}>تم الحل</button>
            <button className={`${btnGhost} text-destructive`} onClick={() => setStatus(r.id, "rejected")}>رفض</button>
          </div>
        </div>
      ))}
    </div>
  );
}

type Sug = { id: string; name: string; status: string; created_at: string };

export function Suggestions({ onCreate }: { onCreate: (name: string) => void }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin", "suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_suggestions").select("*").eq("status", "new").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sug[];
    },
  });
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; ids: string[]; latest: string }>();
    for (const s of data) {
      const k = s.name.trim().toLowerCase();
      const g = m.get(k) ?? { name: s.name.trim(), ids: [], latest: s.created_at };
      g.ids.push(s.id);
      if (s.created_at > g.latest) g.latest = s.created_at;
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.ids.length - a.ids.length);
  }, [data]);
  async function mark(ids: string[], status: string) {
    await supabase.from("service_suggestions").update({ status }).in("id", ids);
    qc.invalidateQueries();
  }
  if (!groups.length) return <p className="p-6 text-center text-muted-foreground">مفيش اقتراحات جديدة</p>;
  return (
    <div className="grid gap-3">
      {groups.map((g) => (
        <div key={g.name} className="surface flex items-center justify-between gap-2 p-3">
          <div>
            <p className="font-extrabold">{g.name}</p>
            <p className="text-xs text-muted-foreground">{g.ids.length} طلب · آخر طلب {new Date(g.latest).toLocaleDateString("ar-EG")}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button className={btnGhost} onClick={() => { void mark(g.ids, "done"); onCreate(g.name); }}>إنشاء قسم</button>
            <button className={`${btnGhost} text-destructive`} onClick={() => mark(g.ids, "dismissed")}>تجاهل</button>
          </div>
        </div>
      ))}
    </div>
  );
}

type Log = { id: string; action: string; target: string | null; admin_email: string | null; created_at: string };

export function AuditLog() {
  const { data = [] } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as Log[];
    },
  });
  if (!data.length) return <p className="p-6 text-center text-muted-foreground">مفيش تغييرات مسجلة لسه</p>;
  return (
    <div className="surface divide-y divide-border">
      {data.map((l) => {
        const d = new Date(l.created_at);
        return (
          <div key={l.id} className="flex items-start justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <p><span className="font-extrabold">{l.action}</span>{l.target ? <>: {l.target}</> : null}</p>
              <p className="truncate text-xs text-muted-foreground" dir="ltr">{l.admin_email ?? "—"}</p>
            </div>
            <div className="shrink-0 text-end text-xs text-muted-foreground">
              <p>{d.toLocaleDateString("ar-EG")}</p>
              <p>{d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SETTING_FIELDS: [string, string, string?][] = [
  ["app_name", "اسم التطبيق"],
  ["tagline", "الشعار"],
  ["logo_url", "رابط اللوجو", "ltr"],
  ["contact_phone", "رقم التواصل", "ltr"],
  ["contact_whatsapp", "واتساب التواصل", "ltr"],
];

export function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [vals, setVals] = useState<Record<string, string> | null>(null);
  const v = vals ?? Object.fromEntries(Object.entries(data ?? {}).map(([k, x]) => [k, x ?? ""]));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const rows = [...SETTING_FIELDS.map(([k]) => k), "default_provider_status"].map((key) => ({ key, value: v[key]?.trim() || null, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("app_settings").upsert(rows);
    setBusy(false);
    if (error) { toast.error("ماقدرناش نحفظ الإعدادات، جرّب تاني"); return; }
    toast.success("اتحفظت الإعدادات");
    setVals(null);
    qc.invalidateQueries();
  }

  return (
    <div className="grid gap-5">
      <ChangePassword />
      <form onSubmit={save} className="surface grid gap-3 p-5">
        <h2 className="text-lg font-extrabold">إعدادات التطبيق</h2>
        {SETTING_FIELDS.map(([k, l, dir]) => (
          <label key={k} className="grid gap-1 text-sm font-bold">{l}<input value={v[k] ?? ""} dir={dir} onChange={(e) => setVals({ ...v, [k]: e.target.value })} className={input} maxLength={200} /></label>
        ))}
        <label className="grid gap-1 text-sm font-bold">الحالة الافتراضية للصنايعي الجديد
          <select value={v["default_provider_status"] || "active"} onChange={(e) => setVals({ ...v, default_provider_status: e.target.value })} className={input}><option value="active">ظاهر</option><option value="hidden">مخفي</option></select>
        </label>
        <p className="text-xs text-muted-foreground">التمييز (Premium) بيتفعّل يدوياً من صفحة الصنايعية مع تاريخ انتهاء اختياري.</p>
        <button disabled={busy} className={btn}>حفظ</button>
      </form>
      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold">سنوات الخبرة</h2>
        <ExperienceManager />
      </section>
    </div>
  );
}

type App = { id: string; name: string; phone: string; whatsapp: string | null; description: string | null; services: string | null; created_at: string; categories: { name: string } | null; areas: { name: string } | null };
const APP_ERR: Record<string, string> = { duplicate_phone: "فيه صنايعي بنفس الرقم", not_pending: "الطلب اتراجع قبل كده", invalid_phone: "الرقم مش صحيح", invalid_reason: "اكتب سبب الرفض" };

export function Applications() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const apps = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_applications")
        .select("id,name,phone,whatsapp,description,services,created_at,categories(name),areas(name)")
        .eq("status", "pending").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as App[];
    },
  });
  async function act(id: string, approve: boolean) {
    let reason = "";
    if (!approve) { reason = window.prompt("سبب الرفض")?.trim() ?? ""; if (!reason) return; }
    setBusy(id);
    const { error } = approve
      ? await supabase.rpc("approve_application", { _id: id })
      : await supabase.rpc("reject_application", { _id: id, _reason: reason });
    setBusy(null);
    if (error) { const k = Object.keys(APP_ERR).find((x) => error.message.includes(x)); toast.error(k ? APP_ERR[k]! : "حصلت مشكلة"); return; }
    toast.success(approve ? "تم القبول ونشر الصنايعي" : "تم الرفض");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }
  if (apps.isLoading) return <p>جاري التحميل...</p>;
  const list = apps.data ?? [];
  if (!list.length) return <p className="text-muted-foreground">لا توجد طلبات جديدة</p>;
  return (
    <div className="grid gap-3">
      {list.map((a) => (
        <div key={a.id} className="surface grid gap-1 p-4">
          <p className="font-extrabold">{a.name}</p>
          <p className="text-sm text-muted-foreground">{a.categories?.name} · {a.areas?.name} · {new Date(a.created_at).toLocaleDateString("ar-EG")}</p>
          <p className="text-sm" dir="ltr">{a.phone}{a.whatsapp ? ` · WA ${a.whatsapp}` : ""}</p>
          {a.description && <p className="text-sm">{a.description}</p>}
          {a.services && <p className="text-sm text-muted-foreground">{a.services}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button disabled={busy === a.id} onClick={() => act(a.id, true)} className={btn}>قبول</button>
            <button disabled={busy === a.id} onClick={() => act(a.id, false)} className={btnGhost}>رفض</button>
          </div>
        </div>
      ))}
    </div>
  );
}
