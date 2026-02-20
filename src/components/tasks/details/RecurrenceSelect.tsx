import React, { useState } from "react";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

    const handleSelectChange = (val: string) => {
        if (val === "custom") {
            if (value && value.startsWith("custom_weekly_")) {
                const days = value.replace("custom_weekly_", "").split(",").map(Number);
                setSelectedDays(days);
            } else {
                setSelectedDays([]);
            }
            setCustomOpen(true);
            return;
        }
        onValueChange(val === "none" ? null : val);
    };

    const handleSaveCustom = () => {
        if (selectedDays.length === 0) {
            onValueChange(null);
        } else {
            const sorted = [...selectedDays].sort((a, b) => {
                if (a === 0) return 1;
                if (b === 0) return -1;
                return a - b;
            });
            onValueChange(`custom_weekly_${sorted.join(",")}`);
        }
        setCustomOpen(false);
    };

    return (
        <>
            <Select value={value || "none"} onValueChange={handleSelectChange}>
                {children}
                <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}

                    {value && value.startsWith("custom_weekly_") && (
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
                            <span className="text-sm font-medium text-muted-foreground">Repetir a cada</span>
                            <div className="border rounded-md px-4 py-2 bg-muted/30 text-sm font-medium">1</div>
                            <span className="text-sm font-medium text-muted-foreground">semana(s)</span>
                        </div>

                        <div className="flex justify-between gap-1 sm:gap-2">
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
                    </div>
                    <DialogFooter className="p-4 border-t bg-muted/10">
                        <Button variant="ghost" onClick={() => setCustomOpen(false)} className="text-muted-foreground">
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCustom} disabled={selectedDays.length === 0}>
                            Salvar Recorrência
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
