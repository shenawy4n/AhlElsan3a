import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROVIDER_SELECT, type Area, type Category, type ExperienceOption, type ProviderWithRefs } from "@/lib/directory";

export const input = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base";
export const btn = "rounded-xl bg-primary px-4 py-2.5 font-extrabold text-primary-foreground disabled:opacity-60";
export const btnGhost = "rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold hover:bg-secondary";

export function useAll() {
  const providers = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select(PROVIDER_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProviderWithRefs[];
    },
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
  const areas = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Area[];
    },
  });
  const experience = useQuery({
    queryKey: ["admin", "experience"],
    queryFn: async () => {
      const { data, error } = await supabase.from("experience_options").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as ExperienceOption[];
    },
  });
  return { providers, categories, areas, experience };
}

export type Range = "today" | "7" | "30" | "all";
export const RANGES: [Range, string][] = [["today", "اليوم"], ["7", "آخر 7 أيام"], ["30", "آخر 30 يوم"], ["all", "كل الوقت"]];
export function rangeStart(r: Range): string | null {
  if (r === "all") return null;
  const d = new Date();
  if (r === "today") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - Number(r));
  return d.toISOString();
}

export function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {RANGES.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${value === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border"}`}>{l}</button>
      ))}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export function isFlagged(p: ProviderWithRefs) {
  const old = Date.now() - new Date(p.updated_at).getTime() > 365 * 86400000;
  return !p.phone?.trim() || !p.category_id || !p.area_id || !p.categories || !p.areas || old;
}
