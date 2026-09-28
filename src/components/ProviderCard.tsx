import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, BadgeCheck, Award, Zap, Building2 } from "lucide-react";
import { isPremiumActive, type PublicProvider as ProviderWithRefs } from "@/lib/directory";
import { ContactButtons } from "@/components/ContactButtons";
import { getProviderRatingSummary } from "@/lib/reviews.functions";
import { parseWorkingHours, getOpenStatus } from "@/lib/working-hours";

export function ProviderRatingBadge({ providerId }: { providerId: string }) {
  const { data } = useQuery({
    queryKey: ["rating-summary", providerId],
    queryFn: () => getProviderRatingSummary({ data: { providerId } }),
    staleTime: 60_000,
  });

  if (!data || data.count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-extrabold text-foreground" dir="ltr">
      <Star className="size-3.5 fill-amber-400 text-amber-400 inline" />
      <span>{data.average.toFixed(1)}</span>
      <span className="text-[11px] font-medium text-muted-foreground">({data.count})</span>
    </span>
  );
}

export function PremiumBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-premium/12 px-2.5 py-1 text-xs font-bold text-premium ring-1 ring-premium/30">
      <Star className="size-3.5 fill-current" /> مميز
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/30">
      <BadgeCheck className="size-3.5" /> موثّق
    </span>
  );
}

export function EmergencyBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40">
      <Zap className="size-3.5 fill-current text-amber-500" /> طوارئ 24H
    </span>
  );
}

export function ProviderCard({ provider }: { provider: ProviderWithRefs }) {
  const premium = isPremiumActive(provider);
  const hoursData = parseWorkingHours(provider.working_hours);
  const openStatus = hoursData ? getOpenStatus(hoursData) : null;

  return (
    <article className={`surface p-4 ${premium ? "ring-2 ring-premium/40" : ""}`}>
      <Link to="/provider/$id" params={{ id: provider.id }} className="block">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-extrabold text-foreground">{provider.name}</h3>
          <div className="flex flex-wrap justify-end gap-1">
            {hoursData?.isEmergency24h ? <EmergencyBadge /> : null}
            {provider.is_verified ? <VerifiedBadge /> : null}
            {premium ? <PremiumBadge /> : null}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-primary">{provider.categories?.name}</span>
            <span className="mx-1.5">·</span>
            <MapPin className="inline size-3.5 align-[-2px]" /> {provider.areas?.name}
          </p>
          <div className="flex items-center gap-1.5">
            {openStatus && openStatus.isOpen !== null && !hoursData?.isEmergency24h && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                  openStatus.isOpen
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    openStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"
                  }`}
                />
                {openStatus.isOpen ? "مفتوح" : "مغلق"}
              </span>
            )}
            <ProviderRatingBadge providerId={provider.id} />
          </div>
        </div>
        {hoursData?.workshop?.hasWorkshop ? (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="inline size-3.5 text-primary" />
            <span>ورشة: {hoursData.workshop.workshopName || "مقر عمل ثابت"}</span>
          </p>
        ) : null}
        {provider.experience_options ? (
          <p className="mt-1 text-sm text-muted-foreground">
            <Award className="inline size-3.5 align-[-2px]" /> خبرة: {provider.experience_options.label}
          </p>
        ) : null}
        {provider.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-foreground/75">{provider.description}</p>
        ) : null}
      </Link>

      <div className="mt-3">
        <ContactButtons
          providerId={provider.id}
          hasWhatsapp={provider.has_whatsapp}
          providerInfo={{
            name: provider.name,
            categoryName: provider.categories?.name,
            areaName: provider.areas?.name,
            isEmergency24h: hoursData?.isEmergency24h,
          }}
        />
      </div>
    </article>
  );
}
