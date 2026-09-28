// Server-only. Persistent, atomic rate limit backed by the check_rate_limit DB function.
// Limits live in the rate_limit_policies table (default 5 requests / 10 minutes per IP + form_type).
export type RateLimitedForm = "report" | "service_suggestion" | "provider_application" | "review";

export function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Returns true when the request is allowed (and records it); false when over the limit or on error. */
export async function checkRateLimit(ip: string, formType: RateLimitedForm): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit" as never, { _ip: ip, _form_type: formType } as never);
    if (error) {
      console.error("[rate-limit.server] check_rate_limit error:", error);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error("[rate-limit.server] check_rate_limit exception:", e);
    return false;
  }
}

