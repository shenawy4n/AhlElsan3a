import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SearchX, MapPin, Tag, Lightbulb, UserPlus, ArrowLeft, Check, Sparkles } from "lucide-react";
import { submitPublicForm, publicFormError } from "@/lib/public-forms.functions";
import type { Category, Area } from "@/lib/directory";
import type { AvailabilityFilterMode } from "@/components/AvailabilityFilter";

interface ZeroSearchResultsProps {
  query?: string;
  areaId?: string;
  filterMode?: AvailabilityFilterMode;
  onClearArea?: () => void;
  onClearFilter?: () => void;
  onClearQuery?: () => void;
  categories?: Category[];
  areas?: Area[];
}

export function ZeroSearchResults({
  query = "",
  areaId = "",
  filterMode = "all",
  onClearArea,
  onClearFilter,
  onClearQuery,
  categories = [],
  areas = [],
}: ZeroSearchResultsProps) {
  const [showSuggestService, setShowSuggestService] = useState(false);
  const [serviceName, setServiceName] = useState(query);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestHp, setSuggestHp] = useState("");
  const [suggestDone, setSuggestDone] = useState(false);

  const [showNominate, setShowNominate] = useState(false);
  const [nominateForm, setNominateForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    category_id: "",
    area_id: areaId || "",
  });
  const [nominateBusy, setNominateBusy] = useState(false);
  const [nominateHp, setNominateHp] = useState("");
  const [nominateDone, setNominateDone] = useState(false);

  async function handleSuggestService(e: React.FormEvent) {
    e.preventDefault();
    const val = (serviceName || query).trim();
    if (val.length < 2) {
      toast.error("يرجى كتابة اسم الخدمة المقترحة");
      return;
    }
    setSuggestBusy(true);
    try {
      const res = await submitPublicForm({
        data: {
          form: "service_suggestion",
          name: val.slice(0, 60),
          website: suggestHp,
        },
      });
      if (!res.ok) {
        toast.error(publicFormError(res.code));
      } else {
        toast.success("شكراً لك! استلمنا اقتراح الخدمة وسنعمل على إضافتها قريباً.");
        setSuggestDone(true);
      }
    } catch {
      toast.error("حدث خطأ أثناء إرسال الاقتراح، يرجى المحاولة لاحقاً");
    } finally {
      setSuggestBusy(false);
    }
  }

  async function handleNominateProvider(e: React.FormEvent) {
    e.preventDefault();
    if (!nominateForm.name.trim() || !nominateForm.phone.trim()) {
      toast.error("يرجى كتابة اسم وتليفون الصنايعي");
      return;
    }
    setNominateBusy(true);
    try {
      const res = await submitPublicForm({
        data: {
          form: "provider_application",
          website: nominateHp,
          name: nominateForm.name.trim(),
          phone: nominateForm.phone.trim(),
          whatsapp: nominateForm.whatsapp.trim() || undefined,
          category_id: nominateForm.category_id || undefined,
          area_id: nominateForm.area_id || undefined,
        },
      });
      if (!res.ok) {
        toast.error(publicFormError(res.code));
      } else {
        toast.success("شكراً لك! تم استلام ترشيح الصنايعي وسيتم مراجعته والتواصل معه.");
        setNominateDone(true);
      }
    } catch {
      toast.error("حدث خطأ أثناء إرسال الترشيح");
    } finally {
      setNominateBusy(false);
    }
  }

  return (
    <div className="surface grid gap-6 p-6 text-center">
      {/* Icon and Main Title */}
      <div className="mx-auto flex flex-col items-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-border">
          <SearchX className="size-7" />
        </div>
        <h3 className="mt-4 text-lg font-extrabold text-foreground">
          لا يوجد صنايعية مطابقون لبحثك
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {query.trim()
            ? `لم نعثر على صنايعية مسجلين باسم أو خدمة «${query.trim()}»`
            : "لم نتمكن من العثور على أي نتائج وفق الفلاتر المحددة"}
        </p>
      </div>

      {/* Action 1: If Availability or Emergency filter is active */}
      {filterMode !== "all" && onClearFilter && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 text-start">
          <p className="font-bold">
            💡 ملاحظة: فلتر ({filterMode === "available_now" ? "متاح الآن" : "طوارئ ٢٤ ساعة"}) مفعل.
          </p>
          <p className="mt-0.5 opacity-90">
            قد يكون هناك صنايعية مسجلون في هذه الخدمة ولكن مواعيد عملهم مغلقة حالياً.
          </p>
          <button
            type="button"
            onClick={onClearFilter}
            className="mt-2 inline-flex items-center gap-1 font-black text-primary underline"
          >
            إلغاء فلتر التواجد وعرض كل الصنايعية
          </button>
        </div>
      )}

      {/* Quick Suggestions Options */}
      <div className="grid gap-3 text-start">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          جرّب أحد الحلول التالية:
        </h4>

        <div className="grid gap-2.5">
          {/* Option A: Change Area */}
          {areaId && onClearArea && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary shrink-0" />
                <span className="font-bold text-foreground">جرّب منطقة أخرى أو ابحث في كل القرى:</span>
              </div>
              <button
                type="button"
                onClick={onClearArea}
                className="font-extrabold text-primary underline hover:text-primary/80"
              >
                البحث في كل المناطق
              </button>
            </div>
          )}

          {/* Option B: Try Another Category */}
          {categories.length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground mb-2">
                <Tag className="size-4 text-primary shrink-0" />
                <span>جرّب تصنيفاً آخر من الخدمات الأكثر طلباً:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 6).map((cat) => (
                  <Link
                    key={cat.id}
                    to="/category/$id"
                    params={{ id: cat.id }}
                    className="rounded-lg border border-border bg-secondary/70 px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-secondary hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Option C: Suggest a Service */}
          <div className="rounded-xl border border-border bg-card/60 p-3 text-xs">
            {!showSuggestService ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-amber-500 shrink-0" />
                  <span className="font-bold text-foreground">مش لاقي الخدمة اللي بتدور عليها؟</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuggestService(true)}
                  className="font-extrabold text-primary underline hover:text-primary/80"
                >
                  اقترح خدمة جديدة
                </button>
              </div>
            ) : suggestDone ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold py-1">
                <Check className="size-4" />
                <span>تم إرسال اقتراحك بنجاح! شكراً لمساعدتنا في تطوير الدليل.</span>
              </div>
            ) : (
              <form onSubmit={handleSuggestService} className="grid gap-2 pt-1">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Lightbulb className="size-4 text-amber-500" /> اقترح خدمة مش موجودة:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestService(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    إلغاء
                  </button>
                </div>
                <input
                  value={suggestHp}
                  onChange={(e) => setSuggestHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="مثال: تصليح غسالات، فني دش، فني ألوميتال..."
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                  maxLength={60}
                  required
                />
                <button
                  type="submit"
                  disabled={suggestBusy}
                  className="rounded-lg bg-primary py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
                >
                  {suggestBusy ? "جاري الإرسال..." : "إرسال الاقتراح"}
                </button>
              </form>
            )}
          </div>

          {/* Option D: Nominate a Provider */}
          <div className="rounded-xl border border-border bg-card/60 p-3 text-xs">
            {!showNominate ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="size-4 text-primary shrink-0" />
                  <span className="font-bold text-foreground">تعرف صنايعي شاطر في المنطقة دي؟</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNominate(true)}
                  className="font-extrabold text-primary underline hover:text-primary/80"
                >
                  اقترح صنايعياً جديداً
                </button>
              </div>
            ) : nominateDone ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold py-1">
                <Check className="size-4" />
                <span>تم إرسال ترشيح الصنايعي! سنقوم بمراجعته وإضافته للدليل.</span>
              </div>
            ) : (
              <form onSubmit={handleNominateProvider} className="grid gap-2 pt-1">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="size-4 text-primary" /> ترشيح صنايعي جديد:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNominate(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    إلغاء
                  </button>
                </div>
                <input
                  value={nominateHp}
                  onChange={(e) => setNominateHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <input
                  type="text"
                  value={nominateForm.name}
                  onChange={(e) => setNominateForm({ ...nominateForm, name: e.target.value })}
                  placeholder="اسم الصنايعي *"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                  maxLength={80}
                  required
                />
                <input
                  type="tel"
                  dir="ltr"
                  value={nominateForm.phone}
                  onChange={(e) => setNominateForm({ ...nominateForm, phone: e.target.value })}
                  placeholder="رقم التليفون *"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary text-end"
                  maxLength={30}
                  required
                />
                {categories.length > 0 && (
                  <select
                    value={nominateForm.category_id}
                    onChange={(e) => setNominateForm({ ...nominateForm, category_id: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none"
                  >
                    <option value="">اختار الصنعة / الخدمة</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                {areas.length > 0 && (
                  <select
                    value={nominateForm.area_id}
                    onChange={(e) => setNominateForm({ ...nominateForm, area_id: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none"
                  >
                    <option value="">اختار المنطقة / القرية</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="submit"
                  disabled={nominateBusy}
                  className="rounded-lg bg-primary py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
                >
                  {nominateBusy ? "جاري الإرسال..." : "إرسال ترشيح الصنايعي"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
