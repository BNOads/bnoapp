import { useState, useMemo } from "react";
import { format, differenceInBusinessDays, startOfWeek, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, AlertCircle, Phone, Calendar as CalendarIcon, Filter, Layers } from "lucide-react";
import { useEscalaContatos, ClienteEscala } from "@/hooks/useEscalaContatos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const WEEKDAYS = [
    { value: 1, label: "Segunda", short: "Seg" },
    { value: 2, label: "Terça", short: "Ter" },
    { value: 3, label: "Quarta", short: "Qua" },
    { value: 4, label: "Quinta", short: "Qui" },
    { value: 5, label: "Sexta", short: "Sex" },
];

function isClientLate(cliente: ClienteEscala): boolean {
    if (!cliente.ultimo_contato_at) return true;

    const lastContact = new Date(cliente.ultimo_contato_at);
    const now = new Date();

    if (differenceInBusinessDays(now, lastContact) >= 5) {
        return true;
    }

    if (cliente.escala_contato && cliente.escala_contato.length > 0) {
        const currentDayOfWeek = now.getDay();
        if (currentDayOfWeek > 0 && currentDayOfWeek <= 6) {
            const pastScheduledDays = cliente.escala_contato.filter(d => d <= currentDayOfWeek);
            if (pastScheduledDays.length > 0) {
                const mostRecentScheduledDay = Math.max(...pastScheduledDays);
                const mondayThisWeek = startOfWeek(now, { weekStartsOn: 1 });
                const scheduledDateThisWeek = addDays(mondayThisWeek, mostRecentScheduledDay - 1);

                if (isBefore(lastContact, startOfDay(scheduledDateThisWeek))) {
                    return true;
                }
            }
        }
    }

    return false;
}

