import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, Edit } from "lucide-react";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, differenceInDays, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type EscalaVisao = 'dia' | 'semana' | 'mes';

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
    nome: "CPL", 
    dataInicio: null,
    dataFim: null,
    cor: "bg-green-500",
    campo_inicio: "data_inicio_cpl" as any,
    campo_fim: "data_fim_cpl" as any
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
  const [editingPhase, setEditingPhase] = useState<FaseLancamento | null>(null);
  const [tempDates, setTempDates] = useState<{ inicio: string; fim: string }>({ inicio: '', fim: '' });

  // Calcular intervalo de datas e pontos no tempo
  const { dataInicio, dataFim, pontosNoTempo } = useMemo(() => {
    if (!lancamento?.data_inicio_captacao) {
      return { dataInicio: new Date(), dataFim: new Date(), pontosNoTempo: [] };
    }

    const todasDatas = [
      lancamento.data_inicio_captacao,
      lancamento.data_fim_captacao,
      lancamento.data_inicio_cpl,
      lancamento.data_fim_cpl,
      lancamento.data_inicio_carrinho,
      lancamento.data_fim_carrinho,
      lancamento.data_fechamento
    ].filter(Boolean).map(d => parseISO(d));

    const minData = new Date(Math.min(...todasDatas.map(d => d.getTime())));
    const maxData = new Date(Math.max(...todasDatas.map(d => d.getTime())));
    
    // Adicionar margem
    const inicio = addDays(minData, -7);
    const fim = addDays(maxData, 7);

    const pontos: Date[] = [];
    let atual = inicio;

    while (atual <= fim) {
      pontos.push(new Date(atual));
      
      if (escalaVisao === 'dia') {
        atual = addDays(atual, 1);
      } else if (escalaVisao === 'semana') {
        atual = addDays(atual, 7);
      } else {
        atual = addDays(startOfMonth(addDays(atual, 32)), 0);
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

  const posicaoHoje = useMemo(() => {
    const hoje = new Date();
    const totalDias = differenceInDays(dataFim, dataInicio);
    const diasDoInicio = differenceInDays(hoje, dataInicio);
    return Math.max(0, Math.min(100, (diasDoInicio / totalDias) * 100));
  }, [dataInicio, dataFim]);

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

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma Gantt
            </CardTitle>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Cabeçalho com datas */}
            <div className="relative">
              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground mb-2">
                {pontosNoTempo.slice(0, 12).map((data, index) => (
                  <div key={index} className="text-center">
                    {formatarDataHeader(data)}
                  </div>
                ))}
              </div>
              
              {/* Timeline base */}
              <div className="relative h-2 bg-muted rounded mb-4">
                {/* Linha do "hoje" */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${posicaoHoje}%` }}
                >
                  <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                  <div className="absolute -bottom-6 -left-4 text-xs text-red-500 font-medium">
                    Hoje
                  </div>
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
        </CardContent>
      </Card>

      {/* Modal de edição */}
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