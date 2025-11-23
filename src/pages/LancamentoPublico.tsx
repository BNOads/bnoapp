import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, DollarSign, Target, TrendingUp, MessageCircle } from "lucide-react";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

export default function LancamentoPublico() {
  const { linkPublico } = useParams();
  const navigate = useNavigate();
  const [lancamento, setLancamento] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [linkPublico]);

  const carregarDados = async () => {
    try {
      const publicSupabase = createPublicSupabaseClient();
      
      // Buscar por ID ao invés de link_publico customizado
      const { data: lancData, error: lancError } = await publicSupabase
        .from('lancamentos')
        .select('*, clientes(nome, whatsapp_grupo_url)')
        .eq('id', linkPublico)
        .eq('link_publico_ativo', true)
        .single();

      if (lancError) throw lancError;
      
      setLancamento(lancData);
      setCliente(lancData?.clientes);
    } catch (error) {
      console.error('Erro ao carregar lançamento:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      <Helmet>
        <title>{`${lancamento.nome_lancamento} - ${cliente?.nome || 'Lançamento'}`}</title>
        <meta name="description" content={lancamento.descricao || `Acompanhe o lançamento ${lancamento.nome_lancamento}`} />
        <meta property="og:title" content={lancamento.nome_lancamento} />
        <meta property="og:description" content={lancamento.descricao || `Lançamento ${lancamento.nome_lancamento}`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
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

          {/* Promessa */}
          {lancamento.promessa && (
            <Card className="mb-6 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Promessa do Lançamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{lancamento.promessa}</p>
              </CardContent>
            </Card>
          )}

          {/* Descrição */}
          {lancamento.descricao && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <p className="text-muted-foreground whitespace-pre-line">{lancamento.descricao}</p>
              </CardContent>
            </Card>
          )}

          {/* Informações principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Data de Início
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Date(lancamento.data_inicio_captacao).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            {lancamento.data_inicio_cpl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Início CPL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {new Date(lancamento.data_inicio_cpl).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            )}

            {lancamento.investimento_total && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Investimento Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {Number(lancamento.investimento_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            )}

            {lancamento.leads_desejados && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Leads Desejados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {Number(lancamento.leads_desejados).toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

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
