import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, DollarSign, Target, TrendingUp, MessageCircle, Edit, Save, X, Calculator, BarChart3, FileText, User, Users, Megaphone, CalendarDays, Clock, ExternalLink, Copy, Link as LinkIcon } from "lucide-react";
import { createPublicSupabaseClient } from "@/lib/supabase-public";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { toast } from "sonner";
import { differenceInDays, parseISO, format, formatDistanceToNow, isBefore, isAfter, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VerbaFaseItem {
  percentual: number;
  dias?: number;
}

interface VerbaFase {
  captacao?: VerbaFaseItem;
  aquecimento?: VerbaFaseItem;
  evento?: VerbaFaseItem;
  lembrete?: VerbaFaseItem;
  impulsionar?: VerbaFaseItem;
  venda?: VerbaFaseItem;
  [key: string]: VerbaFaseItem | undefined;
}

interface DistribuicaoCanais {
  meta_ads?: { percentual: number };
  google_ads?: { percentual: number };
  outras_fontes?: { percentual: number };
  [key: string]: { percentual: number } | undefined;
}

// Componente para exibir próximo evento com countdown
const ProximoEventoCard = ({ lancamento }: { lancamento: any }) => {
  const [countdown, setCountdown] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0 });
  
  // Determinar qual é o próximo evento importante
  const getProximoEvento = () => {
    const hoje = new Date();
    const eventos = [
      { nome: 'Início da Captação', data: lancamento.data_inicio_captacao, cor: 'blue' },
      { nome: 'Fim da Captação', data: lancamento.data_fim_captacao, cor: 'blue' },
      { nome: 'Início do Aquecimento', data: lancamento.data_inicio_aquecimento, cor: 'purple' },
      { nome: 'Primeira Aula (CPL)', data: lancamento.data_inicio_cpl, cor: 'green' },
      { nome: 'Fim do CPL', data: lancamento.data_fim_cpl, cor: 'green' },
      { nome: 'Abertura do Carrinho', data: lancamento.data_inicio_carrinho, cor: 'orange' },
      { nome: 'Fechamento', data: lancamento.data_fechamento, cor: 'red' },
    ].filter(e => e.data);

    // Encontrar o próximo evento (data >= hoje)
    for (const evento of eventos) {
      const dataEvento = parseISO(evento.data);
      if (isToday(dataEvento)) {
        return { ...evento, status: 'hoje', dataEvento };
      }
      if (isAfter(dataEvento, hoje)) {
        return { ...evento, status: 'futuro', dataEvento };
      }
    }
    
    // Se não há eventos futuros, retornar o último evento (lançamento finalizado)
    if (eventos.length > 0) {
      const ultimoEvento = eventos[eventos.length - 1];
      return { ...ultimoEvento, status: 'passado', dataEvento: parseISO(ultimoEvento.data) };
    }
    
    return null;
  };

  const proximoEvento = getProximoEvento();

  useEffect(() => {
    if (!proximoEvento || proximoEvento.status === 'passado') return;

    const calcularCountdown = () => {
      const agora = new Date();
      const diff = proximoEvento.dataEvento.getTime() - agora.getTime();
      
      if (diff <= 0) {
        setCountdown({ dias: 0, horas: 0, minutos: 0, segundos: 0 });
        return;
      }

      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ dias, horas, minutos, segundos });
    };

    calcularCountdown();
    const interval = setInterval(calcularCountdown, 1000);
    return () => clearInterval(interval);
  }, [proximoEvento]);

  if (!proximoEvento) return null;

  const corClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <Card className={`border-2 ${proximoEvento.status === 'hoje' ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20' : 'border-primary/30'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          Próximo Evento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${corClasses[proximoEvento.cor]}`} />
            <div>
              <h4 className="font-bold text-lg">{proximoEvento.nome}</h4>
              <p className="text-sm text-muted-foreground">
                {format(proximoEvento.dataEvento, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {proximoEvento.status === 'hoje' && (
            <Badge className="bg-yellow-500 text-white animate-pulse">
              🎉 Hoje é o dia!
            </Badge>
          )}

          {proximoEvento.status === 'futuro' && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{countdown.dias}</div>
                <div className="text-xs text-muted-foreground">dias</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{countdown.horas}</div>
                <div className="text-xs text-muted-foreground">horas</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{countdown.minutos}</div>
                <div className="text-xs text-muted-foreground">min</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{countdown.segundos}</div>
                <div className="text-xs text-muted-foreground">seg</div>
              </div>
            </div>
          )}

          {proximoEvento.status === 'passado' && (
            <Badge variant="secondary">Lançamento Finalizado</Badge>
          )}

          {proximoEvento.status === 'futuro' && (
            <p className="text-sm text-muted-foreground text-center">
              Faltam {formatDistanceToNow(proximoEvento.dataEvento, { locale: ptBR })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function LancamentoPublico() {
  const { linkPublico } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lancamento, setLancamento] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingVerbas, setEditingVerbas] = useState(false);
  const [verbas, setVerbas] = useState<VerbaFase>({});
  const [canais, setCanais] = useState<DistribuicaoCanais>({
    meta_ads: { percentual: 70 },
    google_ads: { percentual: 20 },
    outras_fontes: { percentual: 10 }
  });
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, [linkPublico]);

  const carregarDados = async () => {
    try {
      const publicSupabase = createPublicSupabaseClient();
      
      const { data: lancData, error: lancError } = await publicSupabase
        .from('lancamentos')
        .select('*, clientes(nome, whatsapp_grupo_url), colaboradores!lancamentos_gestor_id_fkey(nome)')
        .eq('link_publico', linkPublico)
        .eq('link_publico_ativo', true)
        .single();

      if (lancError) throw lancError;
      
      setLancamento(lancData);
      setCliente(lancData?.clientes);
      
      const verbaData = lancData?.verba_por_fase;
      const processedVerbas = calcularVerbas(lancData, verbaData);
      setVerbas(processedVerbas);
      
      const canaisData = lancData?.distribuicao_canais;
      if (canaisData && typeof canaisData === 'object' && !Array.isArray(canaisData)) {
        setCanais(canaisData as unknown as DistribuicaoCanais);
      }
      
      // Carregar links úteis
      if (lancData?.id) {
        const { data: linksData } = await publicSupabase
          .from('lancamento_links')
          .select('*')
          .eq('lancamento_id', lancData.id)
          .order('ordem');
        setLinks(linksData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar lançamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDiasFase = (dataInicio: string | null, dataFim: string | null) => {
    if (!dataInicio || !dataFim) return 0;
    return Math.max(1, differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1);
  };

  const calcularVerbas = (lanc: any, verbaData: any): VerbaFase => {
    const baseVerbas: VerbaFase = verbaData && typeof verbaData === 'object' && !Array.isArray(verbaData)
      ? (verbaData as unknown as VerbaFase)
      : {
          captacao: { percentual: 40, dias: 0 },
          aquecimento: { percentual: 10, dias: 0 },
          evento: { percentual: 30, dias: 0 },
          lembrete: { percentual: 10, dias: 0 },
          impulsionar: { percentual: 5, dias: 0 },
          venda: { percentual: 5, dias: 0 }
        };

    if (lanc) {
      if (baseVerbas.captacao) {
        baseVerbas.captacao.dias = calcularDiasFase(lanc.data_inicio_captacao, lanc.data_fim_captacao);
      }
      if (baseVerbas.aquecimento) {
        baseVerbas.aquecimento.dias = calcularDiasFase(lanc.data_inicio_aquecimento, lanc.data_fim_aquecimento);
      }
      if (baseVerbas.evento) {
        baseVerbas.evento.dias = calcularDiasFase(lanc.data_inicio_cpl, lanc.data_fim_cpl);
      }
      if (baseVerbas.lembrete) {
        baseVerbas.lembrete.dias = calcularDiasFase(lanc.data_inicio_lembrete, lanc.data_fim_lembrete);
      }
      if (baseVerbas.impulsionar) {
        baseVerbas.impulsionar.dias = 1;
      }
      if (baseVerbas.venda) {
        baseVerbas.venda.dias = calcularDiasFase(lanc.data_inicio_carrinho, lanc.data_fechamento);
      }
    }

    return baseVerbas;
  };

  const handleSaveVerbas = async () => {
    if (!lancamento || !user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({ 
          verba_por_fase: verbas as any,
          distribuicao_canais: canais as any
        })
        .eq('id', lancamento.id);

      if (error) throw error;

      setLancamento((prev: any) => ({ 
        ...prev, 
        verba_por_fase: verbas,
        distribuicao_canais: canais 
      }));
      setEditingVerbas(false);
      toast.success('Distribuição de verba atualizada!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao salvar: ' + message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerbaChange = (fase: string, valor: number) => {
    setVerbas(prev => ({
      ...prev,
      [fase]: { ...prev[fase], percentual: valor }
    }));
  };

  const handleCanalChange = (canal: string, valor: number) => {
    setCanais(prev => ({
      ...prev,
      [canal]: { percentual: valor }
    }));
  };

  const calcularDiasRestantes = () => {
    if (!lancamento) return 0;
    const hoje = new Date();
    const dataFim = new Date(lancamento.data_fim_captacao || lancamento.data_fechamento || hoje);
    return Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      em_captacao: 'bg-blue-500',
      cpl: 'bg-orange-500',
      remarketing: 'bg-purple-500',
      finalizado: 'bg-green-500',
      pausado: 'bg-gray-500',
      cancelado: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      em_captacao: 'Em Captação',
      cpl: 'CPL',
      remarketing: 'Remarketing',
      finalizado: 'Finalizado',
      pausado: 'Pausado',
      cancelado: 'Cancelado',
    };
    return labels[status] || status;
  };

  const fasesNomes: Record<string, string> = {
    captacao: "Captação",
    aquecimento: "Aquecimento",
    evento: "Evento",
    lembrete: "Lembrete",
    impulsionar: "Impulsionar",
    venda: "Venda"
  };

  const fasesCores: Record<string, string> = {
    captacao: '#2563EB',
    aquecimento: '#7C3AED',
    evento: '#10B981',
    lembrete: '#F59E0B',
    impulsionar: '#EF4444',
    venda: '#8B5CF6'
  };

  const canaisNomes: Record<string, string> = {
    meta_ads: 'META ADS',
    google_ads: 'GOOGLE ADS',
    outras_fontes: 'OUTRAS FONTES'
  };

  const canaisCores: Record<string, string> = {
    meta_ads: '#1877F2',
    google_ads: '#4285F4',
    outras_fontes: '#8B5CF6'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lancamento) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Lançamento não encontrado</h1>
        <p className="text-muted-foreground">Este link pode estar desativado ou não existe.</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const diasRestantes = calcularDiasRestantes();
  const totalPercentualVerbas = Object.values(verbas).reduce((sum, fase: any) => sum + (fase?.percentual || 0), 0);
  const totalPercentualCanais = Object.values(canais).reduce((sum, canal: any) => sum + (canal?.percentual || 0), 0);
  const diasTotalCampanha = Object.values(verbas).reduce((sum, fase: any) => sum + (fase?.dias || 0), 0);

  return (
    <>
      <Helmet>
        <title>{`${lancamento.nome_lancamento} - ${cliente?.nome || 'Lançamento'}`}</title>
        <meta name="description" content={lancamento.descricao || `Acompanhe o lançamento ${lancamento.nome_lancamento}`} />
        <meta property="og:title" content={lancamento.nome_lancamento} />
        <meta property="og:description" content={lancamento.descricao || `Lançamento ${lancamento.nome_lancamento}`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">{lancamento.nome_lancamento}</h1>
                {cliente && (
                  <p className="text-lg text-muted-foreground">{cliente.nome}</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Badge className={`${getStatusColor(lancamento.status_lancamento)} text-white w-fit`}>
                  {getStatusLabel(lancamento.status_lancamento)}
                </Badge>
                {diasRestantes > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <strong>{diasRestantes}</strong> dias restantes
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid principal - Informações Básicas + Próximo Evento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Informações Básicas */}
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nome e Status */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Nome do Lançamento</div>
                      <h3 className="text-lg font-bold">{lancamento.nome_lancamento}</h3>
                    </div>
                    <Badge className={getStatusColor(lancamento.status_lancamento) + ' text-white'}>
                      {getStatusLabel(lancamento.status_lancamento)}
                    </Badge>
                  </div>
                </div>

                {/* Grid de informações - 2 colunas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Tipo de Aulas</div>
                      <div className="text-sm font-medium truncate">
                        {lancamento.tipo_aulas === 'ao_vivo' ? 'Ao Vivo' : lancamento.tipo_aulas || 'Não informado'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Megaphone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Tipo de Lançamento</div>
                      <div className="text-sm font-medium truncate">
                        {lancamento.tipo_lancamento === 'tradicional' ? 'Tradicional' : lancamento.tipo_lancamento || 'Não informado'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Gestor</div>
                      <div className="text-sm font-medium truncate">
                        {lancamento.colaboradores?.nome || 'Não atribuído'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Cliente</div>
                      <div className="text-sm font-medium truncate">{cliente?.nome || 'Não informado'}</div>
                    </div>
                  </div>
                </div>

                {/* Promessa */}
                {lancamento.promessa && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Promessa</div>
                    <p className="text-sm">{lancamento.promessa}</p>
                  </div>
                )}

                {/* Metas e Valores */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Metas e Valores</div>
                  <div className="grid grid-cols-2 gap-3">
                    {lancamento.ticket_produto && (
                      <div className="p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">Ticket Produto</div>
                        <div className="text-sm font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.ticket_produto)}
                        </div>
                      </div>
                    )}
                    {lancamento.leads_desejados && (
                      <div className="p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">Leads Desejados</div>
                        <div className="text-sm font-bold">{lancamento.leads_desejados.toLocaleString('pt-BR')}</div>
                      </div>
                    )}
                    {lancamento.meta_custo_lead && (
                      <div className="p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">Meta CPL</div>
                        <div className="text-sm font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.meta_custo_lead)}
                        </div>
                      </div>
                    )}
                    {lancamento.investimento_total && (
                      <div className="p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">Investimento Total</div>
                        <div className="text-sm font-bold text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.investimento_total)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Público-alvo */}
                {lancamento.publico_alvo && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Público-Alvo</div>
                      <div className="text-sm font-medium">{lancamento.publico_alvo}</div>
                    </div>
                  </div>
                )}

                {/* Observações */}
                {lancamento.observacoes && (
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Observações</div>
                    <p className="text-sm text-muted-foreground">{lancamento.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Próximo Evento + Datas */}
            <div className="space-y-6">
              {/* Card de Próximo Evento com Countdown */}
              <ProximoEventoCard lancamento={lancamento} />

              {/* Datas do Lançamento */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4" />
                    Datas do Lançamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lancamento.data_inicio_captacao && (
                    <div className="flex justify-between items-center p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <span className="text-xs text-muted-foreground">Início Captação</span>
                      <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_captacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  {lancamento.data_fim_captacao && (
                    <div className="flex justify-between items-center p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <span className="text-xs text-muted-foreground">Fim Captação</span>
                      <span className="text-xs font-medium">{format(parseISO(lancamento.data_fim_captacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  {lancamento.data_inicio_aquecimento && (
                    <div className="flex justify-between items-center p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <span className="text-xs text-muted-foreground">Início Aquecimento</span>
                      <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_aquecimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  {lancamento.data_inicio_cpl && (
                    <div className="flex justify-between items-center p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <span className="text-xs text-muted-foreground">Início CPL (Primeira Aula)</span>
                      <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_cpl), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  {lancamento.data_fim_cpl && (
                    <div className="flex justify-between items-center p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <span className="text-xs text-muted-foreground">Fim CPL</span>
                      <span className="text-xs font-medium">{format(parseISO(lancamento.data_fim_cpl), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  {lancamento.data_inicio_carrinho && (
                    <div className="flex justify-between items-center p-2 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                      <span className="text-xs text-muted-foreground">Abertura Carrinho</span>
                      <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_carrinho), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  {lancamento.data_fechamento && (
                    <div className="flex justify-between items-center p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                      <span className="text-xs text-muted-foreground">Fechamento</span>
                      <span className="text-xs font-medium">{format(parseISO(lancamento.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Links Úteis */}
          {links.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Links Úteis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {links.map((link) => (
                    <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{link.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">{link.url}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await navigator.clipboard.writeText(link.url);
                            toast.success('Link copiado!');
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-8 w-8 p-0"
                        >
                          <a href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cálculo de Verbas */}
          {lancamento.investimento_total && (
            <div className="space-y-6 mb-6">
              {/* Header com botões */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Cálculo de Verbas</h3>
                {user && !editingVerbas && (
                  <Button variant="outline" size="sm" onClick={() => setEditingVerbas(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                {user && editingVerbas && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingVerbas(false);
                      const processedVerbas = calcularVerbas(lancamento, lancamento.verba_por_fase);
                      setVerbas(processedVerbas);
                      setCanais(lancamento.distribuicao_canais || {
                        meta_ads: { percentual: 70 },
                        google_ads: { percentual: 20 },
                        outras_fontes: { percentual: 10 }
                      });
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveVerbas} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Alertas de validação */}
              {totalPercentualVerbas > 100 && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Atenção: A soma das porcentagens de verbas está acima de 100% (Total: {totalPercentualVerbas.toFixed(1)}%)
                    </p>
                  </CardContent>
                </Card>
              )}

              {totalPercentualCanais > 100 && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Atenção: A soma das porcentagens de canais está acima de 100% (Total: {totalPercentualCanais.toFixed(1)}%)
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tabela de Verbas por Fase */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Distribuição por Fase
                    <Badge variant={totalPercentualVerbas === 100 ? "default" : totalPercentualVerbas > 100 ? "destructive" : "secondary"}>
                      Total: {totalPercentualVerbas}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Etapa</TableHead>
                        <TableHead>% Verba</TableHead>
                        <TableHead>Investimento Total (R$)</TableHead>
                        <TableHead>Investimento Diário (R$)</TableHead>
                        <TableHead>Quantidade de Dias</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(fasesNomes).map(([fase, nome]) => {
                        const percentual = verbas[fase]?.percentual || 0;
                        const dias = verbas[fase]?.dias || 0;
                        const investimentoTotal = lancamento.investimento_total * percentual / 100;
                        const investimentoDiario = dias > 0 ? investimentoTotal / dias : 0;
                        
                        return (
                          <TableRow key={fase}>
                            <TableCell className="font-medium">{nome}</TableCell>
                            <TableCell>
                              {editingVerbas ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={percentual}
                                    onChange={(e) => handleVerbaChange(fase, Number(e.target.value))}
                                    className="w-20"
                                    min={0}
                                    max={100}
                                  />
                                  <div 
                                    className="h-2 rounded-full" 
                                    style={{
                                      width: '60px',
                                      background: `linear-gradient(90deg, ${fasesCores[fase]} ${percentual}%, #E5E7EB ${percentual}%)`
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{percentual}%</span>
                                  <div 
                                    className="h-2 rounded-full" 
                                    style={{
                                      width: '60px',
                                      background: `linear-gradient(90deg, ${fasesCores[fase]} ${percentual}%, #E5E7EB ${percentual}%)`
                                    }}
                                  />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              R$ {investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              R$ {investimentoDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{dias} dias</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Tabela de Distribuição por Canal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Distribuição por Canal
                    <Badge variant={totalPercentualCanais === 100 ? "default" : "destructive"}>
                      Total: {totalPercentualCanais}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Canal</TableHead>
                        <TableHead>% Distribuição</TableHead>
                        <TableHead>Valor (R$)</TableHead>
                        <TableHead>Valor Diário Médio (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(canaisNomes).map(([canal, nome]) => {
                        const percentual = canais[canal]?.percentual || 0;
                        const valorTotal = lancamento.investimento_total * percentual / 100;
                        const valorDiario = diasTotalCampanha > 0 ? valorTotal / diasTotalCampanha : 0;
                        
                        return (
                          <TableRow key={canal}>
                            <TableCell className="font-medium">{nome}</TableCell>
                            <TableCell>
                              {editingVerbas ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={percentual}
                                    onChange={(e) => handleCanalChange(canal, Number(e.target.value))}
                                    className="w-20"
                                    min={0}
                                    max={100}
                                  />
                                  <div 
                                    className="h-2 rounded-full" 
                                    style={{
                                      width: '60px',
                                      background: `linear-gradient(90deg, ${canaisCores[canal]} ${percentual}%, #E5E7EB ${percentual}%)`
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{percentual}%</span>
                                  <div 
                                    className="h-2 rounded-full" 
                                    style={{
                                      width: '60px',
                                      background: `linear-gradient(90deg, ${canaisCores[canal]} ${percentual}%, #E5E7EB ${percentual}%)`
                                    }}
                                  />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              R$ {valorDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Metas */}
          {(lancamento.meta_custo_lead || lancamento.meta_investimento) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Metas do Lançamento
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lancamento.meta_custo_lead && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Meta CPL</p>
                    <p className="text-xl font-semibold">
                      R$ {Number(lancamento.meta_custo_lead).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {lancamento.meta_investimento && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Meta de Investimento</p>
                    <p className="text-xl font-semibold">
                      R$ {Number(lancamento.meta_investimento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* WhatsApp */}
          {cliente?.whatsapp_grupo_url && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <Button 
                  asChild 
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <a href={cliente.whatsapp_grupo_url} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Entrar no Grupo do WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
