import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, TrendingUp, Target, DollarSign, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  insights_automaticos?: string[];
}

export default function DebriefingPublico() {
  const { id } = useParams<{ id: string }>();
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
        .eq('status', 'concluido') // Só mostrar debriefings concluídos publicamente
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (debriefingData) {
        console.log('Dados do debriefing público carregados:', debriefingData);
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
          dados_trafego: debriefingData.dados_trafego,
          insights_automaticos: Array.isArray(debriefingData.insights_automaticos) 
            ? debriefingData.insights_automaticos.map(item => String(item))
            : []
        });
      } else {
        console.log('Nenhum debriefing público encontrado para o ID:', id);
      }
    } catch (error) {
      console.error('Erro ao buscar debriefing público:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Gerando PDF...');
      
      const { data, error } = await supabase.functions.invoke('gerar-pdf-debriefing', {
        body: { debriefing_id: id }
      });

      if (error) {
        console.error('Erro na função PDF:', error);
        throw error;
      }

      console.log('Resposta da função PDF:', data);

      if (data?.data?.url && data.data.url !== 'https://example.com/pdf/' + id + '.pdf') {
        const link = document.createElement('a');
        link.href = data.data.url;
        link.download = data.data.filename || `debriefing_${debriefing?.nome_lancamento}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('PDF baixado com sucesso!');
      } else {
        toast.error('PDF ainda não foi implementado completamente. A funcionalidade está em desenvolvimento.');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF. A funcionalidade está em desenvolvimento.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!debriefing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-4">Debriefing não encontrado</h1>
            <p className="text-muted-foreground text-center mb-4">
              Este debriefing pode não existir ou ainda não estar disponível publicamente.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Visitar BNOads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{debriefing.nome_lancamento}</h1>
              <Badge className="bg-green-100 text-green-800">
                Debriefing Público
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {debriefing.cliente_nome} • {new Date(debriefing.periodo_inicio).toLocaleDateString('pt-BR')} - {new Date(debriefing.periodo_fim).toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <Button onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        </div>

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
                {debriefing.roas ? `${formatNumber(debriefing.roas)}x` : '-'}
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
                {debriefing.conversao_lead_venda ? `${formatNumber(debriefing.conversao_lead_venda * 100)}%` : '-'}
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
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
                      <Tooltip formatter={(value: number) => [formatNumber(value), '']} />
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
                        label={({ name, percent }) => `${name}: ${formatNumber(percent * 100)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#ff7c7c" />
                        <Cell fill="#8dd1e1" />
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
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
                    <Tooltip formatter={(value) => [formatNumber(Number(value)), '']} />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Insights Automáticos</CardTitle>
                <CardDescription>
                  Análises geradas automaticamente com base nos dados do lançamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debriefing.insights_automaticos && debriefing.insights_automaticos.length > 0 ? (
                  <div className="space-y-3">
                    {debriefing.insights_automaticos.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-blue-900 text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum insight disponível para este debriefing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>Este relatório foi gerado automaticamente pela BNOads</p>
          <p>© {new Date().getFullYear()} BNOads - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}