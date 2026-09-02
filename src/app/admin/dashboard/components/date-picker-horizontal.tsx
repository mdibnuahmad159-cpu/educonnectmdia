"use client";

import { useMemo } from "react";
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  addMonths, 
  subMonths,
} from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerHorizontalProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

export function DatePickerHorizontal({ selectedDate, onDateChange }: DatePickerHorizontalProps) {
  const currentSelected = useMemo(() => {
    try {
      return parseISO(selectedDate);
    } catch (e) {
      return new Date();
    }
  }, [selectedDate]);
  
  // Generate days for the week of the selected date
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentSelected, { weekStartsOn: 0 });
    return eachDayOfInterval({
      start,
      end: addDays(start, 6)
    });
  }, [currentSelected]);

  const handlePrevMonth = () => {
    const newDate = subMonths(currentSelected, 1);
    onDateChange(format(newDate, "yyyy-MM-dd"));
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentSelected, 1);
    onDateChange(format(newDate, "yyyy-MM-dd"));
  };

  const handlePrevDay = () => {
    const newDate = addDays(currentSelected, -1);
    onDateChange(format(newDate, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const newDate = addDays(currentSelected, 1);
    onDateChange(format(newDate, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground/80">Pilih Tanggal</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground min-w-[80px] text-center">
            {format(currentSelected, "MMMM yyyy", { locale: id })}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-8 shrink-0 rounded-xl hover:bg-primary/5 text-muted-foreground"
          onClick={handlePrevDay}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex justify-between items-center gap-1 flex-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, currentSelected);
            const dateStr = format(day, "yyyy-MM-dd");

            return (
              <button
                key={dateStr}
                onClick={() => onDateChange(dateStr)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 flex-1 py-2 rounded-2xl transition-all duration-200",
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-md scale-105" 
                    : "bg-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="text-[9px] font-medium uppercase opacity-70">
                  {format(day, "EEE", { locale: id })}
                </span>
                <span className={cn(
                  "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full border-2",
                  isSelected ? "border-white/20" : "border-transparent"
                )}>
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-8 shrink-0 rounded-xl hover:bg-primary/5 text-muted-foreground"
          onClick={handleNextDay}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
