import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addAdmin } from "@/lib/admins.functions";
import { input, btn, btnGhost } from "./shared";

type AdminRow = { id: string; email: string; is_owner: boolean; active: boolean; added_by_email: string | null; created_at: string };

const ERR: Record<string, string> = {
  already_admin: "الإيميل ده عنده صلاحية بالفعل.",
  invalid_email: "الإيميل مش صحيح.",
  not_owner: "المالك الرئيسي بس اللي يقدر يعمل كده.",
  not_found: "مش موجود أو ماينفعش تعديله.",
};
const msg = (m: string) => Object.entries(ERR).find(([k]) => m.includes(k))?.[1] ?? "حصلت مشكلة، جرّب تاني";

export function Admins() {
  const qc = useQueryClient();
  const add = useServerFn(addAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_users" as never).select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as AdminRow[];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "admins"] }); qc.invalidateQueries({ queryKey: ["admin", "audit"] }); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast.error(ERR["invalid_email"]); return; }
    if (password && password.length < 8) { toast.error("كلمة السر 8 حروف على الأقل"); return; }
    if (list.data?.some((a) => a.email === em)) { toast.error(ERR["already_admin"]); return; }
    setBusy(true);
    try {
      const r = await add({ data: { email: em, password } });
      if (!r.ok) { toast.error(msg(r.code)); return; }
      toast.success(r.warning ? "اتضاف، بس ماقدرناش نعمل له كلمة سر" : "تمت إضافة المسؤول");
      setEmail(""); setPassword(""); refresh();
    } catch { toast.error("حصلت مشكلة، جرّب تاني"); } finally { setBusy(false); }
  }

  async function rpc(fn: string, args: Record<string, unknown>, ok: string) {
    const { error } = await supabase.rpc(fn as never, args as never);
    if (error) toast.error(msg(error.message)); else { toast.success(ok); refresh(); }
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={submit} className="surface grid gap-3 p-4">
        <h2 className="text-lg font-extrabold">إضافة مسؤول</h2>
        <input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className={input} />
        <input type="text" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة سر مبدئية (لو ماعندوش حساب)" className={input} />
        <p className="text-xs text-muted-foreground">لو الشخص ماعندوش حساب، اكتب كلمة سر مبدئية وابعتهاله عشان يدخل بيها.</p>
        <button disabled={busy} className={btn}>إضافة</button>
      </form>

      <section className="surface overflow-x-auto p-2">
        <h2 className="p-2 text-lg font-extrabold">المسؤولين</h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className="p-2 text-start">البريد</th><th className="p-2 text-start">الحالة</th><th className="p-2 text-start">تاريخ الإضافة</th><th className="p-2 text-start">أضافه</th><th className="p-2" /></tr></thead>
          <tbody>
            {(list.data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-2 font-bold" dir="ltr">{a.email}</td>
                <td className="p-2">{a.is_owner ? <span className="font-extrabold text-primary">المالك الرئيسي</span> : a.active ? "نشط" : "موقوف"}</td>
                <td className="p-2">{new Date(a.created_at).toLocaleDateString("ar-EG")}</td>
                <td className="p-2" dir="ltr">{a.added_by_email ?? "—"}</td>
                <td className="p-2">
                  {a.is_owner ? null : (
                    <div className="flex gap-1.5">
                      <button onClick={() => rpc("admin_set_active", { _id: a.id, _active: !a.active }, a.active ? "تم الإيقاف" : "تم التفعيل")} className={btnGhost}>{a.active ? "إيقاف" : "تفعيل"}</button>
                      <button onClick={() => { if (confirm(`سحب صلاحية ${a.email}؟`)) void rpc("admin_revoke", { _id: a.id }, "تم سحب الصلاحية"); }} className={`${btnGhost} text-destructive`}>سحب الصلاحية</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
