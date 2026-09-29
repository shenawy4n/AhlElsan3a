import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, BadgeCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase-runtime";
import { isPremiumActive, settingsQuery, type Area, type Category, type ExperienceOption, type ProviderWithRefs } from "@/lib/directory";
import { input, btnGhost, useAll, isFlagged } from "./shared";
import { WorkingHoursEditor } from "./WorkingHoursEditor";
import { ProviderPhotoUploader } from "./ProviderPhotoUploader";
import { uploadProviderPhoto, deleteProviderPhotoFromStorage, validatePhotoFile } from "@/lib/provider-photos";

type Form = {
  id?: string;
  name: string; category_id: string; area_id: string; phone: string; secondary_phone: string; whatsapp: string;
  description: string; services: string; price_description: string; working_hours: string; photo_url: string;
  status: string; is_premium: boolean; premium_expires_at: string; experience_id: string; is_verified: boolean;
};
const empty: Form = { name: "", category_id: "", area_id: "", phone: "", secondary_phone: "", whatsapp: "", description: "", services: "", price_description: "", working_hours: "", photo_url: "", status: "active", is_premium: false, premium_expires_at: "", experience_id: "", is_verified: false };

function toForm(p: ProviderWithRefs): Form {
  return { id: p.id, name: p.name, category_id: p.category_id, area_id: p.area_id, phone: p.phone, secondary_phone: p.secondary_phone ?? "", whatsapp: p.whatsapp ?? "", description: p.description ?? "", services: p.services ?? "", price_description: p.price_description ?? "", working_hours: p.working_hours ?? "", photo_url: p.photo_url ?? "", status: p.status, is_premium: p.is_premium, premium_expires_at: p.premium_expires_at ? p.premium_expires_at.slice(0, 10) : "", experience_id: p.experience_id ?? "", is_verified: p.is_verified };
}

type Patch = Partial<{ status: string; is_verified: boolean; is_premium: boolean; premium_expires_at: string | null }>;

