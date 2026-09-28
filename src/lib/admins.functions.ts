import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72).optional().or(z.literal("")),
});

/** Owner-only: authorize an email as admin, and optionally create its login. */
export const addAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    // Owner check + insert + audit happen inside the database function.
    const { error } = await (context as any)?.supabase.rpc("admin_add" as never, { _email: data.email } as never);
    if (error) return { ok: false as const, code: error.message };
    if (data.password) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: e2 } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
      if (e2 && !/already|registered|exists/i.test(e2.message)) return { ok: true as const, warning: e2.message };
    }
    return { ok: true as const };
  });
