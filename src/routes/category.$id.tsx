import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { track } from "@/lib/track";
import { ArrowRight, Search as SearchIcon, Loader2, X } from "lucide-react";
import { areasQuery, categoriesQuery, experienceQuery, providersQuery } from "@/lib/directory";
import { ProviderCard } from "@/components/ProviderCard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AvailabilityFilter, type AvailabilityFilterMode } from "@/components/AvailabilityFilter";
import { isProviderAvailableNow, isProviderEmergency24h } from "@/lib/working-hours";
import { useDebounce } from "@/hooks/useDebounce";
import { ZeroSearchResults } from "@/components/ZeroSearchResults";

export const Route = createFileRoute("/category/$id")({
  head: () => ({
    meta: [
      { title: "خدمة — أهل الصنعة" },
      { name: "description", content: "قائمة الصنايعية المتاحين في هذه الخدمة داخل قريتك." },
      { property: "og:title", content: "خدمة — أهل الصنعة" },
      { property: "og:description", content: "قائمة الصنايعية المتاحين في هذه الخدمة." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { id } = Route.useParams();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [exp, setExp] = useState("");
  const [filterMode, setFilterMode] = useState<AvailabilityFilterMode>("all");

  const debouncedQ = useDebounce(q, 400);

  const experience = useQuery(experienceQuery);
  useEffect(() => {
    track("category_view", { category_id: id });
  }, [id]);

  const categories = useQuery(categoriesQuery);
  const areas = useQuery(areasQuery);
  const results = useQuery(
    providersQuery({
      categoryId: id,
      search: debouncedQ || undefined,
      areaId: area || undefined,
      experienceId: exp || undefined,
    }),
  );
  const category = (categories.data ?? []).find((c) => c.id === id);

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
        <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <ArrowRight className="size-4" /> الرئيسية
        </Link>

        <h1 className="text-2xl font-extrabold">{category?.name ?? "الخدمة"}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {results.data ? `${filteredProviders.length} صنايعي معروض` : "جاري التحميل…"}
        </p>

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
            placeholder="ابحث داخل الخدمة"
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
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="surface px-4 py-2.5">
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-transparent py-1 text-base outline-none"
            >
              <option value="">كل القرى والمناطق</option>
              {(areas.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="surface px-4 py-2.5">
            <select value={exp} onChange={(e) => setExp(e.target.value)} className="w-full bg-transparent py-1 text-base outline-none">
              <option value="">أي خبرة</option>
              {(experience.data ?? []).map((x) => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
          </div>
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
