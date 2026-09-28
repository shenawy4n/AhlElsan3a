import { useState, useEffect } from "react";
import { Clock, Zap, Building2, RotateCcw, Moon, Check, Calendar } from "lucide-react";
import {
  parseWorkingHours,
  serializeWorkingHours,
  getDefaultSchedule,
  getDefaultStructuredWorkingHours,
  DAYS_CONFIG,
  isOvernight,
  formatTime12h,
  type StructuredWorkingHours,
  type DaySchedule,
  type DayKey,
} from "@/lib/working-hours";

interface WorkingHoursEditorProps {
  value: string;
  onChange: (serialized: string) => void;
}

export function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  const [data, setData] = useState<StructuredWorkingHours>(() => {
    return parseWorkingHours(value) || getDefaultStructuredWorkingHours();
  });

  const [rawLegacyText, setRawLegacyText] = useState<string | null>(() => {
    const parsed = parseWorkingHours(value);
    return parsed?.rawTextFallback || null;
  });

  // Whenever internal state changes, notify parent with serialized JSON
  function update(next: StructuredWorkingHours) {
    setData(next);
    onChange(serializeWorkingHours(next));
  }

  function handleToggleEmergency(checked: boolean) {
    update({
      ...data,
      isEmergency24h: checked,
    });
  }

  function handleToggleWorkshop(checked: boolean) {
    update({
      ...data,
      workshop: {
        ...data.workshop,
        hasWorkshop: checked,
        workshopName: checked ? data.workshop.workshopName || "ورشة العمل" : null,
      },
    });
  }

  function handleDayToggle(dayKey: DayKey, isOpen: boolean) {
    const newSchedule = data.schedule.map((d) =>
      d.dayKey === dayKey ? { ...d, isOpen } : d
    );
    update({ ...data, schedule: newSchedule });
  }

  function handleDayTimeChange(dayKey: DayKey, field: "openTime" | "closeTime", timeVal: string) {
    const newSchedule = data.schedule.map((d) =>
      d.dayKey === dayKey ? { ...d, [field]: timeVal } : d
    );
    update({ ...data, schedule: newSchedule });
  }

  // Quick Preset Handlers
  function applyPresetStandard() {
    // Sat - Thu 09:00 - 22:00, Friday closed
    const newSchedule = DAYS_CONFIG.map(({ key, name }) => ({
      dayKey: key,
      dayName: name,
      isOpen: key !== "fri",
      openTime: "09:00",
      closeTime: "22:00",
    }));
    update({ ...data, isEmergency24h: false, schedule: newSchedule });
  }

  function applyPresetAllWeek() {
    // 7 days 09:00 - 22:00
    const newSchedule = DAYS_CONFIG.map(({ key, name }) => ({
      dayKey: key,
      dayName: name,
      isOpen: true,
      openTime: "09:00",
      closeTime: "22:00",
    }));
    update({ ...data, isEmergency24h: false, schedule: newSchedule });
  }

  function applyPresetOvernight() {
    // 20:00 - 04:00 overnight
    const newSchedule = DAYS_CONFIG.map(({ key, name }) => ({
      dayKey: key,
      dayName: name,
      isOpen: key !== "fri",
      openTime: "20:00",
      closeTime: "04:00",
    }));
    update({ ...data, isEmergency24h: false, schedule: newSchedule });
  }

  return (
    <div className="surface grid gap-4 rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h3 className="text-base font-extrabold text-foreground">
            إعدادات التواجد ومواعيد العمل والورشة
          </h3>
        </div>
        <span className="text-xs font-bold text-muted-foreground" dir="ltr">
          Africa/Cairo
        </span>
      </div>

      {/* Legacy text alert if migrating old plain text */}
      {rawLegacyText && (
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/20">
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-extrabold">المواعيد السابقة المسجلة كنص: </span>
            <span className="font-semibold">"{rawLegacyText}"</span>
            <p className="mt-0.5 text-[11px] opacity-80">
              يمكنك استخدام الجدول أدناه لتنظيم المواعيد بشكل احترافي، وسيتم حفظها بشكل منظم دون فقدان أي بيانات.
            </p>
          </div>
        </div>
      )}

      {/* Emergency 24H Toggle */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/60 p-3 hover:bg-card">
        <input
          type="checkbox"
          checked={data.isEmergency24h}
          onChange={(e) => handleToggleEmergency(e.target.checked)}
          className="mt-0.5 size-4 rounded text-primary focus:ring-primary"
        />
        <div className="grid gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
            <Zap className="size-4 text-amber-500" /> متاح طوارئ ٢٤ ساعة (Emergency 24/7)
          </span>
          <span className="text-xs text-muted-foreground">
            تفعيل هذه الخاصية يُظهر شارة طوارئ مميزة في ملف الصنايعي وتعتبر مواعيده مفتوحة دائماً.
          </span>
        </div>
      </label>

      {/* Workshop Location Toggle & Fields */}
      <div className="grid gap-3 rounded-xl border border-border bg-card/60 p-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.workshop.hasWorkshop}
            onChange={(e) => handleToggleWorkshop(e.target.checked)}
            className="mt-0.5 size-4 rounded text-primary focus:ring-primary"
          />
          <div className="grid gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <Building2 className="size-4 text-primary" /> يمتلك ورشة / مقر عمل ثابت
            </span>
            <span className="text-xs text-muted-foreground">
              يستقبل الزبائن في الورشة أو المحل الخاص به بجانب النزول للعمل الميداني.
            </span>
          </div>
        </label>

        {data.workshop.hasWorkshop && (
          <div className="grid gap-2.5 pt-2 border-t border-border/60">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                اسم الورشة / المقر
              </label>
              <input
                type="text"
                value={data.workshop.workshopName || ""}
                onChange={(e) =>
                  update({
                    ...data,
                    workshop: { ...data.workshop, workshopName: e.target.value },
                  })
                }
                placeholder="مثال: ورشة الإخلاص للنجارة والموبيليا"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                عنوان وموقع الورشة
              </label>
              <input
                type="text"
                value={data.workshop.workshopAddress || ""}
                onChange={(e) =>
                  update({
                    ...data,
                    workshop: { ...data.workshop, workshopAddress: e.target.value },
                  })
                }
                placeholder="مثال: شارع داير الناحية، أمام مدرسة الشهداء"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                ملاحظات أو علامات مميزة للورشة
              </label>
              <input
                type="text"
                value={data.workshop.workshopNotes || ""}
                onChange={(e) =>
                  update({
                    ...data,
                    workshop: { ...data.workshop, workshopNotes: e.target.value },
                  })
                }
                placeholder="مثال: بجوار مستودع الأنابيب القديم"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {/* Weekly Schedule Section */}
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-foreground">
            جدول ساعات العمل الأسبوعية:
          </span>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={applyPresetStandard}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-bold text-muted-foreground hover:bg-secondary"
            >
              السبت–الخميس (٩ص–١٠م)
            </button>
            <button
              type="button"
              onClick={applyPresetAllWeek}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-bold text-muted-foreground hover:bg-secondary"
            >
              طوال الأسبوع
            </button>
            <button
              type="button"
              onClick={applyPresetOvernight}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-bold text-muted-foreground hover:bg-secondary"
            >
              نوبة ليلية (٨م–٤ص)
            </button>
          </div>
        </div>

        {/* Days Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
          <div className="min-w-[480px] divide-y divide-border/60">
            {data.schedule.map((day) => {
              const overnight = day.isOpen && isOvernight(day.openTime, day.closeTime);

              return (
                <div
                  key={day.dayKey}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors ${
                    day.isOpen ? "bg-card/30" : "bg-muted/30 opacity-70"
                  }`}
                >
                  {/* Day Name & Toggle */}
                  <div className="flex items-center gap-2.5 w-28">
                    <input
                      type="checkbox"
                      id={`day-${day.dayKey}`}
                      checked={day.isOpen}
                      onChange={(e) => handleDayToggle(day.dayKey, e.target.checked)}
                      className="size-4 rounded text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor={`day-${day.dayKey}`}
                      className="cursor-pointer text-sm font-extrabold text-foreground"
                    >
                      {day.dayName}
                    </label>
                  </div>

                  {/* Times */}
                  {day.isOpen ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground font-bold">من:</span>
                        <input
                          type="time"
                          value={day.openTime}
                          onChange={(e) =>
                            handleDayTimeChange(day.dayKey, "openTime", e.target.value)
                          }
                          className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground font-bold">إلى:</span>
                        <input
                          type="time"
                          value={day.closeTime}
                          onChange={(e) =>
                            handleDayTimeChange(day.dayKey, "closeTime", e.target.value)
                          }
                          className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold"
                        />
                      </div>

                      {/* Overnight badge */}
                      {overnight && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
                          title="تمتد نوبة العمل حتى صباح اليوم التالي"
                        >
                          <Moon className="size-3" /> ليلية
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 text-end">
                      <span className="rounded-md bg-secondary/80 px-2.5 py-1 text-xs font-bold text-muted-foreground">
                        إجازة (مغلق)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom notes */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">
            ملاحظات إضافية على المواعيد (اختياري)
          </label>
          <input
            type="text"
            value={data.customNotes || ""}
            onChange={(e) => update({ ...data, customNotes: e.target.value })}
            placeholder="مثال: الاستراحة من صلاة الجمعة حتى العصر"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
        </div>
      </div>
    </div>
  );
}
