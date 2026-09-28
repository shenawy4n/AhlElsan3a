import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

const SELECT = "id,name,description,services,price_description,is_verified,is_premium, categories(name), areas(name)";

type Row = {
  id: string; name: string; description: string | null; services: string | null;
  price_description: string | null; is_verified: boolean; is_premium: boolean;
  categories: { name: string } | null; areas: { name: string } | null;
};

export default defineTool({
  name: "search_providers",
  title: "Search craftsmen",
  description: "Search active craftsmen/service providers by text, category or area (no phone numbers).",
  inputSchema: {
    query: z.string().max(100).optional().describe("Text to match in name, description or services."),
    category_id: z.string().uuid().optional(),
    area_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category_id, area_id, limit }) => {
    let q = supabaseAnon().from("providers").select(SELECT).eq("status", "active");
    if (category_id) q = q.eq("category_id", category_id);
    if (area_id) q = q.eq("area_id", area_id);
    const s = query?.replace(/[%,()_\\*]/g, "").trim();
    if (s) q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,services.ilike.%${s}%`);
    const { data, error } = await q.order("is_premium", { ascending: false }).limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const providers = ((data ?? []) as unknown as Row[]).map((p) => ({
      id: p.id, name: p.name, category: p.categories?.name ?? null, area: p.areas?.name ?? null,
      description: p.description, services: p.services, price: p.price_description,
      verified: p.is_verified, featured: p.is_premium,
    }));
    return { content: [{ type: "text", text: JSON.stringify(providers) }], structuredContent: { providers } };
  },
});
