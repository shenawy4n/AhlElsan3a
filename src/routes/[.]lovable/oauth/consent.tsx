import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-runtime";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "السماح بالوصول — أهل الصنعة" },
      { name: "description", content: "الموافقة على وصول تطبيق خارجي لأدوات أهل الصنعة." },
      { property: "og:title", content: "السماح بالوصول — أهل الصنعة" },
      { property: "og:description", content: "الموافقة على وصول تطبيق خارجي لأدوات أهل الصنعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const [clientName, setClientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("authorization_id") : null;

  useEffect(() => {
    (async () => {
      if (!id) { setError("طلب غير صالح"); return; }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        const back = window.location.pathname + window.location.search;
        window.location.href = `/auth?redirect=${encodeURIComponent(back)}`;
        return;
      }
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
      if (error || !data) { setError("تعذّر تحميل الطلب"); return; }
      if ("redirect_url" in data && data.redirect_url) { window.location.href = data.redirect_url; return; }
      setClientName(("client" in data && data.client?.name) || "تطبيق خارجي");
    })();
  }, [id]);

  async function decide(approve: boolean) {
    if (!id) return;
    setBusy(true);
    const res = approve
      ? await supabase.auth.oauth.approveAuthorization(id)
      : await supabase.auth.oauth.denyAuthorization(id);
    if (res.error) { setBusy(false); setError("حصل خطأ، حاول تاني"); }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 pt-8">
        <div className="surface grid gap-3 p-6">
          <h1 className="text-2xl font-extrabold">السماح بالوصول</h1>
          {error ? <p className="text-destructive">{error}</p> : !clientName ? <p>جاري التحميل...</p> : (
            <>
              <p><strong>{clientName}</strong> عايز يستخدم أدوات البحث في أهل الصنعة باسم حسابك.</p>
              <button disabled={busy} onClick={() => decide(true)} className="rounded-xl bg-primary py-3 text-lg font-extrabold text-primary-foreground disabled:opacity-60">موافق</button>
              <button disabled={busy} onClick={() => decide(false)} className="rounded-xl border border-border py-3 font-bold">رفض</button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
