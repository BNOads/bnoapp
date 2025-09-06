import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Share, FileText, TrendingUp, Target, DollarSign, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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
  dados_leads?: any;
  dados_compradores?: any;
  dados_trafego?: any;
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
      const { data: debriefingData, error } = await supabase
        .from('debriefings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (debriefingData) {
        console.log('Dados do debriefing carregados:', debriefingData);
        setDebriefing({
          id: debriefingData.id,
          cliente_nome: debriefingData.cliente_nome,
          nome_lancamento: debriefingData.nome_lancamento,
          periodo_inicio: debriefingData.periodo_inicio,
          periodo_fim: debriefingData.periodo_fim,
          status: debriefingData.status,
          created_at: debriefingData.created_at,
          leads_total: debriefingData.leads_total,
          vendas_total: debriefingData.vendas_total,
          investimento_total: debriefingData.investimento_total,
          faturamento_total: debriefingData.faturamento_total,
          roas: debriefingData.roas,
          cpl: debriefingData.cpl,
          ticket_medio: debriefingData.ticket_medio,
          conversao_lead_venda: debriefingData.conversao_lead_venda,
          dados_leads: debriefingData.dados_leads,
          dados_compradores: debriefingData.dados_compradores,
          dados_trafego: debriefingData.dados_trafego
        });
      } else {
        console.log('Nenhum debriefing encontrado para o ID:', id);
        toast.error('Debriefing não encontrado');
        navigate('/debriefings');
      }
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

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/debriefing/publico/${id}`;
      if (navigator.share) {
        await navigator.share({
          title: `Debriefing - ${debriefing?.nome_lancamento}`,
          text: `Confira o debriefing do lançamento ${debriefing?.nome_lancamento}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link público copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('Erro ao compartilhar debriefing');
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Gerando PDF...');
      
      const { data, error } = await supabase.functions.invoke('gerar-pdf-debriefing', {
        body: { debriefing_id: id }
      });

      if (error) throw error;

      if (data?.pdf_url) {
        // Create a temporary link to download the PDF
        const link = document.createElement('a');
        link.href = data.pdf_url;
        link.download = data.filename || `debriefing_${debriefing?.nome_lancamento}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('PDF baixado com sucesso!');
      } else {
        toast.success('PDF gerado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('debriefings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Debriefing excluído com sucesso!');
      navigate('/debriefings');
    } catch (error) {
      console.error('Erro ao excluir debriefing:', error);
      toast.error('Erro ao excluir debriefing');
    }
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
          <Button variant="outline" onClick={handleShare}>
            <Share className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Debriefing</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este debriefing? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {debriefing.status === 'concluido' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefing.faturamento_total ? formatCurrency(debriefing.faturamento_total) : '-'}
                </div>
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
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo por Lead</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefing.cpl ? formatCurrency(debriefing.cpl) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {debriefing.leads_total} leads gerados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefing.conversao_lead_venda ? `${(debriefing.conversao_lead_venda * 100).toFixed(1)}%` : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {debriefing.vendas_total} vendas de {debriefing.leads_total} leads
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefing.ticket_medio ? formatCurrency(debriefing.ticket_medio) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Média por venda
                </p>
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
                    <CardTitle>Performance Resumo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        { name: 'Leads', value: debriefing.leads_total || 0, fill: '#8884d8' },
                        { name: 'Vendas', value: debriefing.vendas_total || 0, fill: '#82ca9d' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição Financeira</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Investimento', value: Number(debriefing.investimento_total) || 0, fill: '#ff7c7c' },
                            { name: 'Faturamento', value: Number(debriefing.faturamento_total) || 0, fill: '#8dd1e1' },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#ff7c7c" />
                          <Cell fill="#8dd1e1" />
                        </Pie>
                        <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="evolucao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Métricas Principais</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[
                      { name: 'CPL', value: Number(debriefing.cpl) || 0 },
                      { name: 'ROAS', value: Number(debriefing.roas) || 0 },
                      { name: 'Ticket Médio', value: Number(debriefing.ticket_medio) || 0 },
                      { name: 'Conv %', value: Number(debriefing.conversao_lead_venda) * 100 || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [Number(value).toFixed(2), '']} />
                      <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campanhas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dados de Tráfego</CardTitle>
                </CardHeader>
                <CardContent>
                  {debriefing.dados_trafego && debriefing.dados_trafego.length > 0 ? (
                    <div className="space-y-4">
                      {debriefing.dados_trafego.map((item: any, index: number) => (
                        <div key={index} className="border p-4 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Data:</span> {item.data}
                            </div>
                            <div>
                              <span className="font-medium">Investimento:</span> R$ {item.investimento}
                            </div>
                            <div>
                              <span className="font-medium">Plataforma:</span> {item.plataforma}
                            </div>
                            <div>
                              <span className="font-medium">Campanha:</span> {item.campanha}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      Nenhum dado de tráfego disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qualitativo" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados de Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {debriefing.dados_leads && debriefing.dados_leads.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debriefing.dados_leads.slice(0, 5).map((lead: any, index: number) => (
                          <div key={index} className="border p-2 rounded text-sm">
                            <div><strong>Email:</strong> {lead.email}</div>
                            <div><strong>Nome:</strong> {lead.nome}</div>
                            <div><strong>Data:</strong> {lead.data_captura}</div>
                          </div>
                        ))}
                        {debriefing.dados_leads.length > 5 && (
                          <div className="text-center text-muted-foreground text-sm">
                            ... e mais {debriefing.dados_leads.length - 5} leads
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        Nenhum dado de leads disponível
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Dados de Compradores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {debriefing.dados_compradores && debriefing.dados_compradores.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debriefing.dados_compradores.map((comprador: any, index: number) => (
                          <div key={index} className="border p-2 rounded text-sm">
                            <div><strong>Email:</strong> {comprador.email}</div>
                            <div><strong>Valor:</strong> R$ {comprador.valor}</div>
                            <div><strong>Data:</strong> {comprador.data_compra}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        Nenhum dado de compradores disponível
                      </div>
                    )}
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