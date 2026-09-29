import { supabase } from "@/integrations/supabase/client";
import { telHref, whatsappHref, normalizeEgPhone } from "@/lib/directory";

export type ContactKind = "phone_click" | "whatsapp_click" | "phone_reveal";
type Numbers = { phone: string | null; secondary_phone: string | null; whatsapp: string | null };

export class NoNumberError extends Error {}

const last = new Map<string, number>();
const cache = new Map<string, Numbers>();

/**
 * Logs the event server-side (awaited, so it is saved before navigation) and returns the number.
 * Rapid repeat taps within 3s reuse the cached number without logging a duplicate event.
 */
async function contact(providerId: string, kind: ContactKind): Promise<Numbers | null> {
  const key = `${providerId}:${kind}`;
  const now = Date.now();
  if (now - (last.get(key) ?? 0) < 3000 && cache.has(key)) return cache.get(key)!;
  last.set(key, now);
  const { data, error } = await supabase.rpc("contact_provider" as never, { _provider_id: providerId, _kind: kind } as never);
  if (error) { last.delete(key); throw error; }
  const row = (data as unknown as Numbers[] | null)?.[0] ?? null;
  if (row) cache.set(key, row);
  return row;
}

/** Opens tel:/wa.me via a real anchor click; target _top escapes embedded previews. */
function open(href: string, newTab = false) {
  const a = document.createElement("a");
  a.href = href;
  a.target = newTab ? "_blank" : "_top";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function callProvider(providerId: string) {
  const r = await contact(providerId, "phone_click");
  const href = telHref(r?.phone ?? "") ?? telHref(r?.secondary_phone ?? "");
  if (!href) throw new NoNumberError();
  open(href);
}

export async function whatsappProvider(providerId: string) {
  const r = await contact(providerId, "whatsapp_click");
  if (!r?.whatsapp) throw new NoNumberError();
  open(whatsappHref(r.whatsapp), true);
}

export async function revealProvider(providerId: string) {
  const r = await contact(providerId, "phone_reveal");
  if (!r?.phone) throw new NoNumberError();
  return r;
}

export async function shareProviderViaWhatsapp(provider: {
  id: string;
  name: string;
  categoryName?: string | null | undefined;
  areaName?: string | null | undefined;
  isEmergency24h?: boolean | undefined;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const profileUrl = `${origin}/provider/${provider.id}`;

  const lines = [
    `صنايعي موثوق من «أهل الصنعة» 🛠️`,
    ``,
    `👤 الاسم: ${provider.name}`,
    provider.categoryName ? `🏷️ الصنعة: ${provider.categoryName}` : null,
    provider.areaName ? `📍 المنطقة: ${provider.areaName}` : null,
    provider.isEmergency24h ? `⚡ متاح طوارئ ٢٤ ساعة: نعم` : null,
    ``,
    `🔗 تواصل مع الصنايعي واطلب الخدمة عبر الرابط:`,
    profileUrl,
    ``,
    `أهل الصنعة — كل صنعة عند أهلها`,
  ].filter(Boolean);

  const text = lines.join("\n");
  open(`https://wa.me/?text=${encodeURIComponent(text)}`, true);
}

