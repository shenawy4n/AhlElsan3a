import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "دخول المسؤول — أهل الصنعة" },
      { name: "description", content: "تسجيل دخول مسؤول أهل الصنعة." },
      { property: "og:title", content: "دخول المسؤول — أهل الصنعة" },
      { property: "og:description", content: "تسجيل دخول مسؤول أهل الصنعة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (forgot) {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      toast.success("لو الإيميل مسجّل عندنا، هيوصلك رابط لإعادة تعيين كلمة المرور.");
      setForgot(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error("البريد أو كلمة السر غلط"); return; }
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 pt-8">
        <form onSubmit={submit} className="surface grid gap-3 p-6">
          <h1 className="text-2xl font-extrabold">{forgot ? "استعادة كلمة المرور" : "دخول المسؤول"}</h1>
          <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="rounded-xl border border-border bg-card px-4 py-3 text-base" />
          {forgot ? null : (
            <input type="password" required minLength={8} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" className="rounded-xl border border-border bg-card px-4 py-3 text-base" />
          )}
          <button disabled={busy} className="rounded-xl bg-primary py-3.5 text-lg font-extrabold text-primary-foreground disabled:opacity-60">
            {busy ? "جاري..." : forgot ? "إرسال رابط إعادة التعيين" : "دخول"}
          </button>
          <button type="button" onClick={() => setForgot(!forgot)} className="py-1 text-sm font-bold text-primary">
            {forgot ? "رجوع لتسجيل الدخول" : "نسيت كلمة المرور؟"}
          </button>
          <p className="text-xs text-muted-foreground">الدخول للمسؤولين المصرّح لهم فقط.</p>
        </form>
      </main>
    </div>
  );
}
