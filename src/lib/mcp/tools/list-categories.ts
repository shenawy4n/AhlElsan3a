import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForCaller } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List active craft/service categories and areas in the directory.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const sb = supabaseForCaller(ctx.getToken());
    const [c, a] = await Promise.all([
      sb.from("categories").select("id,name").eq("status", "active").order("sort_order"),
      sb.from("areas").select("id,name").eq("status", "active").order("name"),
    ]);
    if (c.error || a.error) return { content: [{ type: "text", text: (c.error ?? a.error)!.message }], isError: true };
    const categories = (c.data ?? []).map((r) => ({ id: String(r.id), name: String(r.name) }));
    const areas = (a.data ?? []).map((r) => ({ id: String(r.id), name: String(r.name) }));
    return { content: [{ type: "text", text: JSON.stringify({ categories, areas }) }], structuredContent: { categories, areas } };
  },
});
