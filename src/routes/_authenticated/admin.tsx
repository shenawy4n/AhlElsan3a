import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Admins } from "@/components/admin/Admins";
import { Providers } from "@/components/admin/Providers";
import { Categories, Areas } from "@/components/admin/Lists";
import { Overview, Analytics, Reports, Suggestions, AuditLog, Settings, Applications } from "@/components/admin/Insights";
import { AdminReviews } from "@/components/admin/Reviews";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — أهل الصنعة" },
      { name: "description", content: "إدارة الصنايعية والأقسام والقرى." },
      { property: "og:title", content: "لوحة التحكم — أهل الصنعة" },
      { property: "og:description", content: "إدارة أهل الصنعة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});


function AdminPage() {
  const navigate = useNavigate();
  const role = useQuery({
    queryKey: ["admin-level"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_admin_level" as never);
      if (error) throw error;
      return (data as unknown as "owner" | "admin" | null) ?? null;
    },
  });
  const [tab, setTab] = useState<Tab>("home");
  const [editId, setEditId] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState(false);
  const [catPrefill, setCatPrefill] = useState<string | null>(null);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (role.isLoading) return <p className="p-8 text-center">جاري التحقق...</p>;
  if (!role.data)
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-bold">ليس لديك صلاحية الدخول إلى لوحة الإدارة</p>
        <button onClick={logout} className="mt-4 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">تسجيل خروج</button>
      </div>
    );
  const isOwner = role.data === "owner";
  const tabs = isOwner ? [...TABS, ["admins", "إدارة المسؤولين"] as const] : TABS;

  const go = (t: string, action?: string) => {
    setTab(t as Tab);
    setEditId(null);
    setNewProvider(t === "providers" && action === "new");
    if (t === "categories" && action === "new") setCatPrefill("");
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-extrabold">لوحة التحكم · أهل الصنعة</Link>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground"><LogOut className="size-4" /> خروج</button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => go(k)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-5">
        {tab === "home" && <Overview go={go} />}
        {tab === "providers" && <Providers key={`${editId}-${newProvider}`} editId={editId} startNew={newProvider} onClearEdit={() => { setEditId(null); setNewProvider(false); }} />}
        {tab === "categories" && <Categories prefill={catPrefill} onPrefillUsed={() => setCatPrefill(null)} />}
        {tab === "areas" && <Areas />}
        {tab === "analytics" && <Analytics />}
        {tab === "reports" && <Reports onEdit={(id) => { setEditId(id); setNewProvider(false); setTab("providers"); }} />}
        {tab === "suggestions" && <Suggestions onCreate={(n) => { setCatPrefill(n); setTab("categories"); }} />}
        {tab === "applications" && <Applications />}
        {tab === "reviews" && <AdminReviews />}
        {tab === "audit" && <AuditLog />}
        {tab === "settings" && <Settings />}
        {tab === "admins" && isOwner && <Admins />}
      </main>
    </div>
  );
}

const TABS = [
  ["home", "الرئيسية"],
  ["providers", "الصنايعية"],
  ["reviews", "التقييمات"],
  ["categories", "الأقسام"],
  ["areas", "المناطق"],
  ["analytics", "الإحصائيات"],
  ["reports", "البلاغات"],
  ["applications", "طلبات التسجيل"],
  ["suggestions", "اقتراحات الخدمات"],
  ["audit", "سجل التغييرات"],
  ["settings", "الإعدادات / الحساب"],
] as const;
type Tab = (typeof TABS)[number][0] | "admins";
