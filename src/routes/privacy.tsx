import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Shield, Eye, Phone, Star, UserPlus, Database, MessageSquareWarning } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — أهل الصنعة" },
      { name: "description", content: "تعرف على سياسة الخصوصية وحماية البيانات في منصة أهل الصنعة وكيفية التعامل مع أرقام الهواتف والتقييمات." },
      { property: "og:title", content: "سياسة الخصوصية — أهل الصنعة" },
      { property: "og:description", content: "شفافية كاملة حول جمع واستخدام البيانات في منصة أهل الصنعة." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <section className="space-y-6">
            <div className="border-b border-border pb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
                <Shield className="size-3.5" /> الخصوصية وحماية البيانات
              </span>
              <h1 className="text-2xl font-extrabold sm:text-3xl text-foreground">
                سياسة الخصوصية
              </h1>
              <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                نلتزم في منصة «أهل الصنعة» بالشفافية الكاملة وحماية خصوصية الزوار ومقدمي الخدمات. توضح هذه السياسة طبيعة البيانات المجمعة وكيفية استخدامها بدقة طبقاً للوظائف الفعلية للمنصة.
              </p>
            </div>

            {/* 1. البيانات التي يتم جمعها */}
            <div className="surface p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Database className="size-5 text-primary" />
                1. البيانات التي يتم جمعها
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>نجمع فقط البيانات الضرورية لتشغيل الدليل وتسهيل الخدمة:</p>
                <ul className="list-disc list-inside space-y-2 pr-2 text-xs sm:text-sm">
                  <li>
                    <strong className="text-foreground">بيانات التفاعل والإحصائيات (Analytics):</strong> يتم تسجيل ضغطات الاتصال وضغطات تطبيق واتساب وزيارات ملفات الصنايعية وكلمات البحث لحساب مدى التفاعل وترتيب الخدمات الأكثر طلباً. هذه العمليات لا تتضمن أي تتبع خارجي أو مشاركة مع شبكات إعلانية.
                  </li>
                  <li>
                    <strong className="text-foreground">التقييمات والمراجعات (Reviews):</strong> عند كتابة تقييم لصنايعي، نجمع (الاسم، نص التقييم، التقييم بالنجوم، ورقم هاتف المستخدم للتأكد من جدية التجربة ولمنع المراجعات الوهمية والمكررة).
                  </li>
                  <li>
                    <strong className="text-foreground">طلبات ترشيح وإضافة الصنايعية (Applications):</strong> نجمع (اسم الصنايعي، رقم هاتفه، رقم الواتساب، التخصص المهني، والقرية أو المنطقة التابع لها) لمراجعة الطلب واعتماده في الدليل.
                  </li>
                  <li>
                    <strong className="text-foreground">بلاغات المشاكل واقتراح الخدمات:</strong> عند إرسال بلاغ عن رقم غير صحيح أو اقتراح صنعة جديدة، يتم جمع تفاصيل البلاغ لتحسين بيانات الدليل.
                  </li>
                </ul>
              </div>
            </div>

            {/* 2. استخدام رقم الهاتف وحمايته */}
            <div className="surface p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Phone className="size-5 text-primary" />
                2. استخدام رقم الهاتف وحمايته
              </h2>
              <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p>
                  نولي خصوصية أرقام الهواتف أهمية قصوى:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-2 text-xs sm:text-sm">
                  <li>
                    <strong className="text-foreground">أرقام هواتف الصنايعية:</strong> لا يتم كشفها في استعلامات الواجهة العامة المفتوحة (Public Queries) حمايةً للصنايعية من برمجيات جمع الأرقام والكشط الآلي (Web Scraping). يتم توجيه الاتصال أو محادثة الواتساب عبر استدعاءات برمجية مؤمنة على السيرفر فقط عند نقر المستخدم على زر «اتصال» أو «WhatsApp».
                  </li>
                  <li>
                    <strong className="text-foreground">أرقام هواتف المقيّمين:</strong> رقم الهاتف المدخل عند كتابة تقييم يُستخدم فقط لأغراض المراجعة والتحقق الداخلي من قِبل إدارة المنصة، ولا يظهر علناً في صفحة الصنايعي ولا يتاح لبقية الزوار.
                  </li>
                </ul>
              </div>
            </div>

            {/* 3. التخزين المحلي وملفات تعريف الارتباط */}
            <div className="surface p-5 space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Eye className="size-5 text-primary" />
                3. التخزين المحلي (Local Storage & Cookies)
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                تعتمد المنصة على التخزين المحلي والـ Session في المتصفح فقط للوظائف التقنية الضرورية، مثل:
              </p>
              <ul className="list-disc list-inside space-y-1 pr-2 text-xs sm:text-sm text-muted-foreground">
                <li>حفظ جلسة تسجيل دخول المسؤولين المصرح لهم (Admin Auth Session).</li>
                <li>تحديد ما إذا كان الزائر قد قيّم صنايعي معين مؤخراً لتفادي إزعاج الزائر بتكرار النماذج.</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                لا نستخدم ملفات تعريف ارتباط خاصة بالإعلانات أو التعقب التسويقي لجهات خارجية.
              </p>
            </div>

            {/* 4. آلية حذف البيانات والتواصل */}
            <div className="surface p-5 space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquareWarning className="size-5 text-primary" />
                4. آلية تعديل أو حذف البيانات والتواصل
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                يحق لأي حرفي أو صاحب مهنة مسجل في الدليل طلب تحديث بياناته أو حذف ملفه بشكل كامل من المنصة في أي وقت. يمكنك إجراء ذلك بسهولة من خلال:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pr-2 text-xs sm:text-sm text-muted-foreground">
                <li>الضغط على خيار <strong className="text-foreground">«الإبلاغ عن مشكلة»</strong> الموجود أسفل صفحة الصنايعي في المنصة واختيار سبب الطلب.</li>
                <li>مراجعة إدارة المنصة لطلب حذف السجل أو تعديل رقم الهاتف فوراً.</li>
              </ul>
            </div>
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
