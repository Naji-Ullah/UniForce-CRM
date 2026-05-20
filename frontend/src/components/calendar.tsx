"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  /** Currently selected ISO date string (YYYY-MM-DD) or null. */
  value: string | null;
  onChange: (iso: string) => void;
  /** ISO date strings that already have data — highlighted with a dot. */
  markedDates?: string[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function Calendar({ value, onChange, markedDates = [] }: CalendarProps) {
  const todayISO = toISO(new Date());
  const initial = value ? new Date(value + "T00:00:00") : new Date();
  const [cursor, setCursor] = useState(startOfMonth(initial));

  const marked = useMemo(() => new Set(markedDates), [markedDates]);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    // Convert JS Sunday=0 to Monday-first ordering.
    const startOffset = (first.getDay() + 6) % 7;
    const out: { iso: string | null; day: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) out.push({ iso: null, day: null });
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      out.push({ iso: toISO(date), day: d });
    }
    while (out.length % 7 !== 0) out.push({ iso: null, day: null });
    return out;
  }, [cursor]);

  const monthLabel = cursor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium">{monthLabel}</p>
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          if (!c.iso) return <div key={i} />;
          const isSelected = value === c.iso;
          const isToday = todayISO === c.iso;
          const isMarked = marked.has(c.iso);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(c.iso!)}
              className={cn(
                "relative flex h-9 items-center justify-center rounded-md text-sm transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                !isSelected && isToday && "ring-1 ring-inset ring-primary/40"
              )}
            >
              {c.day}
              {isMarked && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-accent"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
