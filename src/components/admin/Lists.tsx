import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryIcon, ICON_NAMES } from "@/components/CategoryIcon";
import type { Category } from "@/lib/directory";
import { input, btn, useAll } from "./shared";

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
      {ICON_NAMES.map((n) => (
        <button type="button" key={n} title={n} onClick={() => onChange(n)} className={`grid aspect-square place-items-center rounded-lg ${value === n ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
          <CategoryIcon name={n} className="size-5" />
        </button>
      ))}
    </div>
  );
}

type CatForm = { id?: string; name: string; icon: string; sort_order: number; status: string };

export function Categories({ prefill, onPrefillUsed }: { prefill?: string | null; onPrefillUsed?: () => void }) {
  const qc = useQueryClient();
  const { categories, providers } = useAll();
  const rows = categories.data ?? [];
  const [form, setForm] = useState<CatForm | null>(null);
  if (prefill && !form) {
    setForm({ name: prefill, icon: "Wrench", sort_order: rows.length + 1, status: "active" });
    onPrefillUsed?.();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !form.name.trim()) return;
    const row = { name: form.name.trim(), icon: form.icon, sort_order: Number(form.sort_order) || 0, status: form.status };
    const { error } = form.id ? await supabase.from("categories").update(row).eq("id", form.id) : await supabase.from("categories").insert(row);
    if (error) { toast.error(error.message.includes("duplicate") ? "الاسم موجود بالفعل" : error.message); return; }
    toast.success("اتحفظ");
    setForm(null);
    qc.invalidateQueries();
  }
  async function move(c: Category, dir: -1 | 1) {
    const i = rows.findIndex((r) => r.id === c.id);
    const other = rows[i + dir];
    if (!other) return;
    await supabase.from("categories").update({ sort_order: other.sort_order }).eq("id", c.id);
    await supabase.from("categories").update({ sort_order: c.sort_order === other.sort_order ? c.sort_order + dir : c.sort_order }).eq("id", other.id);
    qc.invalidateQueries();
  }
  async function toggle(c: Category) {
    const { error } = await supabase.from("categories").update({ status: c.status === "active" ? "hidden" : "active" }).eq("id", c.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries();
  }
  const count = (id: string) => (providers.data ?? []).filter((p) => p.category_id === id).length;

  if (form)
    return (
      <form onSubmit={save} className="surface grid gap-3 p-5">
        <h2 className="text-xl font-extrabold">{form.id ? "تعديل قسم" : "إضافة قسم"}</h2>
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CategoryIcon name={form.icon} className="size-7" /></span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم القسم" maxLength={60} required className={input} />
        </div>
        <p className="text-sm font-bold">اختار الأيقونة</p>
        <IconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-sm font-bold">ترتيب العرض<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className={input} /></label>
          <label className="grid gap-1 text-sm font-bold">الحالة<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}><option value="active">مفعل</option><option value="hidden">مخفي</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className={btn}>حفظ</button>
          <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-border py-3 font-bold">إلغاء</button>
        </div>
      </form>
    );

  return (
    <div className="grid gap-3">
      <button onClick={() => setForm({ name: "", icon: "Wrench", sort_order: rows.length + 1, status: "active" })} className={btn}>+ إضافة قسم</button>
      {rows.map((c, i) => (
        <div key={c.id} className="surface flex items-center gap-3 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CategoryIcon name={c.icon} className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{c.name} {c.status !== "active" ? <span className="text-xs text-destructive">(مخفي)</span> : null}</p>
            <p className="text-xs text-muted-foreground">{count(c.id)} صنايعي · ترتيب {c.sort_order}</p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button aria-label="لأعلى" disabled={i === 0} onClick={() => move(c, -1)} className="rounded-lg p-2 hover:bg-secondary disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button aria-label="لأسفل" disabled={i === rows.length - 1} onClick={() => move(c, 1)} className="rounded-lg p-2 hover:bg-secondary disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button aria-label="تعديل" onClick={() => setForm({ id: c.id, name: c.name, icon: c.icon ?? "Wrench", sort_order: c.sort_order, status: c.status })} className="rounded-lg p-2 hover:bg-secondary"><Pencil className="size-5" /></button>
            <button aria-label="إخفاء/إظهار" onClick={() => toggle(c)} className="rounded-lg p-2 hover:bg-secondary">{c.status === "active" ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Areas() {
  const qc = useQueryClient();
  const { areas } = useAll();
  const rows = areas.data ?? [];
  const [name, setName] = useState("");

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("areas").insert({ name: name.trim() });
    if (error) { toast.error(error.message.includes("duplicate") ? "الاسم موجود بالفعل" : error.message); return; }
    setName("");
    qc.invalidateQueries();
  }
  async function rename(id: string, old: string) {
    const v = prompt("الاسم الجديد", old);
    if (!v?.trim()) return;
    const { error } = await supabase.from("areas").update({ name: v.trim() }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries();
  }
  async function toggle(id: string, status: string) {
    const { error } = await supabase.from("areas").update({ status: status === "active" ? "hidden" : "active" }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries();
  }

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم منطقة جديدة" maxLength={60} className={input} />
        <button onClick={add} className={`${btn} shrink-0`}>إضافة</button>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="surface flex items-center justify-between p-3">
          <p className="font-bold">{r.name} {r.status !== "active" ? <span className="text-xs text-destructive">(مخفي)</span> : null}</p>
          <div className="flex gap-1">
            <button aria-label="تعديل" onClick={() => rename(r.id, r.name)} className="rounded-lg p-2 hover:bg-secondary"><Pencil className="size-5" /></button>
            <button aria-label="إخفاء/إظهار" onClick={() => toggle(r.id, r.status)} className="rounded-lg p-2 hover:bg-secondary">{r.status === "active" ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExperienceManager() {
  const qc = useQueryClient();
  const { experience } = useAll();
  const rows = experience.data ?? [];
  const [label, setLabel] = useState("");
  const [edit, setEdit] = useState<{ id: string; label: string } | null>(null);
  const done = () => qc.invalidateQueries();

  async function add() {
    if (!label.trim()) return;
    const max = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { error } = await supabase.from("experience_options").insert({ label: label.trim(), sort_order: max + 1 });
    if (error) { toast.error(error.message); return; }
    setLabel("");
    done();
  }
  async function saveEdit() {
    if (!edit?.label.trim()) return;
    await supabase.from("experience_options").update({ label: edit.label.trim() }).eq("id", edit.id);
    setEdit(null);
    done();
  }
  async function move(i: number, dir: -1 | 1) {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    await supabase.from("experience_options").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("experience_options").update({ sort_order: a.sort_order === b.sort_order ? a.sort_order + dir : a.sort_order }).eq("id", b.id);
    done();
  }
  async function del(id: string) {
    if (!confirm("حذف الاختيار ده؟ الصنايعية المرتبطين بيه هيبقوا بدون خبرة محددة.")) return;
    const { error } = await supabase.from("experience_options").delete().eq("id", id);
    if (error) toast.error(error.message);
    done();
  }
  async function toggle(id: string, status: string) {
    await supabase.from("experience_options").update({ status: status === "active" ? "hidden" : "active" }).eq("id", id);
    done();
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: 3 - 5 سنوات" maxLength={40} className={input} />
        <button onClick={add} className={`${btn} shrink-0`}>إضافة</button>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="surface flex items-center gap-2 p-2.5">
          {edit?.id === r.id ? (
            <>
              <input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} className={input} />
              <button aria-label="حفظ" onClick={saveEdit} className="rounded-lg p-2 text-primary"><Check className="size-5" /></button>
              <button aria-label="إلغاء" onClick={() => setEdit(null)} className="rounded-lg p-2"><X className="size-5" /></button>
            </>
          ) : (
            <>
              <p className="flex-1 font-bold">{r.label} {r.status !== "active" ? <span className="text-xs text-destructive">(غير مفعل)</span> : null}</p>
              <button aria-label="لأعلى" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg p-2 disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button aria-label="لأسفل" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-2 disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button aria-label="تعديل" onClick={() => setEdit({ id: r.id, label: r.label })} className="rounded-lg p-2"><Pencil className="size-4" /></button>
              <button aria-label="تفعيل/إلغاء" onClick={() => toggle(r.id, r.status)} className="rounded-lg p-2">{r.status === "active" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              <button aria-label="حذف" onClick={() => del(r.id)} className="rounded-lg p-2 text-destructive"><Trash2 className="size-4" /></button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
