import { useState, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Calendar, CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";

interface LinkCalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectEvent: (event: GoogleCalendarEvent) => void;
}

export function LinkCalendarEventModal({ isOpen, onClose, onSelectEvent }: LinkCalendarEventModalProps) {
    const [search, setSearch] = useState("");
    // Traz a agenda de 7 dias atrás até 7 dias na frente
    const { data: events = [], isLoading } = useGoogleCalendar(7, 7);

    const filteredEvents = useMemo(() => {
        if (!search) return events;
        const s = search.toLowerCase();
        return events.filter(e => (e.summary || '').toLowerCase().includes(s));
    }, [events, search]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md gap-0 p-0">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-indigo-500" />
                        Vincular ao Calendar
                    </DialogTitle>
                    <DialogDescription>
                        Selecione a reunião do Google Calendar para vincular a esta pauta. A pauta ficará visível diretamente no Atendimento.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar reunião..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-muted/30"
                        />
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto px-2 pb-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                            Carregando agenda...
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            Nenhuma reunião encontrada.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredEvents.map(event => {
                                const start = event.start?.dateTime ? parseISO(event.start.dateTime) : null;
                                const dateStr = start && isValid(start) ? format(start, "dd/MM/yyyy • HH:mm", { locale: ptBR }) : "Data Indisponível";
                                return (
                                    <button
                                        key={event.id}
                                        onClick={() => {
                                            onSelectEvent(event);
                                            onClose();
                                        }}
                                        className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex flex-col gap-1 border border-transparent hover:border-border"
                                    >
                                        <p className="font-semibold text-sm line-clamp-1">{event.summary || '(sem título)'}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {dateStr}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
