import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RECURRENCE_LABELS, getRecurrenceLabel } from "@/types/tasks";

interface RecurrenceSelectProps {
    value: string | null | undefined;
    onValueChange: (val: string | null) => void;
    children: React.ReactNode; // Deve ser um <SelectTrigger>
}

const DAYS = [
    { id: 1, label: "Seg", full: "Segunda-feira" },
    { id: 2, label: "Ter", full: "Terça-feira" },
    { id: 3, label: "Qua", full: "Quarta-feira" },
    { id: 4, label: "Qui", full: "Quinta-feira" },
    { id: 5, label: "Sex", full: "Sexta-feira" },
    { id: 6, label: "Sáb", full: "Sábado" },
    { id: 0, label: "Dom", full: "Domingo" },
];

const WEEK_POSITIONS = [
    { value: "1", label: "Primeiro(a)" },
    { value: "2", label: "Segundo(a)" },
    { value: "3", label: "Terceiro(a)" },
    { value: "4", label: "Quarto(a)" },
    { value: "last", label: "Último(a)" },
];

export function RecurrenceSelect({ value, onValueChange, children }: RecurrenceSelectProps) {
    const [customOpen, setCustomOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [intervalType, setIntervalType] = useState<"day" | "week" | "month" | "year">("week");
    const [intervalAmount, setIntervalAmount] = useState<number>(1);

    // Monthly sub-mode: "same_day" or "day_of_week"
    const [monthlyMode, setMonthlyMode] = useState<"same_day" | "day_of_week">("same_day");
    const [weekPosition, setWeekPosition] = useState<string>("1");
    const [weekDay, setWeekDay] = useState<number>(1); // 1 = Monday

    const handleSelectChange = (val: string) => {
        if (val === "custom") {
            // Parse existing custom if present
            if (value && value.startsWith("custom_")) {
                const parts = value.split("_");
                if (value.startsWith("custom_weekly_")) {
                    // Legacy support
                    setIntervalType("week");
                    setIntervalAmount(1);
                    setSelectedDays(value.replace("custom_weekly_", "").split(",").map(Number));
                } else if (parts.length >= 3) {
                    // New format: custom_interval_amount_days?
                    setIntervalType(parts[1] as any);
                    setIntervalAmount(parseInt(parts[2], 10) || 1);
                    if (parts[3]) {
                        setSelectedDays(parts[3].split(",").map(Number));
                    } else {
                        setSelectedDays([]);
                    }
                }
                setMonthlyMode("same_day");
            } else if (value && value.startsWith("monthly_dow_")) {
                // monthly_dow_{week}_{day}
                setIntervalType("month");
                setIntervalAmount(1);
                setMonthlyMode("day_of_week");
                const parts = value.split("_");
                // parts: ["monthly","dow","{week}","{day}"]
                setWeekPosition(parts[2] || "1");
                setWeekDay(parseInt(parts[3] || "1", 10));
            } else {
                setIntervalType("week");
                setIntervalAmount(1);
                setSelectedDays([]);
                setMonthlyMode("same_day");
            }
            setCustomOpen(true);
            return;
        }
        onValueChange(val === "none" ? null : val);
    };

    const handleSaveCustom = () => {
        if (intervalType === "month" && monthlyMode === "day_of_week") {
            onValueChange(`monthly_dow_${weekPosition}_${weekDay}`);
        } else if (intervalType === "week" && selectedDays.length > 0) {
            const sorted = [...selectedDays].sort((a, b) => {
                if (a === 0) return 1;
                if (b === 0) return -1;
                return a - b;
            });
            onValueChange(`custom_week_${intervalAmount}_${sorted.join(",")}`);
        } else {
            onValueChange(`custom_${intervalType}_${intervalAmount}`);
        }
        setCustomOpen(false);
    };

    const isSaveDisabled =
        (intervalType === "week" && selectedDays.length === 0) ||
        (intervalType === "month" && monthlyMode === "day_of_week" && !weekPosition);

    return (
        <>
            <Select value={value || "none"} onValueChange={handleSelectChange}>
                {children}
                <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}

                    {value && (value.startsWith("custom_") || value.startsWith("monthly_dow_")) && (
                        <SelectItem value={value} className="hidden">
                            {getRecurrenceLabel(value)}
                        </SelectItem>
                    )}

                    <SelectItem value="custom" className="border-t mt-1 font-medium text-primary">
                        Personalizar...
                    </SelectItem>
                </SelectContent>
            </Select>

            <Dialog open={customOpen} onOpenChange={setCustomOpen}>
                <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-background">
                    <div className="p-6">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl">Recorrência Personalizada</DialogTitle>
                        </DialogHeader>

                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Repetir a cada</span>
                            <Input
                                type="number"
                                min={1}
                                max={99}
                                value={intervalAmount}
                                onChange={(e) => setIntervalAmount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20 text-center"
                            />
                            <Select value={intervalType} onValueChange={(val: any) => { setIntervalType(val); setMonthlyMode("same_day"); }}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">{intervalAmount === 1 ? 'dia' : 'dias'}</SelectItem>
                                    <SelectItem value="week">{intervalAmount === 1 ? 'semana' : 'semanas'}</SelectItem>
                                    <SelectItem value="month">{intervalAmount === 1 ? 'mês' : 'meses'}</SelectItem>
                                    <SelectItem value="year">{intervalAmount === 1 ? 'ano' : 'anos'}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {intervalType === "week" && (
                            <div className="flex justify-between gap-1 sm:gap-2 animate-in fade-in zoom-in-95 duration-200 block">
                                {DAYS.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => {
                                            if (selectedDays.includes(d.id)) {
                                                setSelectedDays(selectedDays.filter(x => x !== d.id));
                                            } else {
                                                setSelectedDays([...selectedDays, d.id]);
                                            }
                                        }}
                                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-medium transition-all ${selectedDays.includes(d.id)
                                            ? 'bg-primary text-primary-foreground shadow-sm scale-110'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted cursor-pointer'
                                            }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {intervalType === "month" && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                {/* Toggle between same day and day of week */}
                                <div className="flex rounded-lg border overflow-hidden">
                                    <button
                                        onClick={() => setMonthlyMode("same_day")}
                                        className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${monthlyMode === "same_day"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background text-muted-foreground hover:bg-muted/50"
                                            }`}
                                    >
                                        Mesmo dia do mês
                                    </button>
                                    <button
                                        onClick={() => setMonthlyMode("day_of_week")}
                                        className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${monthlyMode === "day_of_week"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background text-muted-foreground hover:bg-muted/50"
                                            }`}
                                    >
                                        Dia da semana
                                    </button>
                                </div>

                                {monthlyMode === "same_day" && (
                                    <p className="text-sm text-muted-foreground text-center">
                                        Repetirá no mesmo dia do mês da data original.
                                    </p>
                                )}

                                {monthlyMode === "day_of_week" && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* Week position selector */}
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Qual semana do mês?</p>
                                            <div className="flex flex-wrap gap-2">
                                                {WEEK_POSITIONS.map(pos => (
                                                    <button
                                                        key={pos.value}
                                                        onClick={() => setWeekPosition(pos.value)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${weekPosition === pos.value
                                                            ? "bg-primary text-primary-foreground shadow-sm"
                                                            : "bg-muted/50 text-muted-foreground hover:bg-muted cursor-pointer"
                                                            }`}
                                                    >
                                                        {pos.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Day of week selector */}
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Qual dia da semana?</p>
                                            <div className="flex justify-between gap-1 sm:gap-2">
                                                {DAYS.map(d => (
                                                    <button
                                                        key={d.id}
                                                        onClick={() => setWeekDay(d.id)}
                                                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-medium transition-all ${weekDay === d.id
                                                            ? 'bg-primary text-primary-foreground shadow-sm scale-110'
                                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted cursor-pointer'
                                                            }`}
                                                    >
                                                        {d.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Preview label */}
                                        {weekPosition && weekDay !== undefined && (
                                            <p className="text-xs text-center text-primary font-medium pt-1">
                                                {WEEK_POSITIONS.find(p => p.value === weekPosition)?.label}{" "}
                                                {DAYS.find(d => d.id === weekDay)?.full.toLowerCase()} de cada{" "}
                                                {intervalAmount === 1 ? "mês" : `${intervalAmount} meses`}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="p-4 border-t bg-muted/10">
                        <Button variant="ghost" onClick={() => setCustomOpen(false)} className="text-muted-foreground">
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCustom} disabled={isSaveDisabled}>
                            Salvar Recorrência
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
