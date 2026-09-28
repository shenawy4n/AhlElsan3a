import { Zap, Clock, CheckCircle2 } from "lucide-react";

export type AvailabilityFilterMode = "all" | "available_now" | "emergency_now";

interface AvailabilityFilterProps {
  currentMode: AvailabilityFilterMode;
  onModeChange: (mode: AvailabilityFilterMode) => void;
  counts?: {
    all: number;
    availableNow: number;
    emergencyNow: number;
  };
}

export function AvailabilityFilter({
  currentMode,
  onModeChange,
  counts,
}: AvailabilityFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onModeChange("all")}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all ${
          currentMode === "all"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground ring-1 ring-border"
        }`}
      >
        <span>الكل</span>
        {counts !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              currentMode === "all"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {counts.all}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onModeChange("available_now")}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all ${
          currentMode === "available_now"
            ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/40"
            : "bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground ring-1 ring-border"
        }`}
      >
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>متاح الآن</span>
        {counts !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              currentMode === "available_now"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {counts.availableNow}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onModeChange("emergency_now")}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all ${
          currentMode === "emergency_now"
            ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40"
            : "bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground ring-1 ring-border"
        }`}
      >
        <Zap className="size-3.5 fill-current" />
        <span>طوارئ ٢٤ ساعة</span>
        {counts !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              currentMode === "emergency_now"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {counts.emergencyNow}
          </span>
        )}
      </button>
    </div>
  );
}
