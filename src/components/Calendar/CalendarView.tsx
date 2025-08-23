import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  htmlLink: string;
}

export const CalendarView = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Configuração da API do Google Calendar
  const CALENDAR_ID = 'contato@bnoads.com.br';

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Calcular data de início e fim para o mês atual
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          calendarId: CALENDAR_ID,
          timeMin: startOfMonth.toISOString(),
          timeMax: endOfMonth.toISOString()
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      setEvents(data.items || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos do calendário",
        variant: "destructive",
      });
      
      // Dados de exemplo para demonstração
      setEvents([
        {
          id: '1',
          summary: 'Reunião de Equipe',
          description: 'Reunião semanal da equipe BNOads',
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
          location: 'Escritório BNOads',
          htmlLink: '#'
        },
        {
          id: '2',
          summary: 'Apresentação Cliente',
          description: 'Apresentação de resultados mensais',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 7200000).toISOString() },
          htmlLink: '#'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const grouped: { [key: string]: CalendarEvent[] } = {};
    
    events.forEach(event => {
      const startDate = event.start.dateTime || event.start.date;
      if (startDate) {
        const dateKey = new Date(startDate).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      }
    });
    
    return grouped;
  };

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Calendário BNOads</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-lg font-medium min-w-[180px] text-center">
            {currentDate.toLocaleDateString('pt-BR', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoje
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground">
              Não há eventos agendados para este mês.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([dateKey, dayEvents]) => (
              <Card key={dateKey} className={isToday(dateKey) ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2">
                    <span className={isToday(dateKey) ? "text-primary" : ""}>
                      {formatDate(dateKey)}
                    </span>
                    {isToday(dateKey) && (
                      <Badge variant="default" className="text-xs">
                        Hoje
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-1">
                            {event.summary}
                          </h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {event.start.dateTime && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTime(event.start.dateTime)}
                                  {event.end.dateTime && 
                                    ` - ${formatTime(event.end.dateTime)}`
                                  }
                                </span>
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(event.htmlLink, '_blank')}
                        >
                          Ver no Google
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
};