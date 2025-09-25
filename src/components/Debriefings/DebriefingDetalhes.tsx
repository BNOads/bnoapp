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
import { AdvancedCharts } from './AdvancedCharts';
import { DadosBrutosAnalysis } from './DadosBrutosAnalysis';
import EditDebriefingModal from './EditDebriefingModal';
import PDFExporter from './PDFExporter';
import PanelManager from './PanelManager';
import TrafficMetrics from './TrafficMetrics';

interface DebriefingDetalhes {
  id: string;
  cliente_id?: string;
  cliente_nome: string;
  nome_lancamento: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: string;
  leads_total?: number;
  vendas_total?: number;
  investimento_total?: number;
  faturamento_total?: number;
  faturamento_bruto?: number;
  roas?: number;
  cpl?: number;
  ticket_medio?: number;
  conversao_lead_venda?: number;
  created_at: string;
  dados_leads?: any;
  dados_compradores?: any;
  dados_trafego?: any;
  dados_pesquisa?: any;
  dados_outras_fontes?: any;
  paineis_excluidos?: string[];
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
          cliente_id: debriefingData.cliente_id,
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
          faturamento_bruto: debriefingData.faturamento_bruto,
          roas: debriefingData.roas,
          cpl: debriefingData.cpl,
          ticket_medio: debriefingData.ticket_medio,
          conversao_lead_venda: debriefingData.conversao_lead_venda,
          dados_leads: debriefingData.dados_leads,
          dados_compradores: debriefingData.dados_compradores,
          dados_trafego: debriefingData.dados_trafego,
          dados_pesquisa: (debriefingData as any).dados_pesquisa || [],
          dados_outras_fontes: (debriefingData as any).dados_outras_fontes || [],
          paineis_excluidos: Array.isArray(debriefingData.paineis_excluidos) ? debriefingData.paineis_excluidos as string[] : []
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
      // Corrigir a URL para a rota pública correta
      const shareUrl = `${window.location.origin}/debriefing/publico/${id}`;
      
      if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
        await navigator.share({
          title: `Debriefing - ${debriefing?.nome_lancamento}`,
          text: `Confira o debriefing do lançamento ${debriefing?.nome_lancamento}`,
          url: shareUrl,
        });
        toast.success('Debriefing compartilhado com sucesso!');
      } else {
        // Fallback para copiar para clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link público copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      // Fallback adicional - criar um input temporário para copiar
      try {
        const shareUrl = `${window.location.origin}/debriefing/publico/${id}`;
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Link público copiado para a área de transferência!');
      } catch (fallbackError) {
        toast.error('Erro ao compartilhar debriefing');
      }
    }
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
        // Create a temporary link to download the PDF
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
    <div className="container mx-auto p-6" id="debriefing-content">
      <div className="flex items-center justify-between mb-6" data-panel-id="header">
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
          
          <EditDebriefingModal 
            debriefing={debriefing} 
            onUpdate={fetchDebriefing}
          />
          
          <PDFExporter
            debriefingId={debriefing.id}
            debriefingName={debriefing.nome_lancamento}
            availablePanels={[
              { id: 'header', title: 'Cabeçalho', isExcluded: false },
              { id: 'traffic-metrics', title: 'Tráfego (Resumo)', isExcluded: false },
              { id: 'metrics', title: 'Métricas Principais', isExcluded: false },
              { id: 'secondary-metrics', title: 'Métricas Secundárias', isExcluded: false },
              { id: 'charts', title: 'Gráficos', isExcluded: false }
            ]}
          />
          
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF (Básico)
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

      {/* Seção de Tráfego (Resumo) */}
      <div className="mb-6" data-panel-id="traffic-metrics">
        <TrafficMetrics 
          debriefingId={debriefing.id}
          clienteId={debriefing.cliente_id}
        />
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6" data-panel-id="metrics">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold">{debriefing.leads_total || 0}</p>
              </div>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendas</p>
                <p className="text-2xl font-bold">{debriefing.vendas_total || 0}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Investimento</p>
                <p className="text-2xl font-bold">{formatCurrency(debriefing.investimento_total || 0)}</p>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento Líquido</p>
                <p className="text-2xl font-bold">{formatCurrency(debriefing.faturamento_total || 0)}</p>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento Bruto</p>
                <p className="text-2xl font-bold">{formatCurrency(debriefing.faturamento_bruto || 0)}</p>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-panel-id="secondary-metrics">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">CPL</p>
              <p className="text-xl font-semibold">{formatCurrency(debriefing.cpl || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
              <p className="text-xl font-semibold">{formatCurrency(debriefing.ticket_medio || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Conversão Lead → Venda</p>
              <p className="text-xl font-semibold">{((debriefing.conversao_lead_venda || 0) * 100).toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">ROAS</p>
              <p className="text-xl font-semibold">{debriefing.roas?.toFixed(1) || '0,0'}x</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status específicos */}
      {debriefing.status === 'processando' && (
        <Card className="mb-6" data-panel-id="processing">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Processando Dados</h3>
            <p className="text-muted-foreground text-center">
              Estamos analisando os dados enviados. Isso pode levar alguns minutos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gráficos Avançados */}
      <Tabs defaultValue="charts" className="space-y-4" data-panel-id="charts">
        <TabsList>
          <TabsTrigger value="charts">Gráficos Avançados</TabsTrigger>
          <TabsTrigger value="data">Dados Brutos</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <AdvancedCharts
            dados_leads={debriefing.dados_leads || []}
            dados_compradores={debriefing.dados_compradores || []}
            dados_trafego={debriefing.dados_trafego || []}
            dados_pesquisa={debriefing.dados_pesquisa || []}
            dados_outras_fontes={debriefing.dados_outras_fontes || []}
            debriefing={debriefing}
          />
        </TabsContent>

        <TabsContent value="data">
          <DadosBrutosAnalysis
            dados_leads={debriefing.dados_leads || []}
            dados_compradores={debriefing.dados_compradores || []}
            dados_trafego={debriefing.dados_trafego || []}
            dados_pesquisa={debriefing.dados_pesquisa || []}
            dados_outras_fontes={debriefing.dados_outras_fontes || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}