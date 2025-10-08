import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, Edit, CalendarDays, BarChart3, Plus } from "lucide-react";
import { format, addDays, addMonths, startOfWeek, startOfMonth, differenceInDays, parseISO, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type EscalaVisao = 'dia' | 'semana' | 'mes';
type TipoVisualizacao = 'gantt' | 'calendario' | 'timeline';

interface FaseLancamento {
  nome: string;
  dataInicio: string | null;
  dataFim: string | null;
  cor: string;
  campo_inicio: keyof any;
  campo_fim: keyof any;
}

interface GanttChartAvancadoProps {
  lancamento: any;
  onUpdateDates: (campo: string, valor: string) => void;
}

const fases: FaseLancamento[] = [
  {
    nome: "Captação",
    dataInicio: null,
    dataFim: null,
    cor: "bg-blue-500",
    campo_inicio: "data_inicio_captacao" as any,
    campo_fim: "data_fim_captacao" as any
  },
  {
    nome: "Aquecimento", 
    dataInicio: null,
    dataFim: null,
    cor: "bg-purple-500",
    campo_inicio: "data_inicio_aquecimento" as any,
    campo_fim: "data_fim_aquecimento" as any
  },
  {
    nome: "CPL", 
    dataInicio: null,
    dataFim: null,
    cor: "bg-green-500",
    campo_inicio: "data_inicio_cpl" as any,
    campo_fim: "data_fim_cpl" as any
  },
  {
    nome: "Lembrete",
    dataInicio: null,
    dataFim: null,
    cor: "bg-yellow-500",
    campo_inicio: "data_inicio_lembrete" as any,
    campo_fim: "data_fim_lembrete" as any
  },
  {
    nome: "Carrinho",
    dataInicio: null,
    dataFim: null,
    cor: "bg-orange-500",
    campo_inicio: "data_inicio_carrinho" as any,
    campo_fim: "data_fim_carrinho" as any
  },
  {
    nome: "Fechamento",
    dataInicio: null,
    dataFim: null,
    cor: "bg-red-500",
    campo_inicio: "data_fechamento" as any,
    campo_fim: "data_fechamento" as any
  }
];

export default function GanttChartAvancado({ lancamento, onUpdateDates }: GanttChartAvancadoProps) {
  const [escalaVisao, setEscalaVisao] = useState<EscalaVisao>('dia');
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>('gantt');
  const [editingPhase, setEditingPhase] = useState<FaseLancamento | null>(null);
  const [tempDates, setTempDates] = useState<{ inicio: string; fim: string }>({ inicio: '', fim: '' });

  // Calcular intervalo de datas e pontos no tempo
  const { dataInicio, dataFim, pontosNoTempo } = useMemo(() => {
    if (!lancamento?.data_inicio_captacao) {
      return { dataInicio: new Date(), dataFim: new Date(), pontosNoTempo: [] };
    }

    // Usar a data de início da captação como referência
    const inicioCaptacao = parseISO(lancamento.data_inicio_captacao);
    
    // Mostrar os próximos 7 dias a partir do início da captação
    const inicio = startOfDay(inicioCaptacao);
    const fim = addDays(inicio, 6); // 7 dias no total (dia 0 + 6 dias)

    const pontos: Date[] = [];
    let atual = inicio;

    // Para visualização de dia, mostrar cada dia
    while (atual <= fim) {
      pontos.push(new Date(atual));
      
      if (escalaVisao === 'dia') {
        atual = addDays(atual, 1);
      } else if (escalaVisao === 'semana') {
        atual = addDays(atual, 7);
      } else {
        atual = addMonths(atual, 1);
      }
    }

    return { dataInicio: inicio, dataFim: fim, pontosNoTempo: pontos };
  }, [lancamento, escalaVisao]);

  const calcularPosicao = useCallback((data: string | null) => {
    if (!data) return 0;
    const targetDate = parseISO(data);
    const totalDias = differenceInDays(dataFim, dataInicio);
    const diasDoInicio = differenceInDays(targetDate, dataInicio);
    return Math.max(0, Math.min(100, (diasDoInicio / totalDias) * 100));
  }, [dataInicio, dataFim]);

  const calcularLargura = useCallback((inicio: string | null, fim: string | null) => {
    if (!inicio || !fim) return 0;
    const startDate = parseISO(inicio);
    const endDate = parseISO(fim);
    const totalDias = differenceInDays(dataFim, dataInicio);
    const diasFase = differenceInDays(endDate, startDate);
    return Math.max(1, (diasFase / totalDias) * 100);
  }, [dataInicio, dataFim]);

  const formatarDataHeader = useCallback((data: Date) => {
    if (escalaVisao === 'dia') {
      return format(data, 'dd/MM', { locale: ptBR });
    } else if (escalaVisao === 'semana') {
      return `Sem ${format(data, 'w', { locale: ptBR })}`;
    } else {
      return format(data, 'MMM', { locale: ptBR });
    }
  }, [escalaVisao]);

  const cellWidth = useMemo(() => (escalaVisao === 'dia' ? 36 : escalaVisao === 'semana' ? 64 : 96), [escalaVisao]);

  const indexHoje = useMemo(() => {
    const hoje = startOfDay(new Date());
    if (!pontosNoTempo.length) return -1;

    if (escalaVisao === 'dia') {
      return pontosNoTempo.findIndex(d => isSameDay(startOfDay(d), hoje));
    }
    if (escalaVisao === 'semana') {
      const inicioSemanaHoje = startOfWeek(hoje, { weekStartsOn: 1 });
      return pontosNoTempo.findIndex(d => isSameDay(startOfWeek(d, { weekStartsOn: 1 }), inicioSemanaHoje));
    }
    // mês
    return pontosNoTempo.findIndex(d => d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear());
  }, [pontosNoTempo, escalaVisao]);

  const posicaoHojePx = useMemo(() => {
    if (indexHoje < 0) return -1;
    return indexHoje * cellWidth + cellWidth / 2;
  }, [indexHoje, cellWidth]);

  const handleEditPhase = (fase: FaseLancamento) => {
    const dataInicio = lancamento[fase.campo_inicio] || '';
    const dataFim = lancamento[fase.campo_fim] || '';
    setTempDates({ inicio: dataInicio, fim: dataFim });
    setEditingPhase(fase);
  };

  const handleSavePhase = () => {
    if (!editingPhase) return;
    
    if (tempDates.inicio) {
      onUpdateDates(editingPhase.campo_inicio as string, tempDates.inicio);
    }
    if (tempDates.fim) {
      onUpdateDates(editingPhase.campo_fim as string, tempDates.fim);
    }
    
    setEditingPhase(null);
  };

  const calcularDiasFase = (inicio: string | null, fim: string | null) => {
    if (!inicio || !fim) return 0;
    return differenceInDays(parseISO(fim), parseISO(inicio)) + 1;
  };

  const renderCalendarioView = () => {
    const events = fases.map(fase => ({
      ...fase,
      dataInicio: lancamento[fase.campo_inicio],
      dataFim: lancamento[fase.campo_fim]
    })).filter(event => event.dataInicio);

    const sortedEvents = events.sort((a, b) => 
      new Date(a.dataInicio!).getTime() - new Date(b.dataInicio!).getTime()
    );

    return (
      <div className="space-y-4">
        <div className="grid gap-4">
          {sortedEvents.map((event, index) => {
            const inicio = parseISO(event.dataInicio!);
            const fim = event.dataFim ? parseISO(event.dataFim) : inicio;
            const dias = calcularDiasFase(event.dataInicio, event.dataFim);
            const isHoje = event.dataInicio && isSameDay(new Date(), inicio);

            return (
              <div 
                key={index}
                className={`relative border rounded-lg p-4 ${isHoje ? 'border-red-500 bg-red-50' : 'border-border'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${event.cor}`}></div>
                    <div>
                      <h4 className="font-medium">{event.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(inicio, 'dd/MM/yyyy', { locale: ptBR })}
                        {event.dataFim && ` - ${format(fim, 'dd/MM/yyyy', { locale: ptBR })}`}
                        {dias > 0 && ` (${dias} dias)`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPhase(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                {isHoje && (
                  <Badge variant="destructive" className="absolute top-2 right-12">
                    Hoje
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setEditingPhase({
            nome: 'Nova Fase',
            dataInicio: null,
            dataFim: null,
            cor: 'bg-purple-500',
            campo_inicio: 'data_inicio_captacao' as any,
            campo_fim: 'data_fim_captacao' as any
          })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Nova Fase
        </Button>
      </div>
    );
  };

  const renderTimelineView = () => {
    const events = fases.map(fase => ({
      ...fase,
      dataInicio: lancamento[fase.campo_inicio],
      dataFim: lancamento[fase.campo_fim]
    })).filter(event => event.dataInicio).sort((a, b) => 
      new Date(a.dataInicio!).getTime() - new Date(b.dataInicio!).getTime()
    );

    return (
      <div className="space-y-6">
        <div className="relative">
          {/* Linha vertical principal */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
          
          {events.map((event, index) => {
            const inicio = parseISO(event.dataInicio!);
            const fim = event.dataFim ? parseISO(event.dataFim) : inicio;
            const dias = calcularDiasFase(event.dataInicio, event.dataFim);
            const isHoje = isSameDay(new Date(), inicio);

            return (
              <div key={index} className="relative flex items-start gap-6 pb-8">
                {/* Marcador na linha */}
                <div className={`relative z-10 w-8 h-8 rounded-full border-4 border-background ${event.cor} ${isHoje ? 'ring-2 ring-red-500' : ''}`}>
                  <div className="w-full h-full rounded-full bg-current opacity-80"></div>
                </div>
                
                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{event.nome}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(inicio, 'dd/MM/yyyy', { locale: ptBR })}
                        {event.dataFim && ` - ${format(fim, 'dd/MM/yyyy', { locale: ptBR })}`}
                      </p>
                      {dias > 0 && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {dias} dias
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPhase(event)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma
            </CardTitle>
            <div className="flex gap-2">
              {/* Tipo de Visualização */}
              <div className="flex gap-1 border rounded p-1">
                <Button
                  variant={tipoVisualizacao === 'gantt' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTipoVisualizacao('gantt')}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={tipoVisualizacao === 'calendario' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTipoVisualizacao('calendario')}
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
                <Button
                  variant={tipoVisualizacao === 'timeline' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTipoVisualizacao('timeline')}
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Escala de Visualização - apenas no Gantt */}
              {tipoVisualizacao === 'gantt' && (
                <div className="flex gap-2">
                  <Button
                    variant={escalaVisao === 'dia' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEscalaVisao('dia')}
                  >
                    Dia
                  </Button>
                  <Button
                    variant={escalaVisao === 'semana' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEscalaVisao('semana')}
                  >
                    Semana
                  </Button>
                  <Button
                    variant={escalaVisao === 'mes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEscalaVisao('mes')}
                  >
                    Mês
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tipoVisualizacao === 'gantt' && (
            <div className="space-y-4">
              {/* Cabeçalho com datas + linha do tempo (alinhados e roláveis) */}
              <div className="relative overflow-x-auto">
                <div className="min-w-max">
                  <div
                    className="grid gap-1 text-xs text-muted-foreground mb-2"
                    style={{ gridTemplateColumns: `repeat(${pontosNoTempo.length}, ${cellWidth}px)` }}
                  >
                    {pontosNoTempo.map((data, index) => (
                      <div key={index} className="text-center">
                        {formatarDataHeader(data)}
                      </div>
                    ))}
                  </div>

                  {/* Timeline base com linha do "hoje" */}
                  <div className="relative">
                    <div
                      className="relative h-2 bg-muted rounded mb-4"
                      style={{ width: `${pontosNoTempo.length * cellWidth}px` }}
                    >
                    </div>
                    
                    {/* Linha do "hoje" - estende até embaixo */}
                    {posicaoHojePx >= 0 && (
                      <div
                        className="absolute top-0 w-0.5 bg-red-500 z-10"
                        style={{ 
                          left: `${posicaoHojePx}px`,
                          height: 'calc(100% + 300px)' // Estende para baixo cobrindo as fases
                        }}
                      >
                        <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                        <div className="absolute top-6 -left-4 text-xs text-red-500 font-medium">
                          Hoje
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fases do lançamento */}
              <div className="space-y-3">
                {fases.map((fase) => {
                  const dataInicio = lancamento[fase.campo_inicio];
                  const dataFim = lancamento[fase.campo_fim];
                  const posicao = calcularPosicao(dataInicio);
                  const largura = calcularLargura(dataInicio, dataFim);
                  const dias = calcularDiasFase(dataInicio, dataFim);

                  return (
                    <div key={fase.nome} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">{fase.nome}</div>
                      
                      <div className="flex-1 relative h-8">
                        {dataInicio && dataFim && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-6 rounded ${fase.cor} opacity-80 hover:opacity-100 cursor-pointer transition-opacity flex items-center justify-center group`}
                                style={{ 
                                  left: `${posicao}%`,
                                  width: `${largura}%`,
                                  minWidth: '40px'
                                }}
                                onClick={() => handleEditPhase(fase)}
                              >
                                <Edit className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">{fase.nome}</div>
                                <div>Início: {format(parseISO(dataInicio), 'dd/MM/yyyy', { locale: ptBR })}</div>
                                <div>Fim: {format(parseISO(dataFim), 'dd/MM/yyyy', { locale: ptBR })}</div>
                                <div>Duração: {dias} dias</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="w-16 text-xs text-muted-foreground text-right">
                        {dias > 0 ? `${dias}d` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                {fases.map((fase) => (
                  <div key={fase.nome} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${fase.cor}`}></div>
                    <span className="text-sm">{fase.nome}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-sm">Hoje</span>
                </div>
              </div>
            </div>
          )}

          {tipoVisualizacao === 'calendario' && renderCalendarioView()}
          {tipoVisualizacao === 'timeline' && renderTimelineView()}
        </CardContent>
      </Card>

      {/* Modal de edição de fase */}
      <Dialog open={!!editingPhase} onOpenChange={() => setEditingPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {editingPhase?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inicio">Data de Início</Label>
              <Input
                id="inicio"
                type="date"
                value={tempDates.inicio}
                onChange={(e) => setTempDates(prev => ({ ...prev, inicio: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="fim">Data de Fim</Label>
              <Input
                id="fim"
                type="date"
                value={tempDates.fim}
                onChange={(e) => setTempDates(prev => ({ ...prev, fim: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingPhase(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePhase}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}