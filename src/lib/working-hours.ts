export type DayKey = "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";

export interface DaySchedule {
  dayKey: DayKey;
  dayName: string;
  isOpen: boolean;
  openTime: string; // HH:mm 24h
  closeTime: string; // HH:mm 24h
}

export interface WorkshopInfo {
  hasWorkshop: boolean;
  workshopName?: string | null;
  workshopAddress?: string | null;
  workshopNotes?: string | null;
}

export interface StructuredWorkingHours {
  version: 1;
  timezone: "Africa/Cairo";
  isEmergency24h: boolean;
  workshop: WorkshopInfo;
  schedule: DaySchedule[];
  customNotes?: string | null;
  rawTextFallback?: string | null;
}

export const DAYS_CONFIG: { key: DayKey; name: string }[] = [
  { key: "sat", name: "السبت" },
  { key: "sun", name: "الأحد" },
  { key: "mon", name: "الإثنين" },
  { key: "tue", name: "الثلاثاء" },
  { key: "wed", name: "الأربعاء" },
  { key: "thu", name: "الخميس" },
  { key: "fri", name: "الجمعة" },
];

export function getDefaultSchedule(): DaySchedule[] {
  return DAYS_CONFIG.map(({ key, name }) => ({
    dayKey: key,
    dayName: name,
    isOpen: key !== "fri", // Friday typically day off in Egypt
    openTime: "09:00",
    closeTime: "22:00",
  }));
}

export function getDefaultStructuredWorkingHours(): StructuredWorkingHours {
  return {
    version: 1,
    timezone: "Africa/Cairo",
    isEmergency24h: false,
    workshop: {
      hasWorkshop: false,
      workshopName: null,
      workshopAddress: null,
      workshopNotes: null,
    },
    schedule: getDefaultSchedule(),
    customNotes: null,
    rawTextFallback: null,
  };
}

/**
 * Robust parser supporting backward compatibility:
 * - If string is JSON: parses structured object.
 * - If string is plain text: preserves raw text, infers emergency/workshop hints,
 *   and provides a structured default schedule without losing the original text.
 */
export function parseWorkingHours(raw: string | null | undefined): StructuredWorkingHours | null {
  if (!raw || !raw.trim()) return null;

  const trimmed = raw.trim();

  // Try parsing JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const schedule: DaySchedule[] = Array.isArray(parsed.schedule)
          ? DAYS_CONFIG.map(({ key, name }) => {
              const found = parsed.schedule.find((d: DaySchedule) => d.dayKey === key);
              return {
                dayKey: key,
                dayName: name,
                isOpen: found?.isOpen ?? true,
                openTime: found?.openTime || "09:00",
                closeTime: found?.closeTime || "22:00",
              };
            })
          : getDefaultSchedule();

        return {
          version: 1,
          timezone: "Africa/Cairo",
          isEmergency24h: Boolean(parsed.isEmergency24h),
          workshop: {
            hasWorkshop: Boolean(parsed.workshop?.hasWorkshop),
            workshopName: parsed.workshop?.workshopName || null,
            workshopAddress: parsed.workshop?.workshopAddress || null,
            workshopNotes: parsed.workshop?.workshopNotes || null,
          },
          schedule,
          customNotes: parsed.customNotes || null,
          rawTextFallback: parsed.rawTextFallback || null,
        };
      }
    } catch (e) {
      // not valid JSON, treat as text below
    }
  }

  // Backward compatibility: Plain text string
  const isEmergency = /طوارئ|24|٢٤/i.test(trimmed);
  const hasWorkshop = /ورشة|مقر|دكان/i.test(trimmed);

  return {
    version: 1,
    timezone: "Africa/Cairo",
    isEmergency24h: isEmergency,
    workshop: {
      hasWorkshop,
      workshopName: hasWorkshop ? "مقر / ورشة العمل" : null,
      workshopAddress: null,
      workshopNotes: null,
    },
    schedule: getDefaultSchedule(),
    customNotes: null,
    rawTextFallback: trimmed,
  };
}

/** Serialize structured working hours to JSON string for DB storage */
export function serializeWorkingHours(data: StructuredWorkingHours): string {
  return JSON.stringify(data);
}

/** Converts "HH:mm" (24h) into Arabic 12h format e.g. "9:00 ص" or "10:30 م" */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  const isPM = h >= 12;
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const mStr = m > 0 ? `:${m.toString().padStart(2, "0")}` : ":00";
  return `${h12}${mStr} ${isPM ? "م" : "ص"}`;
}

/** Check if closing time is overnight (closing next day) e.g. 22:00 to 04:00 */
export function isOvernight(openTime: string, closeTime: string): boolean {
  if (!openTime || !closeTime) return false;
  return closeTime < openTime;
}

/** Gets the current day and time in Africa/Cairo timezone */
export function getCairoNow(): {
  dayKey: DayKey;
  hours: number;
  minutes: number;
  timeMinutes: number;
  cairoDate: Date;
} {
  const now = new Date();
  const cairoFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = cairoFormatter.formatToParts(now);
  const weekdayPart = parts.find((p) => p.type === "weekday")?.value || "";
  const hourPart = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minutePart = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

  const weekdayMap: Record<string, DayKey> = {
    Sat: "sat",
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
  };

  const dayKey = weekdayMap[weekdayPart] || "sat";
  const timeMinutes = hourPart * 60 + minutePart;

  return {
    dayKey,
    hours: hourPart,
    minutes: minutePart,
    timeMinutes,
    cairoDate: now,
  };
}

export interface OpenStatusResult {
  isOpen: boolean | null; // null if plain text without hours
  badgeText: string;
  badgeType: "emergency" | "open" | "closed" | "info";
  detail?: string;
  isOvernightActive?: boolean;
}

