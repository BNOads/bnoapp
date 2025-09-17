import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  dados_leads?: any[];
  dados_compradores?: any[];
  dados_trafego?: any[];
  dados_pesquisa?: any[];
  dados_outras_fontes?: any[];
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
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (debriefingData) {
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
          dados_leads: Array.isArray(debriefingData.dados_leads) ? debriefingData.dados_leads : [],
          dados_compradores: Array.isArray(debriefingData.dados_compradores) ? debriefingData.dados_compradores : [],
          dados_trafego: Array.isArray(debriefingData.dados_trafego) ? debriefingData.dados_trafego : [],
          dados_pesquisa: Array.isArray(debriefingData.dados_pesquisa) ? debriefingData.dados_pesquisa : [],
          dados_outras_fontes: Array.isArray(debriefingData.dados_outras_fontes) ? debriefingData.dados_outras_fontes : []
        });
      }
    } catch (error) {
      console.error('Erro ao buscar debriefing público:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Gerando PDF...');
      
      const { data, error } = await supabase.functions.invoke('gerar-pdf-debriefing', {
        body: { debriefing_id: id }
      });

      if (error) {
        throw error;
      }

      if (data?.data?.url && data.data.url !== 'https://example.com/pdf/' + id + '.pdf') {
        const link = document.createElement('a');
        link.href = data.data.url;
        link.download = data.data.filename || `debriefing_${debriefing?.nome_lancamento}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('PDF baixado com sucesso!');
      } else {
        toast.error('PDF ainda não foi implementado completamente.');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF.');
    }
  };

  // Função para normalizar emails
  const normalizeEmail = (email: string) => {
    return email?.toLowerCase().trim() || '';
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

  // Dados para análise
  const dados_leads = debriefing.dados_leads || [];
  const dados_compradores = debriefing.dados_compradores || [];
  const dados_trafego = debriefing.dados_trafego || [];
  const dados_pesquisa = debriefing.dados_pesquisa || [];
  const dados_outras_fontes = debriefing.dados_outras_fontes || [];

  // Criar sets de emails para cruzamento
  const emailsLeads = new Set(dados_leads.map(lead => normalizeEmail(lead.email)));
  const emailsCompradores = new Set(dados_compradores.map(comprador => normalizeEmail(comprador.email)));
  const emailsPesquisa = new Set(dados_pesquisa.map(resposta => normalizeEmail(resposta.email)));

  // Calcular intersecções
  const leadsQueCompraram = [...emailsLeads].filter(email => emailsCompradores.has(email));
  const leadsQueResponderamPesquisa = [...emailsLeads].filter(email => emailsPesquisa.has(email));
  const compradoresQueResponderamPesquisa = [...emailsCompradores].filter(email => emailsPesquisa.has(email));

  // Calcular taxas de conversão
  const taxaConversaoGeral = emailsLeads.size > 0 ? (leadsQueCompraram.length / emailsLeads.size) * 100 : 0;
  const taxaRespostaPesquisa = emailsLeads.size > 0 ? (leadsQueResponderamPesquisa.length / emailsLeads.size) * 100 : 0;
  const taxaConversaoPesquisa = leadsQueResponderamPesquisa.length > 0 ? (compradoresQueResponderamPesquisa.length / leadsQueResponderamPesquisa.length) * 100 : 0;

  // Análise por UTM Terms
  const analiseUTMTerms = () => {
    const utmStats: Record<string, {
      leads: number;
      vendas: number;
      conversao: number;
      emails: Set<string>;
      tipo: 'organico' | 'pago';
    }> = {};

    dados_leads.forEach(lead => {
      const utmTerm = lead.utm_term || lead.utmTerm || 'não informado';
      const email = normalizeEmail(lead.email);
      
      if (!utmStats[utmTerm]) {
        utmStats[utmTerm] = {
          leads: 0,
          vendas: 0,
          conversao: 0,
          emails: new Set(),
          tipo: utmTerm.toLowerCase().includes('organico') ? 'organico' : 'pago'
        };
      }
      
      utmStats[utmTerm].leads++;
      utmStats[utmTerm].emails.add(email);
      
      if (emailsCompradores.has(email)) {
        utmStats[utmTerm].vendas++;
      }
    });

    Object.keys(utmStats).forEach(term => {
      utmStats[term].conversao = utmStats[term].leads > 0 ? 
        (utmStats[term].vendas / utmStats[term].leads) * 100 : 0;
    });

    return utmStats;
  };

  const utmAnalise = analiseUTMTerms();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto">
        {/* Header */}
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

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Leads:</span>
                  <Badge variant="secondary">{dados_leads.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Vendas:</span>
                  <Badge variant="secondary">{dados_compradores.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pesquisa:</span>
                  <Badge variant="secondary">{dados_pesquisa.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tráfego:</span>
                  <Badge variant="secondary">{dados_trafego.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cruzamento de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Leads únicos:</span>
                  <Badge>{emailsLeads.size}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Leads que compraram:</span>
                  <Badge variant="default">{leadsQueCompraram.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Responderam pesquisa:</span>
                  <Badge variant="outline">{leadsQueResponderamPesquisa.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Compraram + Pesquisa:</span>
                  <Badge variant="destructive">{compradoresQueResponderamPesquisa.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Conversão Geral</span>
                    <span>{taxaConversaoGeral.toFixed(1)}%</span>
                  </div>
                  <Progress value={taxaConversaoGeral} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Resp. Pesquisa</span>
                    <span>{taxaRespostaPesquisa.toFixed(1)}%</span>
                  </div>
                  <Progress value={taxaRespostaPesquisa} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Qualidade dos Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Taxa Resp. Pesquisa:</span>
                  <Badge variant={taxaRespostaPesquisa > 20 ? "default" : "destructive"}>
                    {taxaRespostaPesquisa.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conv. c/ Pesquisa:</span>
                  <Badge variant={taxaConversaoPesquisa > taxaConversaoGeral ? "default" : "secondary"}>
                    {taxaConversaoPesquisa.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance por Criativo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance por Criativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-sm">Não informado</h4>
                <Badge variant="secondary">
                  0.0% conv.
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Leads:</span>
                  <p className="font-medium">{dados_leads.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vendas:</span>
                  <p className="font-medium">{dados_compradores.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Investimento:</span>
                  <p className="font-medium">R$ 0,00</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análise por UTM Terms e Fontes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversão por UTM Term</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(utmAnalise)
                  .sort((a, b) => b[1].conversao - a[1].conversao)
                  .slice(0, 10)
                  .map(([term, stats]) => (
                    <div key={term} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{term}</span>
                          <Badge variant={stats.tipo === 'organico' ? 'default' : 'secondary'}>
                            {stats.tipo}
                          </Badge>
                        </div>
                        <Badge variant={stats.conversao > taxaConversaoGeral ? "default" : "outline"}>
                          {stats.conversao.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <span>Leads: {stats.leads}</span>
                        <span>Vendas: {stats.vendas}</span>
                      </div>
                      <Progress value={stats.conversao} className="h-1 mt-2" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo Orgânico vs Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const organicos = Object.values(utmAnalise).filter(s => s.tipo === 'organico');
                  const pagos = Object.values(utmAnalise).filter(s => s.tipo === 'pago');
                  
                  const totalLeadsOrganicos = organicos.reduce((sum, s) => sum + s.leads, 0);
                  const totalVendasOrganicas = organicos.reduce((sum, s) => sum + s.vendas, 0);
                  const totalLeadsPagos = pagos.reduce((sum, s) => sum + s.leads, 0);
                  const totalVendasPagas = pagos.reduce((sum, s) => sum + s.vendas, 0);
                  
                  const convOrganico = totalLeadsOrganicos > 0 ? (totalVendasOrganicas / totalLeadsOrganicos) * 100 : 0;
                  const convPago = totalLeadsPagos > 0 ? (totalVendasPagas / totalLeadsPagos) * 100 : 0;

                  return (
                    <>
                      <div className="border rounded p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-green-600">Tráfego Orgânico</h4>
                          <Badge variant="default">{convOrganico.toFixed(1)}%</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span>Leads: {totalLeadsOrganicos}</span>
                          <span>Vendas: {totalVendasOrganicas}</span>
                        </div>
                        <Progress value={convOrganico} className="h-2 mt-2" />
                      </div>

                      <div className="border rounded p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-blue-600">Tráfego Pago</h4>
                          <Badge variant="secondary">{convPago.toFixed(1)}%</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span>Leads: {totalLeadsPagos}</span>
                          <span>Vendas: {totalVendasPagas}</span>
                        </div>
                        <Progress value={convPago} className="h-2 mt-2" />
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>Este relatório foi gerado automaticamente pela BNOads</p>
          <p>© {new Date().getFullYear()} BNOads - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}