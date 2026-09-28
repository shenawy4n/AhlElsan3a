import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  status: string;
};

export type Area = {
  id: string;
  name: string;
  status: string;
};

export type Provider = {
  id: string;
  name: string;
  category_id: string;
  area_id: string;
  phone: string;
  secondary_phone: string | null;
  whatsapp: string | null;
  description: string | null;
  services: string | null;
  price_description: string | null;
  working_hours: string | null;
  photo_url: string | null;
  status: string;
  is_premium: boolean;
  premium_expires_at: string | null;
  experience_id: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type ProviderWithRefs = Provider & {
  has_whatsapp?: boolean;
  categories: { id: string; name: string } | null;
  areas: { id: string; name: string } | null;
  experience_options: { id: string; label: string } | null;
};

/** What the public sees — no phone numbers. */
export type PublicProvider = Omit<ProviderWithRefs, "phone" | "secondary_phone" | "whatsapp" | "has_whatsapp"> & { has_whatsapp: boolean };

export type ExperienceOption = { id: string; label: string; sort_order: number; status: string };

/** Admin only (includes phone numbers). */
export const PROVIDER_SELECT = "*, categories(id,name), areas(id,name), experience_options(id,label)";
export const PUBLIC_PROVIDER_SELECT =
  "id,name,category_id,area_id,description,services,price_description,working_hours,photo_url,status,is_premium,premium_expires_at,experience_id,is_verified,has_whatsapp,created_at,updated_at, categories(id,name), areas(id,name), experience_options(id,label)";

export function isPremiumActive(p: Pick<Provider, "is_premium" | "premium_expires_at">) {
  if (!p.is_premium) return false;
  if (!p.premium_expires_at) return true;
  return new Date(p.premium_expires_at).getTime() > Date.now();
}

export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,icon,sort_order,status")
      .eq("status", "active")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
};

export const areasQuery = {
  queryKey: ["areas"],
  queryFn: async (): Promise<Area[]> => {
    const { data, error } = await supabase
      .from("areas")
      .select("id,name,status")
      .eq("status", "active")
      .order("name");
    if (error) throw error;
    return (data ?? []) as Area[];
  },
};

export function providersQuery(opts: {
  categoryId?: string | undefined;
  areaId?: string | undefined;
  experienceId?: string | undefined;
  search?: string | undefined;
  premiumOnly?: boolean | undefined;
  limit?: number | undefined;
  includeHidden?: boolean | undefined;
}) {
  return {
    queryKey: ["providers", opts],
    queryFn: async (): Promise<PublicProvider[]> => {
      let q = supabase.from("providers").select(PUBLIC_PROVIDER_SELECT).eq("status", "active");
      if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
      if (opts.areaId) q = q.eq("area_id", opts.areaId);
      if (opts.experienceId) q = q.eq("experience_id", opts.experienceId);
      if (opts.premiumOnly) q = q.eq("is_premium", true);
      if (opts.search && opts.search.trim()) {
        const s = arabicPattern(opts.search);
        const [cats, ars] = await Promise.all([
          supabase.from("categories").select("id").ilike("name", `%${s}%`),
          supabase.from("areas").select("id").ilike("name", `%${s}%`),
        ]);
        const parts = [`name.ilike.%${s}%`, `description.ilike.%${s}%`, `services.ilike.%${s}%`];
        const cIds = (cats.data ?? []).map((c) => c.id);
        const aIds = (ars.data ?? []).map((a) => a.id);
        if (cIds.length) parts.push(`category_id.in.(${cIds.join(",")})`);
        if (aIds.length) parts.push(`area_id.in.(${aIds.join(",")})`);
        q = q.or(parts.join(","));
      }
      q = q.order("is_premium", { ascending: false }).order("created_at", { ascending: false });
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PublicProvider[];
    },
  };
}

export const experienceQuery = {
  queryKey: ["experience"],
  queryFn: async (): Promise<ExperienceOption[]> => {
    const { data, error } = await supabase
      .from("experience_options")
      .select("id,label,sort_order,status")
      .eq("status", "active")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as ExperienceOption[];
  },
};

export type AppSettings = Record<string, string | null>;
export const settingsQuery = {
  queryKey: ["settings"],
  queryFn: async (): Promise<AppSettings> => {
    const { data } = await supabase.from("app_settings").select("key,value");
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  },
};

export function providerQuery(id: string) {
  return {
    queryKey: ["provider", id],
    queryFn: async (): Promise<PublicProvider | null> => {
      const { data, error } = await supabase
        .from("providers")
        .select(PUBLIC_PROVIDER_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PublicProvider | null;
    },
  };
}

/** Lightweight Arabic-tolerant LIKE pattern: كهربا → كهرب (matches كهربائي), أ/ا/إ, ة/ه, ى/ي interchangeable. */
export function arabicPattern(raw: string) {
  let s = raw.trim().replace(/[%,()_\\*]/g, "").replace(/[\u064B-\u0652\u0640]/g, "").replace(/\s+/g, " ");
  if (s.startsWith("ال") && s.length > 4) s = s.slice(2);
  while (s.length > 3 && /[اأإآةهىيئء]$/.test(s)) s = s.slice(0, -1);
  return s.replace(/[اأإآ]/g, "_").replace(/[ةه]/g, "_").replace(/[ىي]/g, "_");
}

/** Normalizes Egyptian numbers to +20XXXXXXXXXX; returns null if invalid. */
export function normalizeEgPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let n = phone.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^\d]/g, "");
  if (n.startsWith("0020")) n = n.slice(4);
  else if (n.startsWith("20") && n.length === 12) n = n.slice(2);
  if (n.startsWith("0")) n = n.slice(1);
  if (/^1[0125]\d{8}$/.test(n)) return `+20${n}`; // mobile
  if (/^\d{8,9}$/.test(n)) return `+20${n}`; // landline with area code
  return null;
}

export function telHref(phone: string) {
  const n = normalizeEgPhone(phone);
  return n ? `tel:${n}` : null;
}

export function whatsappHref(phone: string) {
  let n = phone.replace(/[^\d]/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("0")) n = "20" + n.slice(1);
  return `https://wa.me/${n}`;
}
