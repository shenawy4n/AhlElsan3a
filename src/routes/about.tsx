import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Wrench, Users, PhoneCall, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — أهل الصنعة" },
      { name: "description", content: "تعرف على منصة أهل الصنعة — دليل مجتمعي لمساعدة المستخدمين على الوصول إلى الحرفيين ومقدمي الخدمات." },
      { property: "og:title", content: "من نحن — أهل الصنعة" },
      { property: "og:description", content: "دليل محلي يساعد أهالي المنطقة على الوصول السريع إلى الحرفيين ومقدمي الخدمات." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <section className="space-y-6">
            <div className="border-b border-border pb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
                <Wrench className="size-3.5" /> عن المنصة
              </span>
              <h1 className="text-2xl font-extrabold sm:text-3xl text-foreground">
                من نحن — منصة أهل الصنعة
              </h1>
              <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                «أهل الصنعة» هي دليل ومنصة خدمية محلية تهدف إلى مساعدة أهالي المنطقة والمستخدمين في الوصول المباشر إلى مقدمي الخدمات والحرفيين وأصحاب المهن الحرة بكل سهولة وسرعة.
              </p>
            </div>

            <div className="surface p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="size-5 text-primary" />
                طبيعة المنصة ودورها
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                تعمل منصة أهل الصنعة كـ <strong className="text-foreground">دليل استرشادي ووسيط تقني</strong> يربط بين الباحث عن الخدمة وبين الحرفي أو الفني الموجود في المنطقة. نهدف إلى تنظيم أرقام وبيانات التواصل وإتاحتها مجاناً لتوفير الوقت والجهد في حالات الطوارئ المنزلية وأعمال الصيانة اليومية.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="surface p-5 space-y-2">
                <h3 className="font-bold flex items-center gap-2 text-base">
                  <PhoneCall className="size-4 text-primary" />
                  تواصل مباشر دون وسطاء
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يتم التواصل بينك وبين الحرفي مباشرة عبر الاتصال الهاتفي أو تطبيق واتساب، دون أي عمولات على الاتصال أو وساطة في الاتفاق.
                </p>
              </div>

              <div className="surface p-5 space-y-2">
                <h3 className="font-bold flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-primary" />
                  مشاركة وتدقيق مجتمعي
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  تعتمد المنصة على التقييمات الواقعية ومشاركات أهالي المنطقة مع مراجعة إدارة الدليل للبيانات لتحديث الأرقام وحذف غير الملتزمين.
                </p>
              </div>
            </div>

            <div className="surface border border-border/80 bg-card p-5 space-y-3">
              <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                حدود المسؤولية والتوضيح القانوني
              </h2>
              <ul className="list-disc list-inside space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>
                  <strong className="text-foreground">طبيعة استرشادية:</strong> المنصة تقدم بيانات التواصل كما تم توفيرها من الحرفيين أو من ترشيحات الأهالي بعد التحقق الأساسي.
                </li>
                <li>
                  <strong className="text-foreground">المعاملات المالية والعملية:</strong> المنصة لا تقدم أي كفالات أو ضمانات تجارية أو تعاقدية لنتائج أعمال الحرفيين، وتظل شروط الاتفاق وتكاليف الخدمة مسؤولية مباشرة ومتبادلة بين طالب الخدمة ومقدمها.
                </li>
                <li>
                  <strong className="text-foreground">تحديث مستمر:</strong> نتيح خيار الإبلاغ عن أي رقم غير صحيح أو معاملة غير لائقة لاتخاذ الإجراء المناسب في الدليل فوراً.
                </li>
              </ul>
            </div>
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
