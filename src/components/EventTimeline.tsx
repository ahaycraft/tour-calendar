import { startOfDay } from "date-fns";
import { Check } from "lucide-react";
import { calendarDate, cn, formatTime } from "@/lib/utils";

interface Step {
  key: string;
  label: string;
  time: Date;
}

type StepStatus = "done" | "next" | "upcoming";

/**
 * Vertical itinerary — load-in/call, doors, set/wrap as connected steps
 * instead of one crammed inline row, so the running order actually reads as
 * a sequence. On the show's own day, steps that have already passed dim
 * with a check, and the next one still ahead gets highlighted; on any other
 * day every step just renders "upcoming" (past shows read as fully done).
 */
export default function EventTimeline({
  date,
  loadInTime,
  doorsTime,
  setTime,
  isRecording
}: {
  date: Date;
  loadInTime: Date | null;
  doorsTime: Date | null;
  setTime: Date | null;
  isRecording: boolean;
}) {
  const steps: Step[] = (
    [
      loadInTime && {
        key: "loadIn",
        label: isRecording ? "Call" : "Load in",
        time: loadInTime
      },
      doorsTime && { key: "doors", label: "Doors", time: doorsTime },
      setTime && {
        key: "set",
        label: isRecording ? "Wrap" : "Set",
        time: setTime
      }
    ] as const
  ).filter((s): s is Step => Boolean(s));

  if (steps.length === 0) return null;

  const now = new Date();
  const today = startOfDay(now);
  const eventDay = startOfDay(calendarDate(date));
  const isPast = eventDay < today;
  const isFuture = eventDay > today;

  let nextFound = false;
  const statuses: StepStatus[] = steps.map((step) => {
    if (isPast) return "done";
    if (isFuture) return "upcoming";
    if (step.time <= now) return "done";
    if (!nextFound) {
      nextFound = true;
      return "next";
    }
    return "upcoming";
  });

  return (
    <div>
      {steps.map((step, i) => {
        const status = statuses[i];
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                  status === "done" && "bg-zinc-700",
                  status === "next" && "bg-blue-500 ring-4 ring-blue-500/20",
                  status === "upcoming" && "bg-zinc-600"
                )}
              >
                {status === "done" && (
                  <Check size={10} className="text-zinc-300" />
                )}
              </span>
              {!isLast && <span className="w-px flex-1 bg-zinc-800" />}
            </div>
            <div className={cn("pb-4", isLast && "pb-0")}>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-sm",
                    status === "done" && "text-zinc-500",
                    status === "next" && "font-semibold text-zinc-50",
                    status === "upcoming" && "text-zinc-300"
                  )}
                >
                  {step.label}
                </span>
                {status === "next" && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-400">
                    Next
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "text-xs",
                  status === "done" ? "text-zinc-600" : "text-zinc-500"
                )}
              >
                {formatTime(step.time)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
