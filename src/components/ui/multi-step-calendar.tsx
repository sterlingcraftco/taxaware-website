import * as React from "react";
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type View = "days" | "months" | "years";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MultiStepCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
  className?: string;
  initialFocus?: boolean;
}

export function MultiStepCalendar({
  selected,
  onSelect,
  disabled,
  fromYear = 2010,
  toYear = new Date().getFullYear(),
  className,
  initialFocus,
}: MultiStepCalendarProps) {
  const [view, setView] = useState<View>("days");
  const [displayMonth, setDisplayMonth] = useState<Date>(
    selected || new Date()
  );

  const currentMonth = displayMonth.getMonth();
  const currentYear = displayMonth.getFullYear();

  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = toYear; y >= fromYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [fromYear, toYear]);

  const handleHeaderClick = useCallback(() => {
    setView("years");
  }, []);

  const handleYearSelect = useCallback((year: number) => {
    setDisplayMonth(new Date(year, currentMonth, 1));
    setView("months");
  }, [currentMonth]);

  const handleMonthSelect = useCallback((month: number) => {
    setDisplayMonth(new Date(currentYear, month, 1));
    setView("days");
  }, [currentYear]);

  const handlePrevMonth = useCallback(() => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handlePrevYear = useCallback(() => {
    setDisplayMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
  }, []);

  const handleNextYear = useCallback(() => {
    setDisplayMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
  }, []);

  const yearScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (view === "years" && yearScrollRef.current) {
      const activeEl = yearScrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
  }, [view]);

  if (view === "years") {
    return (
      <div className={cn("p-3 pointer-events-auto w-[280px]", className)}>
        {/* Year header */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={handlePrevYear}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Select Year</span>
          <button
            type="button"
            onClick={handleNextYear}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Year grid */}
        <div
          ref={yearScrollRef}
          className="max-h-[220px] overflow-y-auto scrollbar-thin"
        >
          <div className="grid grid-cols-3 gap-1">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                data-active={year === currentYear}
                onClick={() => handleYearSelect(year)}
                className={cn(
                  "h-9 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  year === currentYear
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "months") {
    return (
      <div className={cn("p-3 pointer-events-auto w-[280px]", className)}>
        {/* Month header with year nav */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevYear}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("years")}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            {currentYear}
          </button>
          <button
            type="button"
            onClick={handleNextYear}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-2">
          {MONTH_NAMES.map((name, idx) => (
            <button
              key={name}
              type="button"
              onClick={() => handleMonthSelect(idx)}
              className={cn(
                "h-10 rounded-md text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                idx === currentMonth
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Days view
  return (
    <div className={cn("pointer-events-auto", className)}>
      <DayPicker
        mode="single"
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        selected={selected}
        onSelect={onSelect}
        disabled={disabled}
        showOutsideDays
        className="p-3"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "hidden",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
          day_range_end: "day-range-end",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        components={{
          CaptionLabel: () => (
            <button
              type="button"
              onClick={handleHeaderClick}
              className="text-sm font-medium hover:text-primary transition-colors cursor-pointer"
            >
              {FULL_MONTH_NAMES[currentMonth]} {currentYear}
            </button>
          ),
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
        }}
      />
    </div>
  );
}
