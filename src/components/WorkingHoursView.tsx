import { useState } from "react";
import { Clock, AlertCircle, Building2, ChevronDown, ChevronUp, MapPin, Check, Moon, Zap } from "lucide-react";
import {
  parseWorkingHours,
  getOpenStatus,
  formatTime12h,
  isOvernight,
  getCairoNow,
  generateScheduleSummary,
  type StructuredWorkingHours,
} from "@/lib/working-hours.ts";

interface WorkingHoursViewProps {
  workingHoursRaw: string | null | undefined;
}

export function WorkingHoursView({ workingHoursRaw }: WorkingHoursViewProps) {
  const [expanded, setExpanded] = useState(false);

  const hours = parseWorkingHours(workingHoursRaw);
  if (!hours) return null;

  const status = getOpenStatus(hours);
  const { dayKey: currentDayKey } = getCairoNow();
  const summaryText = generateScheduleSummary(hours);

  return (
    <div className="border-t border-border py-4">
      {/* Top Header: Icon, Label, and Status Pill */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground">مواعيد وساعات العمل</p>
            <p className="text-base font-extrabold text-foreground">{summaryText}</p>
          </div>
        </div>

        {/* Real-time Status Badge */}
        {status.badgeType === "emergency" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30">
            <Zap className="size-3.5 fill-current" /> متاح طوارئ ٢٤ ساعة
          </span>
        ) : status.isOpen === true ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            مفتوح الآن
          </span>
        ) : status.isOpen === false ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-black text-destructive ring-1 ring-destructive/30">
            <span className="size-2 rounded-full bg-destructive" />
            مغلق الآن
          </span>
        ) : null}
      </div>

      {/* Real-time Status Details */}
      {status.detail && (
        <p className="mt-1.5 pr-11 text-xs font-semibold text-muted-foreground">
          {status.detail}
        </p>
      )}

      {/* Emergency 24/7 Banner */}
      {hours.isEmergency24h && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/20">
          <Zap className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-extrabold">خدمة الطوارئ ٢٤/٧:</span>
            <span className="mr-1">هذا الصنايعي يستقبل طلبات الطوارئ والأعطال المستعجلة على مدار الساعة طوال أيام الأسبوع.</span>
          </div>
        </div>
      )}

      {/* Workshop / Location Information */}
      {hours.workshop?.hasWorkshop && (
        <div className="mt-3 rounded-xl border border-border bg-card/60 p-3.5">
          <div className="flex items-center gap-2 text-foreground font-extrabold text-sm mb-1">
            <Building2 className="size-4 text-primary" />
            <span>{hours.workshop.workshopName || "مقر / ورشة العمل"}</span>
          </div>
          {hours.workshop.workshopAddress && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span>العنوان: {hours.workshop.workshopAddress}</span>
            </p>
          )}
          {hours.workshop.workshopNotes && (
            <p className="text-xs text-muted-foreground mt-1 mr-5">
              ملاحظات: {hours.workshop.workshopNotes}
            </p>
          )}
        </div>
      )}

      {/* Weekly Schedule Details Accordion */}
      {hours.schedule && hours.schedule.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline"
          >
            <span>{expanded ? "إخفاء جدول أيام الأسبوع" : "عرض مواعيد كل أيام الأسبوع"}</span>
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {expanded && (
            <div className="mt-2.5 rounded-xl border border-border bg-card/80 p-3 text-xs">
              <div className="grid divide-y divide-border/60">
                {hours.schedule.map((day) => {
                  const isToday = day.dayKey === currentDayKey;
                  const overnight = day.isOpen && isOvernight(day.openTime, day.closeTime);

                  return (
                    <div
                      key={day.dayKey}
                      className={`flex items-center justify-between py-2 px-1 transition-colors ${
                        isToday ? "font-bold text-primary bg-primary/5 rounded-lg" : "text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold w-16">{day.dayName}</span>
                        {isToday && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
                            اليوم
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2" dir="ltr">
                        {day.isOpen ? (
                          <>
                            <span className="font-semibold" dir="rtl">
                              {formatTime12h(day.openTime)} – {formatTime12h(day.closeTime)}
                            </span>
                            {overnight && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground" title="نوبة ليلية حتى صباح اليوم التالي">
                                <Moon className="size-3" /> ليلية
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-bold text-muted-foreground" dir="rtl">
                            مغلق (إجازة)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hours.customNotes && (
                <div className="mt-2.5 pt-2 border-t border-border text-muted-foreground">
                  <span className="font-bold text-foreground">ملاحظات إضافية: </span>
                  {hours.customNotes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legacy raw text fallback if present */}
      {hours.rawTextFallback && !hours.schedule?.length && (
        <div className="mt-2 text-sm text-foreground bg-secondary/50 p-2.5 rounded-lg">
          {hours.rawTextFallback}
        </div>
      )}
    </div>
  );
}