/**
 * Calculates whether a provider is currently OPEN or CLOSED according to Cairo time,
 * with full support for overnight shifts, closed days, and 24/7 emergencies.
 */
export function getOpenStatus(hours: StructuredWorkingHours | null): OpenStatusResult {
  if (!hours) {
    return {
      isOpen: null,
      badgeText: "المواعيد غير محددة",
      badgeType: "info",
    };
  }

  // 1. Emergency 24/7 always open
  if (hours.isEmergency24h) {
    return {
      isOpen: true,
      badgeText: "متاح طوارئ ٢٤ ساعة",
      badgeType: "emergency",
      detail: "متاح لخدمات الطوارئ على مدار الساعة",
    };
  }

  // 2. If it was legacy text without structured schedule
  if (hours.rawTextFallback && (!hours.schedule || hours.schedule.length === 0)) {
    return {
      isOpen: null,
      badgeText: hours.rawTextFallback,
      badgeType: "info",
    };
  }

  const { dayKey: currentDayKey, timeMinutes: nowMinutes } = getCairoNow();

  // Find yesterday's schedule to check for active overnight shift spilling into today
  const dayKeys: DayKey[] = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
  const currentIdx = dayKeys.indexOf(currentDayKey);
  const prevIdx = (currentIdx + 6) % 7;
  const prevDayKey = dayKeys[prevIdx];

  const todaySchedule = hours.schedule.find((s) => s.dayKey === currentDayKey);
  const prevSchedule = hours.schedule.find((s) => s.dayKey === prevDayKey);

  // Check if yesterday's overnight shift is still open right now
  if (prevSchedule && prevSchedule.isOpen && isOvernight(prevSchedule.openTime, prevSchedule.closeTime)) {
    const prevCloseMins = timeToMinutes(prevSchedule.closeTime);
    if (nowMinutes < prevCloseMins) {
      return {
        isOpen: true,
        badgeText: "مفتوح الآن",
        badgeType: "open",
        detail: `نوبة ليلية حتى ${formatTime12h(prevSchedule.closeTime)}`,
        isOvernightActive: true,
      };
    }
  }

  // Check today's schedule
  if (!todaySchedule || !todaySchedule.isOpen) {
    return {
      isOpen: false,
      badgeText: "مغلق اليوم",
      badgeType: "closed",
      detail: "اليوم عطلة / إجازة",
    };
  }

  const openMins = timeToMinutes(todaySchedule.openTime);
  const closeMins = timeToMinutes(todaySchedule.closeTime);
  const overnight = isOvernight(todaySchedule.openTime, todaySchedule.closeTime);

  let isOpenNow = false;
  if (!overnight) {
    isOpenNow = nowMinutes >= openMins && nowMinutes < closeMins;
  } else {
    // Overnight: e.g. 21:00 to 03:00 -> open if now >= 21:00 OR now < 03:00
    isOpenNow = nowMinutes >= openMins || nowMinutes < closeMins;
  }

  if (isOpenNow) {
    return {
      isOpen: true,
      badgeText: "مفتوح الآن",
      badgeType: "open",
      detail: `يغلق في تمام ${formatTime12h(todaySchedule.closeTime)}${overnight ? " (صباح الغد)" : ""}`,
      isOvernightActive: overnight,
    };
  }

  // Currently closed today
  if (nowMinutes < openMins) {
    return {
      isOpen: false,
      badgeText: "مغلق الآن",
      badgeType: "closed",
      detail: `يفتح اليوم في ${formatTime12h(todaySchedule.openTime)}`,
    };
  }

  return {
    isOpen: false,
    badgeText: "مغلق الآن",
    badgeType: "closed",
    detail: `انتهت مواعيد اليوم (يغلق في ${formatTime12h(todaySchedule.closeTime)})`,
  };
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Human-readable concise summary of working hours
 */
export function generateScheduleSummary(hours: StructuredWorkingHours): string {
  if (hours.isEmergency24h) {
    return "متاح طوارئ ٢٤ ساعة على مدار الأسبوع";
  }

  if (hours.rawTextFallback && !hours.schedule?.length) {
    return hours.rawTextFallback;
  }

  const openDays = hours.schedule.filter((s) => s.isOpen);
  if (openDays.length === 0) return "مغلق مؤقتاً";

  const closedDays = hours.schedule.filter((s) => !s.isOpen);

  // Check if all open days have identical hours
  const firstOpen = openDays[0];
  const allSameHours = openDays.every(
    (d) => d.openTime === firstOpen?.openTime && d.closeTime === firstOpen?.closeTime
  );

  if (allSameHours && firstOpen) {
    const timeStr = `${formatTime12h(firstOpen.openTime)} – ${formatTime12h(firstOpen.closeTime)}`;
    if (closedDays.length === 0) {
      return `طوال الأسبوع: ${timeStr}`;
    }
    const closedNames = closedDays.map((d) => d.dayName).join(" و ");
    return `يومياً ما عدا (${closedNames}): ${timeStr}`;
  }

  return `${openDays.length} أيام أسبوعياً`;
}

/**
 * Checks whether a provider is available right now according to Africa/Cairo time:
 * - is_emergency_24h = true
 * - OR current Cairo time is within working hours
 */
export function isProviderAvailableNow(workingHoursRaw: string | null | undefined): boolean {
  const hours = parseWorkingHours(workingHoursRaw);
  if (!hours) return false;
  if (hours.isEmergency24h) return true;
  const status = getOpenStatus(hours);
  return status.isOpen === true;
}

/**
 * Checks whether a provider is 24H Emergency provider
 */
export function isProviderEmergency24h(workingHoursRaw: string | null | undefined): boolean {
  const hours = parseWorkingHours(workingHoursRaw);
  return Boolean(hours?.isEmergency24h);
}

