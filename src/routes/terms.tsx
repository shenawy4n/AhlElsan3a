import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — أهل الصنعة" },
      { name: "description", content: "شروط وأحكام استخدام منصة أهل الصنعة للحرفيين والباحثين عن الخدمات." },
      { property: "og:title", content: "شروط الاستخدام — أهل الصنعة" },
      { property: "og:description", content: "شروط وضوابط استخدام دليل وخدمات أهل الصنعة." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <section className="space-y-6">
            <div className="border-b border-border pb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
                <FileText className="size-3.5" /> الضوابط والأحكام
              </span>
              <h1 className="text-2xl font-extrabold sm:text-3xl text-foreground">
                شروط الاستخدام
              </h1>
              <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                باستخدامك لمنصة «أهل الصنعة»، فإنك توافق على الالتزام بالشروط والضوابط الموضحة أدناه والتي تنظم استخدام الدليل والتواصل مع مقدمي الخدمات.
              </p>
            </div>

            <div className="surface p-5 space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" />
                1. الغرض من الخدمة
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                منصة «أهل الصنعة» هي دليل إلكتروني يهدف لتيسير التواصل بين أصحاب المهن الحرفية والخدمية وبين الراغبين في الاستفادة من خدماتهم داخل النطاق الجغرافي المحدد. المنصة وسيط إعلامي ومعلوماتي فقط ولا تتدخل في إدارة الأعمال أو تسعير الخدمات.
              </p>
            </div>

            <div className="surface p-5 space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" />
                2. التزامات مقدمي الخدمات
              </h2>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed pr-2">
                <li>تقديم بيانات صحيحة ومحدثة بخصوص أرقام الهواتف ومجال العمل والنطاق الجغرافي.</li>
                <li>احترام مواعيد وأصول العمل والتعامل بأمانة ومهنية مع العملاء.</li>
                <li>إخطار إدارة المنصة في حال الرغبة في التوقف عن العمل أو تعديل وسائل التواصل.</li>
              </ul>
            </div>

            <div className="surface p-5 space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" />
                3. ضوابط التقييمات والمراجعات
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                يُشترط في التقييمات أن تعبر عن تجارب حقيقية تمت بالفعل. يحظر استخدام ألفاظ مسيئة أو نشر مراجعات كيدية أو مضللة، وتحتفظ إدارة المنصة بحق فحص أو حذف أي تقييم يثبت عدم صحته.
              </p>
            </div>

            <div className="surface p-5 space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle className="size-5 text-primary" />
                4. إخلاء المسؤولية
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                لا تتحمل المنصة أي مسؤولية مالية أو قانونية عن الخلافات التي قد تنشأ بين طالب الخدمة ومقدمها حول الأسعار أو جودة التنفيذ، حيث إن كل اتفاق يتم خارج المنصة وبشكل مستقل تماماً بين الطرفين.
              </p>
            </div>
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
