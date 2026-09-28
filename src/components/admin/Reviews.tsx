import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Star, CheckCircle, XCircle, Trash2, Search, AlertCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { adminListReviews, adminModerateReview } from "@/lib/reviews.functions";
import type { ReviewRecord } from "@/lib/reviews.server";
import { useAll, btn, btnGhost, input } from "./shared";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export function AdminReviews() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { providers } = useAll();
  const provMap = useMemo(() => {
    return new Map((providers.data ?? []).map((p) => [p.id, p.name]));
  }, [providers.data]);

  const { data: reviews = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const res = await adminListReviews({ data: { status: "all" } });
      return res as ReviewRecord[];
    },
  });

  const counts = useMemo(() => {
    return {
      all: reviews.length,
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
    };
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const pName = (provMap.get(r.provider_id) || "").toLowerCase();
        const rName = (r.reviewer_name || "").toLowerCase();
        const comment = (r.comment || "").toLowerCase();
        return pName.includes(q) || rName.includes(q) || comment.includes(q);
      }
      return true;
    });
  }, [reviews, filter, search, provMap]);

  async function handleModerate(reviewId: string, action: "approve" | "reject" | "delete") {
    if (action === "delete") {
      if (!window.confirm("هل أنت متأكد من حذف هذا التقييم نهائياً؟")) return;
    }
    setBusyId(reviewId);
    try {
      const res = await adminModerateReview({
        data: { reviewId, action },
      });
      if (res.ok) {
        toast.success(
          action === "approve"
            ? "تم اعتماد ونشر التقييم بنجاح"
            : action === "reject"
            ? "تم رفض التقييم"
            : "تم حذف التقييم"
        );
        await refetch();
        qc.invalidateQueries({ queryKey: ["reviews"] });
        qc.invalidateQueries({ queryKey: ["rating-summary"] });
        qc.invalidateQueries({ queryKey: ["all-ratings-summaries"] });
      } else {
        toast.error("حدث خطأ أثناء تنفيذ الإجراء");
      }
    } catch (e) {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setBusyId(null);
    }
  }

  const FILTERS: [StatusFilter, string, number][] = [
    ["pending", "قيد المراجعة", counts.pending],
    ["approved", "معتمدة", counts.approved],
    ["rejected", "مرفوضة", counts.rejected],
    ["all", "كل التقييمات", counts.all],
  ];

  return (
    <div className="grid gap-4">
      {/* Header and Filter pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([f, label, count]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground ring-1 ring-border hover:bg-secondary"
              }`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-xs ${
                  filter === f
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : f === "pending" && count > 0
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالصنايعي أو التعليق..."
            className={`${input} pr-9 text-sm`}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-muted-foreground">جاري تحميل التقييمات...</p>
      ) : filtered.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <MessageSquare className="size-10 stroke-1 mb-2 opacity-50" />
          <p className="font-bold">لا توجد تقييمات في هذا القسم</p>
          <p className="text-xs mt-1">التقييمات الجديدة ستظهر هنا للمراجعة والاعتماد.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const pName = provMap.get(r.provider_id) || "صنايعي غير معروف";
            const isBusy = busyId === r.id;

            return (
              <div
                key={r.id}
                className={`surface grid gap-3 p-4 transition-all ${
                  r.status === "pending"
                    ? "border-r-4 border-r-amber-500"
                    : r.status === "approved"
                    ? "border-r-4 border-r-emerald-500"
                    : "border-r-4 border-r-destructive opacity-80"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-foreground">{pName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.status === "pending"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : r.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {r.status === "pending"
                          ? "قيد المراجعة"
                          : r.status === "approved"
                          ? "معتمد"
                          : "مرفوض"}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">
                        {r.reviewer_name || "عميل مجهول"}
                      </span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleDateString("ar-EG")}</span>
                      <span>{new Date(r.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1">
                    <span className="font-bold text-sm text-foreground">{r.rating}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`size-3.5 ${
                            star <= r.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment Text */}
                <div className="rounded-lg bg-card/60 p-3 text-sm text-foreground border border-border/50">
                  <p className="whitespace-pre-line leading-relaxed">{r.comment}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "approved" && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleModerate(r.id, "approve")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle className="size-3.5" /> اعتماد ونشر
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleModerate(r.id, "reject")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <XCircle className="size-3.5" /> رفض
                      </button>
                    )}
                  </div>

                  <button
                    disabled={isBusy}
                    onClick={() => handleModerate(r.id, "delete")}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" /> حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
