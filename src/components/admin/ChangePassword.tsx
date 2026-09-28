import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { input, btn } from "./shared";

export function ChangePassword() {
  const [email, setEmail] = useState<string | null>(null);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) { toast.error("كلمة المرور الجديدة لازم تكون 8 حروف على الأقل"); return; }
    if (next !== conf) { toast.error("كلمة المرور الجديدة وتأكيدها مش متطابقين"); return; }
    if (next === cur) { toast.error("كلمة المرور الجديدة لازم تختلف عن الحالية"); return; }
    if (!email) return;
    setBusy(true);
    try {
      const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: cur });
      if (e1) { toast.error("كلمة المرور الحالية غير صحيحة"); return; }
      const { error: e2 } = await supabase.auth.updateUser({ password: next });
      if (e2) {
        toast.error(/weak|pwned|leak/i.test(e2.message) ? "كلمة المرور دي ضعيفة أو مسرّبة، اختار واحدة أقوى" : "ماقدرناش نغيّر كلمة المرور، جرّب تاني");
        return;
      }
      toast.success("تم تغيير كلمة المرور بنجاح");
    } finally {
      setCur(""); setNext(""); setConf(""); setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface grid gap-3 p-5">
      <h2 className="text-lg font-extrabold">تغيير كلمة المرور</h2>
      <p className="text-sm text-muted-foreground">الحساب: <span dir="ltr" className="font-bold text-foreground">{email ?? "..."}</span></p>
      <input type="password" autoComplete="current-password" dir="ltr" required value={cur} onChange={(e) => setCur(e.target.value)} placeholder="كلمة المرور الحالية" className={input} />
      <input type="password" autoComplete="new-password" dir="ltr" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} placeholder="كلمة المرور الجديدة" className={input} />
      <input type="password" autoComplete="new-password" dir="ltr" required minLength={8} value={conf} onChange={(e) => setConf(e.target.value)} placeholder="تأكيد كلمة المرور الجديدة" className={input} />
      <button disabled={busy} className={btn}>{busy ? "جاري الحفظ..." : "تغيير كلمة المرور"}</button>
    </form>
  );
}
