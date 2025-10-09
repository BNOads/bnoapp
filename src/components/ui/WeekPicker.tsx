import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";

interface WeekPickerProps {
  value?: string; // week_start in YYYY-MM-DD format
  onChange: (weekStart: string, weekYear: number, weekNumber: number) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

const TIMEZONE = "America/Sao_Paulo";

export function WeekPicker({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Selecionar semana",
  className 
}: WeekPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);

  // Initialize with current week if no value provided
  useEffect(() => {
    if (value) {
      const date = new Date(value + "T00:00:00");
      const zonedDate = toZonedTime(date, TIMEZONE);
      setSelectedWeekStart(zonedDate);
    } else {
      const now = toZonedTime(new Date(), TIMEZONE);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      setSelectedWeekStart(weekStart);
      
      // Auto-select current week on mount
      const weekYear = getYear(weekStart);
      const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
      onChange(format(weekStart, "yyyy-MM-dd"), weekYear, weekNumber);
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const zonedDate = toZonedTime(date, TIMEZONE);
    const weekStart = startOfWeek(zonedDate, { weekStartsOn: 1 });
    
    setSelectedWeekStart(weekStart);
    
    const weekYear = getYear(weekStart);
    const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
    onChange(format(weekStart, "yyyy-MM-dd"), weekYear, weekNumber);
    setIsOpen(false);
  };

  const navigateWeek = (direction: "prev" | "next" | "current") => {
    const current = selectedWeekStart || toZonedTime(new Date(), TIMEZONE);
    let newWeekStart: Date;

    switch (direction) {
      case "prev":
        newWeekStart = subWeeks(current, 1);
        break;
      case "next":
        newWeekStart = addWeeks(current, 1);
        break;
      case "current":
        newWeekStart = startOfWeek(toZonedTime(new Date(), TIMEZONE), { weekStartsOn: 1 });
        break;
    }

    setSelectedWeekStart(newWeekStart);
    
    const weekYear = getYear(newWeekStart);
    const weekNumber = getWeek(newWeekStart, { weekStartsOn: 1 });
    onChange(format(newWeekStart, "yyyy-MM-dd"), weekYear, weekNumber);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Only handle keyboard shortcuts when WeekPicker popover is open
    // Don't capture keys globally to avoid interfering with text inputs
    const activeElement = document.activeElement;
    const isTyping = activeElement?.tagName === 'INPUT' || 
                     activeElement?.tagName === 'TEXTAREA' ||
                     activeElement?.getAttribute('contenteditable') === 'true';
    
    // Don't handle shortcuts if user is typing in a text field
    if (isTyping) {
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateWeek("prev");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      navigateWeek("next");
    } else if (e.key === "t" || e.key === "T") {
      e.preventDefault();  
      navigateWeek("current");
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedWeekStart]);

  const getDisplayText = () => {
    if (!selectedWeekStart) return placeholder;
    
    const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
    const weekNumber = getWeek(selectedWeekStart, { weekStartsOn: 1 });
    
    const startText = format(selectedWeekStart, "dd/MM/yyyy", { locale: ptBR });
    const endText = format(weekEnd, "dd/MM/yyyy", { locale: ptBR });
    
    return `${startText} – ${endText} (Sem ${weekNumber})`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedWeekStart && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getDisplayText()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <Calendar
                mode="single"
                selected={selectedWeekStart || undefined}
                onSelect={handleDateSelect}
                initialFocus
                locale={ptBR}
                modifiers={{
                  selected_week: selectedWeekStart ? (date) => {
                    const weekStart = startOfWeek(selectedWeekStart, { weekStartsOn: 1 });
                    const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
                    return date >= weekStart && date <= weekEnd;
                  } : () => false
                }}
                modifiersStyles={{
                  selected_week: {
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }
                }}
                className="pointer-events-auto"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => navigateWeek("current")}>
                  Esta Semana
                </Button>
                {onClear && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    setSelectedWeekStart(null);
                    onClear();
                    setIsOpen(false);
                  }}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigateWeek("prev")}
          className="h-8 w-8 p-0"
          title="Semana anterior (←)"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigateWeek("current")}
          className="flex-1 h-8 text-xs"
          title="Esta semana (T)"
        >
          Esta Semana
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigateWeek("next")}
          className="h-8 w-8 p-0"
          title="Próxima semana (→)"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}