export function Providers({ editId, startNew, onClearEdit }: { editId?: string | null; startNew?: boolean; onClearEdit?: () => void }) {
  const qc = useQueryClient();
  const { providers, categories, areas, experience } = useAll();
  const settings = useQuery(settingsQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("");
  const [ver, setVer] = useState("");
  const [prem, setPrem] = useState("");
  const [exp, setExp] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Form | null>(null);
  const [handled, setHandled] = useState<string | null>(null);

  const all = providers.data ?? [];
  const key = editId ? `e${editId}` : startNew ? "new" : null;
  if (key && handled !== key && (startNew || all.length)) {
    setHandled(key);
    const p = all.find((x) => x.id === editId);
    setForm(p ? toForm(p) : { ...empty, status: settings.data?.["default_provider_status"] || "active" });
  }

  const refresh = () => qc.invalidateQueries();
  const list = all.filter((p) =>
    (!q || p.name.includes(q) || p.phone.includes(q)) &&
    (!cat || p.category_id === cat) &&
    (!area || p.area_id === area) &&
    (!status || p.status === status) &&
    (!ver || String(p.is_verified) === ver) &&
    (!prem || String(isPremiumActive(p)) === prem) &&
    (!exp || p.experience_id === exp) &&
    (!flagged || isFlagged(p)),
  );

  async function patch(ids: string[], row: Patch) {
    if (!ids.length) return;
    const { error } = await supabase.from("providers").update(row).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success("تم");
    refresh();
  }
  async function remove(ids: string[]) {
    if (!ids.length || !confirm(`حذف ${ids.length} صنايعي نهائياً؟`)) return;
    const { error } = await supabase.from("providers").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    setSel(new Set());
    toast.success("اتحذف");
    refresh();
  }
  const toggleSel = (id: string) => { const s = new Set(sel); if (s.has(id)) s.delete(id); else s.add(id); setSel(s); };

  const close = () => { setForm(null); onClearEdit?.(); refresh(); };
  if (form) return <ProviderForm form={form} categories={categories.data ?? []} areas={areas.data ?? []} experience={experience.data ?? []} onDone={close} />;

  const ids = [...sel];
  return (
    <div className="grid gap-3">
      <button onClick={() => setForm({ ...empty, status: settings.data?.["default_provider_status"] || "active" })} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-extrabold text-primary-foreground"><Plus className="size-5" /> إضافة صنايعي</button>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو رقم التليفون" className={input} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={input}><option value="">كل الأقسام</option>{(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={input}><option value="">كل المناطق</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}><option value="">كل الحالات</option><option value="active">ظاهر</option><option value="hidden">مخفي</option></select>
        <select value={ver} onChange={(e) => setVer(e.target.value)} className={input}><option value="">التوثيق: الكل</option><option value="true">موثّق</option><option value="false">غير موثّق</option></select>
        <select value={prem} onChange={(e) => setPrem(e.target.value)} className={input}><option value="">التمييز: الكل</option><option value="true">مميز</option><option value="false">عادي</option></select>
        <select value={exp} onChange={(e) => setExp(e.target.value)} className={input}><option value="">كل الخبرات</option>{(experience.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} className="size-4" /> <AlertTriangle className="size-4 text-destructive" /> بيانات تحتاج مراجعة</label>

      {ids.length > 0 ? (
        <div className="surface sticky top-0 z-10 flex flex-wrap items-center gap-1.5 p-2 text-sm">
          <span className="px-2 font-bold">محدد: {ids.length}</span>
          <button className={btnGhost} onClick={() => patch(ids, { status: "hidden" })}>إخفاء</button>
          <button className={btnGhost} onClick={() => patch(ids, { status: "active" })}>إظهار</button>
          <button className={btnGhost} onClick={() => patch(ids, { is_verified: true })}>توثيق</button>
          <button className={btnGhost} onClick={() => patch(ids, { is_verified: false })}>إلغاء التوثيق</button>
          <button className={btnGhost} onClick={() => patch(ids, { is_premium: true })}>تمييز</button>
          <button className={btnGhost} onClick={() => patch(ids, { is_premium: false, premium_expires_at: null })}>إلغاء التمييز</button>
          <button className={`${btnGhost} text-destructive`} onClick={() => remove(ids)}>حذف</button>
          <button className="px-2 text-muted-foreground" onClick={() => setSel(new Set())}>إلغاء التحديد</button>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{list.length} نتيجة</span>
        <button className="font-bold" onClick={() => setSel(new Set(list.map((p) => p.id)))}>تحديد الكل</button>
      </div>
      {list.length === 0 ? <p className="p-6 text-center text-muted-foreground">مفيش نتائج</p> : null}
      {list.map((p) => (
        <div key={p.id} className="surface flex items-center gap-2 p-3">
          <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggleSel(p.id)} className="size-5 shrink-0" aria-label="تحديد" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">
              {p.name}{" "}
              {p.is_verified ? <BadgeCheck className="inline size-4 text-primary" /> : null}{" "}
              {isPremiumActive(p) ? <Star className="inline size-4 fill-premium text-premium" /> : null}{" "}
              {p.status !== "active" ? <span className="text-xs text-destructive">(مخفي)</span> : null}{" "}
              {isFlagged(p) ? <AlertTriangle className="inline size-4 text-destructive" /> : null}
            </p>
            <p className="truncate text-sm text-muted-foreground">{p.categories?.name ?? "—"} · {p.areas?.name ?? "—"} · <span dir="ltr">{p.phone}</span>{p.experience_options ? ` · ${p.experience_options.label}` : ""}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
            <button aria-label="تعديل" title="تعديل" onClick={() => setForm(toForm(p))} className="rounded-lg p-2 hover:bg-secondary"><Pencil className="size-5" /></button>
            <button aria-label="توثيق" title={p.is_verified ? "إلغاء التوثيق" : "توثيق"} onClick={() => patch([p.id], { is_verified: !p.is_verified })} className={`rounded-lg p-2 hover:bg-secondary ${p.is_verified ? "text-primary" : "text-muted-foreground"}`}><BadgeCheck className="size-5" /></button>
            <button aria-label="تمييز" title={p.is_premium ? "إلغاء التمييز" : "تمييز"} onClick={() => patch([p.id], p.is_premium ? { is_premium: false, premium_expires_at: null } : { is_premium: true })} className={`rounded-lg p-2 hover:bg-secondary ${p.is_premium ? "text-premium" : "text-muted-foreground"}`}><Star className="size-5" /></button>
            <button aria-label="إخفاء/إظهار" title="إخفاء/إظهار" onClick={() => patch([p.id], { status: p.status === "active" ? "hidden" : "active" })} className="rounded-lg p-2 hover:bg-secondary">{p.status === "active" ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
            <button aria-label="حذف" title="حذف" onClick={() => remove([p.id])} className="rounded-lg p-2 text-destructive hover:bg-secondary"><Trash2 className="size-5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProviderForm({ form, categories, areas, experience, onDone }: { form: Form; categories: Category[]; areas: Area[]; experience: ExperienceOption[]; onDone: () => void }) {
  const [f, setF] = useState(form);
  const [busy, setBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const n = (v: string) => (v.trim() ? v.trim() : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.category_id || !f.area_id || !f.phone.trim()) {
      toast.error("الاسم والقسم والمنطقة والتليفون مطلوبين");
      return;
    }

    // Validate photo before proceeding if a file was selected
    if (photoFile) {
      const validation = validatePhotoFile(photoFile);
      if (!validation.valid) {
        toast.error(validation.error || "الصورة المختارة غير صالحة");
        return;
      }
    }

    setBusy(true);

    try {
      if (!f.id) {
        // Safe create -> upload/update flow for new provider
        // 1. Create provider first without photo (prevents orphan files if DB fails)
        const row = {
          name: f.name.trim(),
          category_id: f.category_id,
          area_id: f.area_id,
          phone: f.phone.trim(),
          secondary_phone: n(f.secondary_phone),
          whatsapp: n(f.whatsapp),
          description: n(f.description),
          services: n(f.services),
          price_description: n(f.price_description),
          working_hours: n(f.working_hours),
          photo_url: photoFile ? null : n(f.photo_url),
          status: f.status,
          is_premium: f.is_premium,
          is_verified: f.is_verified,
          experience_id: f.experience_id || null,
          premium_expires_at: f.is_premium && f.premium_expires_at ? new Date(f.premium_expires_at + "T23:59:59").toISOString() : null,
        };

        const { data: created, error: insertError } = await supabase
          .from("providers")
          .insert(row)
          .select("id")
          .single();

        if (insertError || !created) {
          throw new Error(insertError?.message || "فشل إنشاء بيانات الصنايعي");
        }

        const newId = created.id;

        // 2. Upload photo if selected
        if (photoFile) {
          try {
            const { publicUrl } = await uploadProviderPhoto(newId, photoFile);
            await supabase.from("providers").update({ photo_url: publicUrl }).eq("id", newId);
          } catch (uploadErr: any) {
            console.error("Photo upload error after create:", uploadErr);
            toast.warning("تم حفظ بيانات الصنايعي بنجاح، ولكن تعذر رفع الصورة. يمكنك المحاولة مجدداً عبر تعديل الصنايعي.");
            setBusy(false);
            onDone();
            return;
          }
        }

        toast.success("تمت إضافة الصنايعي بنجاح");
        setBusy(false);
        onDone();
      } else {
        // Update existing provider flow
        let finalPhotoUrl = f.photo_url;

        if (photoFile) {
          const { publicUrl } = await uploadProviderPhoto(f.id, photoFile);
          // If previous photo was in storage bucket, clean it up
          if (f.photo_url) {
            await deleteProviderPhotoFromStorage(f.photo_url);
          }
          finalPhotoUrl = publicUrl;
        } else if (photoRemoved) {
          if (f.photo_url) {
            await deleteProviderPhotoFromStorage(f.photo_url);
          }
          finalPhotoUrl = "";
        }

        const row = {
          name: f.name.trim(),
          category_id: f.category_id,
          area_id: f.area_id,
          phone: f.phone.trim(),
          secondary_phone: n(f.secondary_phone),
          whatsapp: n(f.whatsapp),
          description: n(f.description),
          services: n(f.services),
          price_description: n(f.price_description),
          working_hours: n(f.working_hours),
          photo_url: n(finalPhotoUrl),
          status: f.status,
          is_premium: f.is_premium,
          is_verified: f.is_verified,
          experience_id: f.experience_id || null,
          premium_expires_at: f.is_premium && f.premium_expires_at ? new Date(f.premium_expires_at + "T23:59:59").toISOString() : null,
        };

        const { error: updateError } = await supabase.from("providers").update(row).eq("id", f.id);
        if (updateError) {
          throw new Error(updateError.message);
        }

        toast.success("تم حفظ التعديلات بنجاح");
        setBusy(false);
        onDone();
      }
    } catch (err: any) {
      setBusy(false);
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    }
  }

  const field = (k: keyof Form, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="grid gap-1 text-sm font-bold">{label}<input value={f[k] as string} onChange={set(k)} className={input} {...extra} /></label>
  );
  const area = (k: keyof Form, label: string) => (
    <label className="grid gap-1 text-sm font-bold">{label}<textarea value={f[k] as string} onChange={set(k)} rows={3} className={input} /></label>
  );

  return (
    <form onSubmit={save} className="surface grid gap-3 p-5">
      <h2 className="text-xl font-extrabold">{f.id ? "تعديل صنايعي" : "إضافة صنايعي"}</h2>
      {field("name", "الاسم *", { required: true, maxLength: 100 })}
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-bold">القسم *<select value={f.category_id} onChange={set("category_id")} className={input} required><option value="">اختار</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-bold">المنطقة *<select value={f.area_id} onChange={set("area_id")} className={input} required><option value="">اختار</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      </div>
      <label className="grid gap-1 text-sm font-bold">سنوات الخبرة<select value={f.experience_id} onChange={set("experience_id")} className={input}><option value="">غير محدد</option>{experience.map((x) => <option key={x.id} value={x.id}>{x.label}{x.status !== "active" ? " (غير مفعل)" : ""}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2">
        {field("phone", "التليفون *", { required: true, dir: "ltr", inputMode: "tel", maxLength: 20 })}
        {field("whatsapp", "واتساب", { dir: "ltr", inputMode: "tel", maxLength: 20 })}
      </div>
      {field("secondary_phone", "رقم تاني", { dir: "ltr", inputMode: "tel", maxLength: 20 })}
      {area("description", "وصف")}
      {area("services", "تفاصيل الخدمات")}
      {field("price_description", "الأسعار")}
      <WorkingHoursEditor
        value={f.working_hours}
        onChange={(val) => setF({ ...f, working_hours: val })}
      />
      <ProviderPhotoUploader
        currentPhotoUrl={photoRemoved ? null : f.photo_url || null}
        selectedFile={photoFile}
        onFileSelect={(file) => {
          setPhotoFile(file);
          if (file) setPhotoRemoved(false);
        }}
        onRemovePhoto={() => {
          setPhotoFile(null);
          setPhotoRemoved(true);
          setF({ ...f, photo_url: "" });
        }}
        isUploading={busy}
      />
      <label className="grid gap-1 text-sm font-bold">الحالة<select value={f.status} onChange={set("status")} className={input}><option value="active">ظاهر</option><option value="hidden">مخفي</option></select></label>
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={f.is_verified} onChange={(e) => setF({ ...f, is_verified: e.target.checked })} className="size-5" /> موثّق</label>
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={f.is_premium} onChange={(e) => setF({ ...f, is_premium: e.target.checked })} className="size-5" /> مميز</label>
      {f.is_premium ? field("premium_expires_at", "ينتهي التمييز في (فاضي = بدون انتهاء)", { type: "date" }) : null}
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy} className="rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">حفظ</button>
        <button type="button" onClick={onDone} className="rounded-xl border border-border py-3 font-bold">إلغاء</button>
      </div>
    </form>
  );
}
