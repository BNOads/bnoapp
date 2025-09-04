import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, ZoomIn, ZoomOut } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lancamento {
  id: string;
  nome_lancamento: string;
  gestor_responsavel: string;
  status_lancamento: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao?: string;
  datas_cpls?: string[];
  data_inicio_remarketing?: string;
  data_fim_remarketing?: string;
  investimento_total: number;
  colaboradores?: {
    nome: string;
    avatar_url?: string;
  };
}

interface GanttChartProps {
  lancamentos: Lancamento[];
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}

const GanttChart: React.FC<GanttChartProps> = ({
  lancamentos,
  statusColors,
  statusLabels
}) => {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroGestor, setFiltroGestor] = useState('todos');
  const [escalaVisao, setEscalaVisao] = useState<'mensal' | 'semanal' | 'diaria'>('mensal');

  // Calcular intervalo de datas
  const { dataInicio, dataFim, diasNoIntervalo } = useMemo(() => {
    if (lancamentos.length === 0) {
      const hoje = new Date();
      return {
        dataInicio: startOfMonth(hoje),
        dataFim: endOfMonth(hoje),
        diasNoIntervalo: []
      };
    }

    const todasDatas = lancamentos.flatMap(l => [
      new Date(l.data_inicio_captacao),
      l.data_fim_captacao ? new Date(l.data_fim_captacao) : null,
      l.data_inicio_remarketing ? new Date(l.data_inicio_remarketing) : null,
      l.data_fim_remarketing ? new Date(l.data_fim_remarketing) : null,
      ...(l.datas_cpls || []).map(d => new Date(d))
    ].filter(Boolean) as Date[]);

    const dataMin = new Date(Math.min(...todasDatas.map(d => d.getTime())));
    const dataMax = new Date(Math.max(...todasDatas.map(d => d.getTime())));

    const inicio = subDays(startOfMonth(dataMin), 7);
    const fim = addDays(endOfMonth(dataMax), 7);

    return {
      dataInicio: inicio,
      dataFim: fim,
      diasNoIntervalo: eachDayOfInterval({ start: inicio, end: fim })
    };
  }, [lancamentos]);

  // Filtrar lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      if (filtroStatus && filtroStatus !== 'todos' && l.status_lancamento !== filtroStatus) return false;
      if (filtroGestor && filtroGestor !== 'todos' && l.gestor_responsavel !== filtroGestor) return false;
      return true;
    });
  }, [lancamentos, filtroStatus, filtroGestor]);

  // Gestores únicos para filtro
  const gestores = useMemo(() => {
    const gestoresUnicos = new Map();
    lancamentos.forEach(l => {
      if (l.colaboradores) {
        gestoresUnicos.set(l.gestor_responsavel, l.colaboradores.nome);
      }
    });
    return Array.from(gestoresUnicos.entries()).map(([id, nome]) => ({ id, nome }));
  }, [lancamentos]);

  const calcularPosicao = (data: string) => {
    const dataObj = new Date(data);
    const dias = differenceInDays(dataObj, dataInicio);
    const totalDias = differenceInDays(dataFim, dataInicio);
    return (dias / totalDias) * 100;
  };

  const calcularLargura = (inicio: string, fim?: string) => {
    const dataInicioObj = new Date(inicio);
    const dataFimObj = fim ? new Date(fim) : addDays(dataInicioObj, 7); // Default 7 dias se não tiver fim
    const dias = Math.max(1, differenceInDays(dataFimObj, dataInicioObj));
    const totalDias = differenceInDays(dataFim, dataInicio);
    return Math.max(2, (dias / totalDias) * 100);
  };

  const formatarDataHeader = (data: Date) => {
    switch (escalaVisao) {
      case 'diaria':
        return format(data, 'dd/MM', { locale: ptBR });
      case 'semanal':
        return format(data, 'dd/MM', { locale: ptBR });
      case 'mensal':
        return format(data, 'MMM/yy', { locale: ptBR });
      default:
        return format(data, 'dd/MM', { locale: ptBR });
    }
  };

  const obterDivisoesTempo = () => {
    const divisoes = [];
    const totalDias = differenceInDays(dataFim, dataInicio);
    
    switch (escalaVisao) {
      case 'diaria':
        for (let i = 0; i < totalDias; i += 1) {
          const data = addDays(dataInicio, i);
          divisoes.push({
            data,
            posicao: (i / totalDias) * 100,
            largura: (1 / totalDias) * 100
          });
        }
        break;
      case 'semanal':
        for (let i = 0; i < totalDias; i += 7) {
          const data = addDays(dataInicio, i);
          divisoes.push({
            data,
            posicao: (i / totalDias) * 100,
            largura: (7 / totalDias) * 100
          });
        }
        break;
      case 'mensal':
        let dataAtual = startOfMonth(dataInicio);
        while (dataAtual <= dataFim) {
          const inicioMes = Math.max(0, differenceInDays(dataAtual, dataInicio));
          const fimMes = Math.min(totalDias, differenceInDays(endOfMonth(dataAtual), dataInicio));
          
          divisoes.push({
            data: dataAtual,
            posicao: (inicioMes / totalDias) * 100,
            largura: ((fimMes - inicioMes) / totalDias) * 100
          });
          
          dataAtual = addDays(endOfMonth(dataAtual), 1);
        }
        break;
    }
    
    return divisoes;
  };

  const divisoesTempo = obterDivisoesTempo();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma de Lançamentos (Gantt)
            </CardTitle>
            <CardDescription>
              Visualização temporal dos lançamentos e suas fases
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="em_captacao">Em Captação</SelectItem>
                <SelectItem value="cpl">CPL</SelectItem>
                <SelectItem value="remarketing">Remarketing</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroGestor} onValueChange={setFiltroGestor}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por gestor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os gestores</SelectItem>
                {gestores
                  .filter(gestor => gestor.id && gestor.id.trim() !== '') // Filtrar IDs vazios
                  .map((gestor) => (
                    <SelectItem key={gestor.id} value={gestor.id}>
                      {gestor.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={escalaVisao} onValueChange={(value: any) => setEscalaVisao(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Cabeçalho do Cronograma */}
          <div className="relative h-8 bg-muted rounded border-b">
            {divisoesTempo.map((divisao, index) => (
              <div
                key={index}
                className="absolute top-0 h-full flex items-center justify-center text-xs font-medium border-r border-border/50"
                style={{
                  left: `${divisao.posicao}%`,
                  width: `${divisao.largura}%`
                }}
              >
                {formatarDataHeader(divisao.data)}
              </div>
            ))}
          </div>

          {/* Lista de Lançamentos */}
          <div className="space-y-2">
            {lancamentosFiltrados.map((lancamento, index) => (
              <div key={lancamento.id} className="relative">
                {/* Informações do Lançamento */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-64 flex-shrink-0">
                    <div className="font-medium text-sm">{lancamento.nome_lancamento}</div>
                    <div className="text-xs text-muted-foreground">
                      {lancamento.colaboradores?.nome}
                    </div>
                  </div>
                  
                  <Badge
                    variant="secondary"
                    className={`${statusColors[lancamento.status_lancamento]} text-white text-xs`}
                  >
                    {statusLabels[lancamento.status_lancamento]}
                  </Badge>
                </div>

                {/* Barra de Cronograma */}
                <div className="relative h-8 bg-gray-50 rounded border ml-64">
                  {/* Período de Captação */}
                  <div
                    className="absolute top-1 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-medium opacity-80"
                    style={{
                      left: `${calcularPosicao(lancamento.data_inicio_captacao)}%`,
                      width: `${calcularLargura(lancamento.data_inicio_captacao, lancamento.data_fim_captacao)}%`
                    }}
                    title={`Captação: ${format(new Date(lancamento.data_inicio_captacao), 'dd/MM/yyyy')} ${
                      lancamento.data_fim_captacao ? `- ${format(new Date(lancamento.data_fim_captacao), 'dd/MM/yyyy')}` : ''
                    }`}
                  >
                    Captação
                  </div>

                  {/* Datas de CPL */}
                  {lancamento.datas_cpls?.map((dataCpl, cplIndex) => (
                    <div
                      key={cplIndex}
                      className="absolute top-0 w-1 h-8 bg-orange-500 rounded"
                      style={{
                        left: `${calcularPosicao(dataCpl)}%`
                      }}
                      title={`CPL: ${format(new Date(dataCpl), 'dd/MM/yyyy')}`}
                    />
                  ))}

                  {/* Período de Remarketing */}
                  {lancamento.data_inicio_remarketing && (
                    <div
                      className="absolute top-1 h-6 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-medium opacity-80"
                      style={{
                        left: `${calcularPosicao(lancamento.data_inicio_remarketing)}%`,
                        width: `${calcularLargura(lancamento.data_inicio_remarketing, lancamento.data_fim_remarketing)}%`
                      }}
                      title={`Remarketing: ${format(new Date(lancamento.data_inicio_remarketing), 'dd/MM/yyyy')} ${
                        lancamento.data_fim_remarketing ? `- ${format(new Date(lancamento.data_fim_remarketing), 'dd/MM/yyyy')}` : ''
                      }`}
                    >
                      Remarketing
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {lancamentosFiltrados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lançamento encontrado com os filtros aplicados
            </div>
          )}

          {/* Legenda */}
          <div className="flex items-center gap-6 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Captação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>CPL</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>Remarketing</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;