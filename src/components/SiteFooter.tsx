import { Link } from "@tanstack/react-router";
import { ShieldCheck, Info, Shield, FileText } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card/40 pt-8 pb-10 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-bold text-xs sm:text-sm">
          <Link to="/" className="hover:text-foreground transition-colors">
            الرئيسية
          </Link>
          <span className="text-border hidden sm:inline">•</span>
          <Link to="/about" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Info className="size-3.5" /> من نحن
          </Link>
          <span className="text-border hidden sm:inline">•</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Shield className="size-3.5" /> سياسة الخصوصية
          </Link>
          <span className="text-border hidden sm:inline">•</span>
          <Link to="/terms" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <FileText className="size-3.5" /> شروط الاستخدام
          </Link>
          <span className="text-border hidden sm:inline">•</span>
          <Link to="/auth" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> دخول المسؤول
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          أهل الصنعة — دليل الحرفيين ومقدمي الخدمات. كل صنعة عند أهلها.
        </p>
      </div>
    </footer>
  );
}
