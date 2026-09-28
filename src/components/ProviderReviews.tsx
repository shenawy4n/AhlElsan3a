import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquarePlus, CheckCircle2, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getProviderReviews, getProviderRatingSummary } from "@/lib/reviews.functions";
import { submitPublicForm, publicFormError } from "@/lib/public-forms.functions";

interface ProviderReviewsProps {
  providerId: string;
  providerName: string;
}

export function ProviderReviews({ providerId, providerName }: ProviderReviewsProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // 1. Fetch approved reviews only
  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ["reviews", providerId],
    queryFn: async () => {
      const res = await getProviderReviews({ data: { providerId } });
      return res;
    },
  });

  // 2. Fetch approved rating summary (average & count)
  const { data: summary = { average: 0, count: 0 }, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["rating-summary", providerId],
    queryFn: async () => {
      const res = await getProviderRatingSummary({ data: { providerId } });
      return res;
    },
  });

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error("يرجى اختيار تقييم بين ١ و ٥ نجوم");
      return;
    }
    if (comment.trim().length < 3) {
      toast.error("يرجى كتابة تعليق لا يقل عن ٣ أحرف");
      return;
    }

    setBusy(true);
    try {
      const res = await submitPublicForm({
        data: {
          form: "review",
          provider_id: providerId,
          rating,
          comment: comment.trim(),
          reviewer_name: reviewerName.trim() || undefined,
          website: hp,
        },
      });

      if (!res.ok) {
        toast.error(publicFormError(res.code));
        return;
      }

      setSubmittedSuccess(true);
      setShowForm(false);
      setComment("");
      setReviewerName("");
      setRating(5);
      toast.success("شكراً لمشاركتك! تم إرسال تقييمك وسيظهر بعد المراجعة والاعتماد.");
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    } catch (err) {
      toast.error("حدث خطأ أثناء إرسال التقييم، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  const activeRating = hoverRating || rating;

  return (
    <section className="surface mt-5 overflow-hidden p-5">
      {/* Header and Rating Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">التقييمات وآراء العملاء</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            تجارب حقيقية معتمد عليها من أهالي القرية
          </p>
        </div>

        {summary.count > 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 px-4 py-2">
            <div className="text-end">
              <div className="flex items-center gap-1 font-black text-2xl text-foreground" dir="ltr">
                <span>{summary.average.toFixed(1)}</span>
                <Star className="size-6 fill-amber-400 text-amber-400 inline" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                {summary.count} {summary.count === 1 ? "تقييم" : summary.count === 2 ? "تقييمين" : summary.count <= 10 ? "تقييمات" : "تقييم"}
              </p>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1.5 text-xs font-bold text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> لا توجد تقييمات معتمدة بعد
          </div>
        )}
      </div>

      {/* Success notification if just submitted */}
      {submittedSuccess && (
        <div className="my-4 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-extrabold">تم استلام تقييمك بنجاح!</p>
            <p className="text-xs opacity-90 mt-0.5">
              سيظهر التقييم هنا فور مراجعته واعتماده من إدارة التطبيق لضمان المصداقية.
            </p>
          </div>
        </div>
      )}

      {/* Add Review Action / Form */}
      <div className="mt-4">
        {!showForm ? (
          <button
            onClick={() => {
              setShowForm(true);
              setSubmittedSuccess(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-3 font-extrabold text-primary hover:bg-primary/15 transition-colors"
          >
            <MessageSquarePlus className="size-5" /> أضف تقييمك عن {providerName}
          </button>
        ) : (
          <form
            onSubmit={handleSubmitReview}
            className="grid gap-3.5 rounded-xl border border-border bg-card/60 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-foreground">
                تقييمك للصنايعي {providerName}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                إلغاء
              </button>
            </div>

            {/* Honeypot hidden input for bot protection */}
            <input
              type="text"
              name="website"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {/* Star selector */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                درجة التقييم (من ١ إلى ٥ نجوم)
              </label>
              <div className="flex items-center gap-2" dir="ltr">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                      aria-label={`${star} من 5`}
                    >
                      <Star
                        className={`size-7 transition-colors ${
                          star <= activeRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground pr-2" dir="rtl">
                  {activeRating === 5
                    ? "ممتاز جدًا"
                    : activeRating === 4
                    ? "جيد جدًا"
                    : activeRating === 3
                    ? "متوسط"
                    : activeRating === 2
                    ? "ضعيف"
                    : "سيء"}
                </span>
              </div>
            </div>

            {/* Review comment */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                رأيك وتجربتك <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="احكي عن جودة الشغل، الأمانة، الالتزام بالمواعيد، والأسعار..."
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                <span>الحد الأدنى ٣ أحرف</span>
                <span>{comment.length} / 500</span>
              </div>
            </div>

            {/* Reviewer name (optional) */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                اسمك (اختياري)
              </label>
              <input
                type="text"
                maxLength={50}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="مثال: أحمد عبد الله (أو اتركه فارغاً لنشر الرأي كعميل)"
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              ⚠️ حفاظاً على المصداقية، لا يتم نشر التقييمات إلا بعد مراجعتها والتأكد من مطابقتها لمعايير المنصة.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60 hover:brightness-105 transition-all"
              >
                {busy ? "جاري الإرسال..." : "إرسال التقييم"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-border py-3 font-bold text-foreground hover:bg-secondary transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Approved Reviews List */}
      <div className="mt-6 border-t border-border pt-4">
        <h3 className="text-sm font-bold text-muted-foreground mb-3">
          الآراء المعتمدة ({reviews.length})
        </h3>

        {isLoadingReviews ? (
          <p className="py-4 text-center text-xs text-muted-foreground">جاري تحميل الآراء...</p>
        ) : reviews.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <p className="text-sm">كن أول من يكتب تقييماً عن {providerName}!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-border bg-card/40 p-4 transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                      <User className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-foreground">
                        {rev.reviewer_name || "عميل"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Star icons */}
                  <div className="flex items-center gap-0.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-4 ${
                          star <= rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="whitespace-pre-line text-sm text-foreground/90 leading-relaxed pr-10">
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
