import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Share, FileText, TrendingUp, Target, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DebriefingDetalhes {
  id: string;
  cliente_nome: string;
  nome_lancamento: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: string;
  leads_total?: number;
  vendas_total?: number;
  investimento_total?: number;
  faturamento_total?: number;
  roas?: number;
  cpl?: number;
  ticket_medio?: number;
  conversao_lead_venda?: number;
  created_at: string;
}

export default function DebriefingDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [debriefing, setDebriefing] = useState<DebriefingDetalhes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDebriefing();
    }
  }, [id]);

  const fetchDebriefing = async () => {
    try {
      // Temporariamente usando dados mockados até os tipos serem atualizados
      const mockData: DebriefingDetalhes = {
        id: id || '1',
        cliente_nome: 'Cliente Exemplo',
        nome_lancamento: 'Lançamento Agosto 2025',
        periodo_inicio: '2025-08-01',
        periodo_fim: '2025-08-31',
        status: 'concluido',
        created_at: '2025-08-01T00:00:00Z',
        leads_total: 1250,
        vendas_total: 85,
        investimento_total: 15000,
        faturamento_total: 48000,
        roas: 3.2,
        cpl: 12.0,
        ticket_medio: 564.71,
        conversao_lead_venda: 0.068
      };
      setDebriefing(mockData);
    } catch (error) {
      console.error('Erro ao buscar debriefing:', error);
      toast.error('Erro ao carregar debriefing');
      navigate('/debriefings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho': return 'bg-yellow-100 text-yellow-800';
      case 'processando': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rascunho': return 'Rascunho';
      case 'processando': return 'Processando';
      case 'concluido': return 'Concluído';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!debriefing) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Debriefing não encontrado</h1>
          <Button onClick={() => navigate('/debriefings')}>
            Voltar para Debriefings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/debriefings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">{debriefing.nome_lancamento}</h1>
              <Badge className={getStatusColor(debriefing.status)}>
                {getStatusLabel(debriefing.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {debriefing.cliente_nome} • {new Date(debriefing.periodo_inicio).toLocaleDateString('pt-BR')} - {new Date(debriefing.periodo_fim).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline">
            <Share className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {debriefing.status === 'concluido' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Investimento Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefing.investimento_total ? formatCurrency(debriefing.investimento_total) : '-'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads Gerados</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{debriefing.leads_total || 0}</div>
                {debriefing.cpl && (
                  <p className="text-xs text-muted-foreground">
                    CPL: {formatCurrency(debriefing.cpl)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{debriefing.vendas_total || 0}</div>
                {debriefing.conversao_lead_venda && (
                  <p className="text-xs text-muted-foreground">
                    Conversão: {(debriefing.conversao_lead_venda * 100).toFixed(1)}%
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROAS</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefing.roas ? `${debriefing.roas.toFixed(2)}x` : '-'}
                </div>
                {debriefing.faturamento_total && (
                  <p className="text-xs text-muted-foreground">
                    Faturamento: {formatCurrency(debriefing.faturamento_total)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="evolucao">Evolução</TabsTrigger>
              <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
              <TabsTrigger value="qualitativo">Qualitativo</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance por Etapa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground">
                      Gráfico de barras - Investimento e Leads por etapa
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Plataforma</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground">
                      Gráfico de pizza - Investimento por plataforma
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="evolucao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Diária</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground">
                    Gráfico de linhas - Leads, Investimento, Vendas por dia
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campanhas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Campanhas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground">
                    Tabela com ranking de campanhas por performance
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qualitativo" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>O que funcionou</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground">
                      Pontos positivos identificados
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>O que ajustar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground">
                      Oportunidades de melhoria
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {debriefing.status === 'rascunho' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Debriefing em Rascunho</h3>
            <p className="text-muted-foreground text-center mb-4">
              Este debriefing ainda não foi processado. Faça o upload dos dados para continuar.
            </p>
            <Button onClick={() => navigate(`/debriefings/novo`)}>
              Continuar Configuração
            </Button>
          </CardContent>
        </Card>
      )}

      {debriefing.status === 'processando' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Processando Dados</h3>
            <p className="text-muted-foreground text-center">
              Estamos analisando os dados enviados. Isso pode levar alguns minutos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}