// Subcomponente para selecionar dias de um cliente
function DiasSelector({ dias, onChange }: { dias: number[], onChange: (dias: number[]) => void }) {
    const handleToggle = (val: number) => {
        if (dias.includes(val)) {
            onChange(dias.filter(d => d !== val));
        } else {
            onChange([...dias, val].sort());
        }
    };

    const labels = dias.length === 0
        ? "Sem escala"
        : dias.map(d => WEEKDAYS.find(w => w.value === d)?.short).join(", ");

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 justify-start font-normal w-[160px] truncate text-xs">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 flex-shrink-0" />
                    {labels}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-2" align="start">
                <div className="space-y-2">
                    <h4 className="font-medium text-xs text-muted-foreground pb-1 border-b">Dias da semana</h4>
                    {WEEKDAYS.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                                id={`day-${day.value}`}
                                checked={dias.includes(day.value)}
                                onCheckedChange={() => handleToggle(day.value)}
                            />
                            <label
                                htmlFor={`day-${day.value}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                {day.label}
                            </label>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Subcomponente para configuração em massa por série
function BulkSerieConfig({ clientes, bulkAlterar, isLoading }: { clientes: ClienteEscala[], bulkAlterar: (serie: string, dias: number[]) => void, isLoading: boolean }) {
    const [selectedSerie, setSelectedSerie] = useState<string>("");
    const [selectedDias, setSelectedDias] = useState<number[]>([]);
    const [open, setOpen] = useState(false);

    const series = useMemo(() => {
        const s = new Set<string>();
        clientes.forEach(c => {
            if (c.serie) s.add(c.serie);
        });
        return Array.from(s).sort();
    }, [clientes]);

    const handleApply = () => {
        if (!selectedSerie) return;
        bulkAlterar(selectedSerie, selectedDias);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Layers className="h-4 w-4" />
                    <span className="hidden sm:inline">Configurar por Série</span>
                    <span className="sm:hidden">Séries</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configurar Escala por Série</DialogTitle>
                    <DialogDescription>
                        Defina os dias de contato padrão para todos os clientes de uma determinada série.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Selecione a Série</h4>
                        <div className="flex flex-wrap gap-2">
                            {series.map(s => (
                                <Badge
                                    key={s}
                                    variant={selectedSerie === s ? "default" : "outline"}
                                    onClick={() => setSelectedSerie(s)}
                                    className="cursor-pointer text-sm py-1 px-3"
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    {selectedSerie && (
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">Dias de Contato</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {WEEKDAYS.map((day) => (
                                    <div key={day.value} className="flex items-center space-x-2 border rounded-lg p-2">
                                        <Checkbox
                                            id={`bulk-day-${day.value}`}
                                            checked={selectedDias.includes(day.value)}
                                            onCheckedChange={() => {
                                                if (selectedDias.includes(day.value)) setSelectedDias(selectedDias.filter(d => d !== day.value));
                                                else setSelectedDias([...selectedDias, day.value].sort());
                                            }}
                                        />
                                        <label
                                            htmlFor={`bulk-day-${day.value}`}
                                            className="text-sm cursor-pointer w-full text-left"
                                        >
                                            {day.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleApply} disabled={!selectedSerie || isLoading}>
                        Salvar Padrão para Série
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function EscalaContatos() {
    const { clientes, isLoading, error, marcarContato, alterarEscala, isMarcandoContato, isAlterandoEscala, bulkAlterarEscalaSerie, isBulkUpdating } = useEscalaContatos();

    const todayDayOfWeek = new Date().getDay();
    const defaultTab = (todayDayOfWeek >= 1 && todayDayOfWeek <= 5) ? String(todayDayOfWeek) : "1";

    const [activeTab, setActiveTab] = useState(defaultTab);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
        );
    }

    if (error) {
        return <div className="text-sm text-destructive p-4">{(error as Error).message}</div>;
    }

    const clientesSemEscala = clientes.filter(c => !c.escala_contato || c.escala_contato.length === 0);
    const getClientesDoDia = (dia: number) => clientes.filter(c => c.escala_contato && c.escala_contato.includes(dia));

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center mb-2">
                <BulkSerieConfig clientes={clientes} bulkAlterar={bulkAlterarEscalaSerie} isLoading={isBulkUpdating} />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 h-auto overflow-hidden">
                    {WEEKDAYS.map(day => (
                        <TabsTrigger
                            key={day.value}
                            value={String(day.value)}
                            className="py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                        >
                            <span className="hidden sm:inline">{day.label}</span>
                            <span className="sm:hidden">{day.label.substring(0, 3)}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {WEEKDAYS.map(day => {
                    const list = getClientesDoDia(day.value);
                    const isCurrentDay = Number(activeTab) === day.value;

                    if (!isCurrentDay) return null;

                    return (
                        <TabsContent key={day.value} value={String(day.value)} className="mt-4 space-y-3">
                            {list.length === 0 ? (
                                <div className="rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
                                    Nenhum cliente escalado para este dia.
                                </div>
                            ) : (
                                [...list]
                                    .map(cliente => {
                                        const late = isClientLate(cliente);
                                        // determine if contacted today
                                        const contactedToday = cliente.ultimo_contato_at
                                            ? startOfDay(new Date(cliente.ultimo_contato_at)).getTime() === startOfDay(new Date()).getTime()
                                            : false;
                                        return { cliente, late, contactedToday };
                                    })
                                    .sort((a, b) => {
                                        // 1. Late always comes first
                                        if (a.late && !b.late) return -1;
                                        if (!a.late && b.late) return 1;

                                        // 2. Contacted today goes to bottom
                                        if (!a.contactedToday && b.contactedToday) return -1;
                                        if (a.contactedToday && !b.contactedToday) return 1;

                                        // 3. Alphabetical fallback
                                        return a.cliente.nome.localeCompare(b.cliente.nome);
                                    })
                                    .map(({ cliente, late, contactedToday }) => {

                                        // Determine Situacao colors
                                        let situacaoClasses = "border-slate-200 text-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-slate-400";
                                        if (cliente.situacao_cliente) {
                                            const sc = cliente.situacao_cliente.toLowerCase();
                                            if (sc === 'alerta' || sc === 'atrasado' || sc === 'critico') {
                                                situacaoClasses = "border-red-400 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400";
                                            } else if (sc === 'ponto_de_atencao' || sc === 'atencao') {
                                                situacaoClasses = "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400";
                                            } else if (sc === 'indo_bem' || sc === 'ok') {
                                                situacaoClasses = "border-green-400 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400";
                                            } else if (sc === 'resultados_normais' || sc === 'normal') {
                                                situacaoClasses = "border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-400";
                                            } else if (sc === 'nao_iniciado') {
                                                situacaoClasses = "border-slate-400 text-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-slate-400";
                                            }
                                        }

                                        return (
                                            <div
                                                key={cliente.id}
                                                className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl border-l-4 border transition-all hover:shadow-sm ${late
                                                        ? "border-l-red-500 bg-card border-red-100 dark:bg-card dark:border-red-900/20"
                                                        : contactedToday
                                                            ? "border-l-green-500 bg-green-50/30 border-green-100 dark:bg-green-950/10 opacity-70"
                                                            : "border-l-slate-400 bg-card border-border"
                                                    }`}
                                            >
                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-[15px] truncate max-w-[200px] sm:max-w-xs">{cliente.nome}</span>
                                                        {cliente.serie && (
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                                {cliente.serie}
                                                            </Badge>
                                                        )}
                                                        {cliente.situacao_cliente && (
                                                            <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-medium tracking-wide ${situacaoClasses}`}>
                                                                {cliente.situacao_cliente.replace(/_/g, " ")}
                                                            </Badge>
                                                        )}
                                                        {late && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-red-300 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/50 gap-1 font-bold uppercase">
                                                                <AlertCircle className="h-3 w-3" />
                                                                Atrasado
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <span className="flex items-center gap-1">
                                                            <CalendarIcon className="h-3.5 w-3.5" />
                                                            Últ. contato: {cliente.ultimo_contato_at ? format(new Date(cliente.ultimo_contato_at), "dd/MM/yyyy", { locale: ptBR }) : "Nunca"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                                                    <DiasSelector
                                                        dias={cliente.escala_contato || []}
                                                        onChange={(novosDias) => alterarEscala(cliente.id, novosDias)}
                                                    />

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className={`h-8 gap-1.5 w-[140px] border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-900/50`}
                                                                    onClick={() => marcarContato(cliente.id)}
                                                                    disabled={isMarcandoContato || contactedToday}
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                    <span className="">{contactedToday ? "Contatado" : "Marcar Contato"}</span>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Registrar que você entrou em contato com o cliente hoje</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>

            {clientesSemEscala.length > 0 && (
                <div className="mt-8">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground justify-between">
                        <span>Clientes sem escala definida ({clientesSemEscala.length})</span>
                    </h4>
                    <div className="space-y-2">
                        {clientesSemEscala.map(cliente => (
                            <div key={cliente.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-dashed bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                    <span className="font-medium text-sm truncate">{cliente.nome}</span>
                                    {cliente.serie && <Badge variant="secondary" className="text-[10px]">{cliente.serie}</Badge>}
                                </div>

                                <DiasSelector
                                    dias={cliente.escala_contato || []}
                                    onChange={(novosDias) => alterarEscala(cliente.id, novosDias)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
