import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { track } from "@/lib/track";
import { ArrowRight, Search as SearchIcon, X, Loader2 } from "lucide-react";
import { areasQuery, categoriesQuery, providersQuery } from "@/lib/directory";
import { ProviderCard } from "@/components/ProviderCard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AvailabilityFilter, type AvailabilityFilterMode } from "@/components/AvailabilityFilter";
import { isProviderAvailableNow, isProviderEmergency24h } from "@/lib/working-hours";
import { useDebounce } from "@/hooks/useDebounce";
import { ZeroSearchResults } from "@/components/ZeroSearchResults";

type SearchParams = {
  q?: string | undefined;
  area?: string | undefined;
  filter?: AvailabilityFilterMode | undefined;
};

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    ...(typeof s['q'] === "string" && s['q'] ? { q: s['q'] } : {}),
    ...(typeof s['area'] === "string" && s['area'] ? { area: s['area'] } : {}),
    ...(s['filter'] === "available_now" || s['filter'] === "emergency_now" || s['filter'] === "all"
      ? { filter: s['filter'] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "نتائج البحث — أهل الصنعة" },
      { name: "description", content: "ابحث عن صنايعي أو خدمة في قريتك واتصل به مباشرة." },
      { property: "og:title", content: "نتائج البحث — أهل الصنعة" },
      { property: "og:description", content: "ابحث عن صنايعي أو خدمة في قريتك." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const [q, setQ] = useState(params.q ?? "");
  const [area, setArea] = useState(params.area ?? "");
  const [filterMode, setFilterMode] = useState<AvailabilityFilterMode>(params.filter || "all");

  // Debounce search query by 400ms to avoid network queries on every keystroke
  const debouncedQ = useDebounce(q, 400);

  useEffect(() => {
    const t = debouncedQ.trim();
    if (t.length < 2) return;
    const h = setTimeout(() => track("search", { query: t }), 1200);
    return () => clearTimeout(h);
  }, [debouncedQ]);

  const areas = useQuery(areasQuery);
  const categories = useQuery(categoriesQuery);
  const results = useQuery(providersQuery({ search: debouncedQ || undefined, areaId: area || undefined }));

  const isDebouncing = q !== debouncedQ;
  const isSearching = isDebouncing || results.isFetching;

  const counts = useMemo(() => {
    const list = results.data ?? [];
    return {
      all: list.length,
      availableNow: list.filter((p) => isProviderAvailableNow(p.working_hours)).length,
      emergencyNow: list.filter((p) => isProviderEmergency24h(p.working_hours)).length,
    };
  }, [results.data]);

  const filteredProviders = useMemo(() => {
    const list = results.data ?? [];
    if (filterMode === "available_now") {
      return list.filter((p) => isProviderAvailableNow(p.working_hours));
    }
    if (filterMode === "emergency_now") {
      return list.filter((p) => isProviderEmergency24h(p.working_hours));
    }
    return list;
  }, [results.data, filterMode]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pt-5">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <ArrowRight className="size-4" /> الرئيسية
        </Link>

        {/* Search Input with Debounce feedback and clear button */}
        <div className="surface mb-3 flex items-center gap-3 px-4 py-3.5">
          {isSearching ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
          ) : (
            <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
          )}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={60}
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            placeholder="ابحث باسم الصنايعي أو الخدمة"
            suppressHydrationWarning
          />
          {q.trim() && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="text-muted-foreground hover:text-foreground p-0.5"
              aria-label="مسح البحث"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Area Dropdown */}
        <div className="surface mb-4 px-4 py-2.5">
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full bg-transparent py-1 text-base outline-none"
            suppressHydrationWarning
          >
            <option value="">كل القرى والمناطق</option>
            {(areas.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Availability / Emergency Filters */}
        <div className="mb-5">
          <AvailabilityFilter
            currentMode={filterMode}
            onModeChange={setFilterMode}
            counts={counts}
          />
        </div>

        {results.isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
            <p className="text-sm font-bold">جاري البحث عن الصنايعية…</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <ZeroSearchResults
            query={debouncedQ}
            areaId={area}
            filterMode={filterMode}
            onClearArea={() => setArea("")}
            onClearFilter={() => setFilterMode("all")}
            onClearQuery={() => setQ("")}
            categories={categories.data ?? []}
            areas={areas.data ?? []}
          />
        ) : (
          <div className="space-y-3">
            {filteredProviders.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
