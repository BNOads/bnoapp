import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, DollarSign, Target, TrendingUp, MessageCircle, Edit, Save, X } from "lucide-react";
import { createPublicSupabaseClient } from "@/lib/supabase-public";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { toast } from "sonner";

interface VerbaFaseItem {
  percentual: number;
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

export default function LancamentoPublico() {
  const { linkPublico } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lancamento, setLancamento] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingVerbas, setEditingVerbas] = useState(false);
  const [verbas, setVerbas] = useState<VerbaFase>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [linkPublico]);

  const carregarDados = async () => {
    try {
      const publicSupabase = createPublicSupabaseClient();
      
      // Buscar por link_publico (slug) ao invés de id
      const { data: lancData, error: lancError } = await publicSupabase
        .from('lancamentos')
        .select('*, clientes(nome, whatsapp_grupo_url)')
        .eq('link_publico', linkPublico)
        .eq('link_publico_ativo', true)
        .single();

      if (lancError) throw lancError;
      
      setLancamento(lancData);
      setCliente(lancData?.clientes);
      const verbaData = lancData?.verba_por_fase;
      setVerbas(verbaData && typeof verbaData === 'object' && !Array.isArray(verbaData) 
        ? (verbaData as unknown as VerbaFase) 
        : {});
    } catch (error) {
      console.error('Erro ao carregar lançamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVerbas = async () => {
    if (!lancamento || !user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({ verba_por_fase: verbas as any })
        .eq('id', lancamento.id);

      if (error) throw error;

      setLancamento((prev: any) => ({ ...prev, verba_por_fase: verbas }));
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
      [fase]: { percentual: valor }
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
    captacao: "bg-blue-500",
    aquecimento: "bg-purple-500",
    evento: "bg-yellow-500",
    lembrete: "bg-orange-500",
    impulsionar: "bg-pink-500",
    venda: "bg-green-500"
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
  const totalPercentual = Object.values(verbas).reduce((sum, fase: any) => sum + (fase?.percentual || 0), 0);

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

          {/* Distribuição de Verba */}
          {lancamento.investimento_total && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Distribuição de Verba
                    {totalPercentual !== 100 && (
                      <Badge variant={totalPercentual > 100 ? "destructive" : "secondary"}>
                        {totalPercentual}%
                      </Badge>
                    )}
                  </CardTitle>
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
                        setVerbas(lancamento.verba_por_fase || {});
                      }}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSaveVerbas} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(fasesNomes).map(([fase, nome]) => {
                    const percentual = (verbas as any)[fase]?.percentual || 0;
                    const valor = lancamento.investimento_total * (percentual / 100);
                    
                    return (
                      <div key={fase} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${fasesCores[fase]}`}></div>
                          <span className="text-sm font-medium">{nome}</span>
                        </div>
                        {editingVerbas ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={percentual}
                              onChange={(e) => handleVerbaChange(fase, Number(e.target.value))}
                              className="w-20 h-8"
                              min={0}
                              max={100}
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-lg font-semibold">
                              R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-muted-foreground">{percentual}%</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
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
