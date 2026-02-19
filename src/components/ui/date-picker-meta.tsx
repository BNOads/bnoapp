import * as React from "react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface MetaDatePickerProps {
    dateRange: DateRange | undefined
    onDateRangeChange: (date: DateRange | undefined) => void
    disabled?: boolean
}

type Preset = {
    label: string
    value: string
    getDates: () => DateRange
}

export function MetaDatePicker({ dateRange, onDateRangeChange, disabled }: MetaDatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedPreset, setSelectedPreset] = React.useState<string>("custom")
    const [tempRange, setTempRange] = React.useState<DateRange | undefined>(dateRange)

    // Update tempRange when popover opens with new props
    React.useEffect(() => {
        if (isOpen) {
            setTempRange(dateRange)
            // Basic preset matching
            if (!dateRange) {
                setSelectedPreset("custom")
                return
            }
            const match = presets.find(p => {
                const pDates = p.getDates()
                return pDates.from && dateRange.from && isSameDay(pDates.from, dateRange.from) &&
                    pDates.to && dateRange.to && isSameDay(pDates.to, dateRange.to)
            })
            setSelectedPreset(match ? match.value : "custom")
        }
    }, [isOpen, dateRange])


    const presets: Preset[] = [
        {
            label: "Hoje",
            value: "today",
            getDates: () => {
                const today = new Date()
                return { from: today, to: today }
            }
        },
        {
            label: "Ontem",
            value: "yesterday",
            getDates: () => {
                const yesterday = subDays(new Date(), 1)
                return { from: yesterday, to: yesterday }
            }
        },
        {
            label: "Hoje e ontem",
            value: "today_yesterday",
            getDates: () => ({ from: subDays(new Date(), 1), to: new Date() })
        },
        {
            label: "Últimos 7 dias",
            value: "last_7",
            getDates: () => ({ from: subDays(new Date(), 6), to: new Date() })
        },
        {
            label: "Últimos 14 dias",
            value: "last_14",
            getDates: () => ({ from: subDays(new Date(), 13), to: new Date() })
        },
        {
            label: "Últimos 28 dias",
            value: "last_28",
            getDates: () => ({ from: subDays(new Date(), 27), to: new Date() })
        },
        {
            label: "Últimos 30 dias",
            value: "last_30",
            getDates: () => ({ from: subDays(new Date(), 29), to: new Date() })
        },
        {
            label: "Esta semana",
            value: "this_week",
            getDates: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 0 }), to: new Date() }) // or endOfWeek if they want future dates
        },
        {
            label: "Semana passada",
            value: "last_week",
            getDates: () => {
                const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 0 })
                return {
                    from: subDays(startOfThisWeek, 7),
                    to: subDays(startOfThisWeek, 1)
                }
            }
        },
        {
            label: "Este mês",
            value: "this_month",
            getDates: () => ({ from: startOfMonth(new Date()), to: new Date() })
        },
        {
            label: "Mês passado",
            value: "last_month",
            getDates: () => {
                const startOfThisMonth = startOfMonth(new Date())
                const lastMonth = subDays(startOfThisMonth, 1)
                return {
                    from: startOfMonth(lastMonth),
                    to: endOfMonth(lastMonth)
                }
            }
        },
        {
            label: "Máximo",
            value: "maximum",
            getDates: () => ({ from: new Date(2020, 0, 1), to: new Date() }) // Arbitrary max
        }
    ]

    const handleApply = () => {
        onDateRangeChange(tempRange)
        setIsOpen(false)
    }

    const handleCancel = () => {
        setIsOpen(false)
    }

    const handlePresetSelect = (value: string) => {
        setSelectedPreset(value)
        if (value === "custom") return

        const preset = presets.find(p => p.value === value)
        if (preset) {
            setTempRange(preset.getDates())
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    size="sm"
                    className={cn(
                        "w-[260px] justify-start text-left font-normal bg-white",
                        !dateRange && "text-muted-foreground",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                                {format(dateRange.from, "dd de MMM, yyyy", { locale: ptBR })} -{" "}
                                {format(dateRange.to, "dd de MMM, yyyy", { locale: ptBR })}
                            </>
                        ) : (
                            format(dateRange.from, "dd de MMM, yyyy", { locale: ptBR })
                        )
                    ) : (
                        <span>Máximo</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex flex-col md:flex-row shadow-lg rounded-xl overflow-hidden" align="end">
                {/* Left Side: Presets Menu */}
                <div className="w-full md:w-[220px] bg-slate-50 border-r border-slate-200 flex flex-col h-[400px]">
                    <div className="p-3 bg-white border-b border-slate-100/50">
                        <span className="text-sm font-semibold text-slate-900 px-2">Usados recentemente</span>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full">
                        <RadioGroup value={selectedPreset} onValueChange={handlePresetSelect} className="gap-0 py-2">
                            {presets.map((preset) => (
                                <div key={preset.value} className="flex items-center hover:bg-slate-100 transition-colors">
                                    <Label
                                        htmlFor={preset.value}
                                        className="flex-1 flex items-center px-4 py-2.5 cursor-pointer text-[13px] font-medium text-slate-700"
                                    >
                                        <RadioGroupItem value={preset.value} id={preset.value} className="mr-3 h-4 w-4" />
                                        {preset.label}
                                    </Label>
                                </div>
                            ))}
                            <Separator className="my-2 mx-4 w-auto" />
                            <div className="flex items-center hover:bg-slate-100 transition-colors">
                                <Label
                                    htmlFor="custom"
                                    className="flex-1 flex items-center px-4 py-2.5 cursor-pointer text-[13px] font-medium text-slate-700"
                                >
                                    <RadioGroupItem value="custom" id="custom" className="mr-3 h-4 w-4" />
                                    Personalizado
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                {/* Right Side: Calendars */}
                <div className="p-4 flex flex-col bg-white">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={tempRange?.from}
                            selected={tempRange}
                            onSelect={(range) => {
                                setTempRange(range)
                                setSelectedPreset("custom")
                            }}
                            numberOfMonths={2}
                            locale={ptBR}
                            className="p-0 border-0"
                            classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-4",
                                caption_label: "text-sm font-medium capitalize",
                                nav: "space-x-1 flex items-center",
                                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                                nav_button_previous: "absolute left-2",
                                nav_button_next: "absolute right-2",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex w-full mt-2",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] capitalize",
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected])]:bg-blue-100 focus-within:relative focus-within:z-20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md dark:[&:has([aria-selected])]:bg-slate-800",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-md",
                                day_range_end: "day-range-end",
                                day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-md z-10",
                                day_today: "bg-slate-100 text-slate-900 rounded-md font-bold",
                                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-blue-100/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_range_middle: "aria-selected:bg-blue-100 aria-selected:text-blue-900 aria-selected:rounded-none",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>

                    <Separator className="mb-4" />

                    {/* Footer controls: Compare (mock), Inputs, Action buttons */}
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground cursor-help" title="Fuso horário da conta. Opcional.">Fuso horário das datas: Horário de São Paulo</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                            <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white">Atualizar</Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
