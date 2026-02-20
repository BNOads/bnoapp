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

export function RecurrenceSelect({ value, onValueChange, children }: RecurrenceSelectProps) {
    const [customOpen, setCustomOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [intervalType, setIntervalType] = useState<"day" | "week" | "month" | "year">("week");
    const [intervalAmount, setIntervalAmount] = useState<number>(1);

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
            } else {
                setIntervalType("week");
                setIntervalAmount(1);
                setSelectedDays([]);
            }
            setCustomOpen(true);
            return;
        }
        onValueChange(val === "none" ? null : val);
    };

    const handleSaveCustom = () => {
        if (intervalType === "week" && selectedDays.length > 0) {
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

    const isSaveDisabled = intervalType === "week" && selectedDays.length === 0;

    return (
        <>
            <Select value={value || "none"} onValueChange={handleSelectChange}>
                {children}
                <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}

                    {value && value.startsWith("custom_") && (
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
                            <Select value={intervalType} onValueChange={(val: any) => setIntervalType(val)}>
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
                            <p className="text-sm text-muted-foreground text-center">
                                Repetirá no mesmo dia do mês da data original.
                            </p>
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
