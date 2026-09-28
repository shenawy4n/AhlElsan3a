import { createStart, createMiddleware } from "@tanstack/react-start";
// Project-specific bearer middleware backed by the runtime-config Supabase
// client (replaces the generated attachSupabaseAuth, which depends on the
// generated client's build-time VITE_ variables).
import { supabase } from "@/lib/supabase-runtime";

const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
}));
