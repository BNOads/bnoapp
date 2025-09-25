import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DebriefingChartWithTable } from './DebriefingChartWithTable';

interface AdvancedChartsProps {
  dados_leads?: any[];
  dados_compradores?: any[];
  dados_trafego?: any[];
  dados_pesquisa?: any[];
  dados_outras_fontes?: any[];
  debriefing: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const AdvancedCharts = ({ dados_leads = [], dados_compradores = [], dados_trafego = [], dados_pesquisa = [], dados_outras_fontes = [], debriefing }: AdvancedChartsProps) => {
  const [isEditingDistribution, setIsEditingDistribution] = useState(false);
  const [distributionData, setDistributionData] = useState<any[]>([]);

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

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  // 1. Distribuição de Verba por Etapa (usando dados reais de mapeamento)
  const getVerbaPorEtapa = () => {
    // Se há distribuição de etapas salva, usar ela
    if (debriefing.distribuicao_etapas && Array.isArray(debriefing.distribuicao_etapas) && debriefing.distribuicao_etapas.length > 0) {
      const stageGroups = debriefing.distribuicao_etapas.reduce((acc: any, mapping: any) => {
        if (!acc[mapping.stage]) {
          acc[mapping.stage] = { investment: 0, count: 0 };
        }
        acc[mapping.stage].investment += Number(mapping.investment) || 0;
        acc[mapping.stage].count += 1;
        return acc;
      }, {});

      const totalInvestment = Object.values(stageGroups).reduce((sum: number, group: any) => {
        const groupInvestment = Number(group?.investment) || 0;
        return sum + groupInvestment;
      }, 0);

      return Object.entries(stageGroups).map(([stage, data]: [string, any]) => {
        const investment = Number(data?.investment) || 0;
        const totalInv = Number(totalInvestment) || 0;
        const percentage = totalInv > 0 ? (investment / totalInv) * 100 : 0;
        return {
          name: getStageLabel(stage),
          value: investment,
          percentage,
          color: getStageColor(stage),
          count: Number(data?.count) || 0
        };
      });
    }

    // Fallback: distribuição padrão estimada
    const totalInvestimento = Number(debriefing.investimento_total) || 0;
    const distribuicao = [
      { name: 'Captação', value: totalInvestimento * 0.4, percentage: 40, color: '#0088FE', count: 0 },
      { name: 'Aquecimento', value: totalInvestimento * 0.3, percentage: 30, color: '#00C49F', count: 0 },
      { name: 'CPL/Conteúdo', value: totalInvestimento * 0.2, percentage: 20, color: '#FFBB28', count: 0 },
      { name: 'Lembrete', value: totalInvestimento * 0.1, percentage: 10, color: '#FF8042', count: 0 },
    ];
    return distribuicao;
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'captacao': 'Captação',
      'aquecimento': 'Aquecimento',
      'cpl': 'CPL/Conteúdo',
      'lembrete': 'Lembrete',
      'vendas': 'Vendas',
      'nao_classificada': 'Não Classificada'
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'captacao': '#0088FE',
      'aquecimento': '#00C49F',
      'cpl': '#FFBB28',
      'lembrete': '#FF8042',
      'vendas': '#8884D8',
      'nao_classificada': '#999999'
    };
    return colors[stage] || '#cccccc';
  };

  // 2. Desempenho por Plataforma (incluindo outras fontes)
  const getDesempenhoPorPlataforma = () => {
    const trafegoCompleto = [...dados_trafego, ...dados_outras_fontes];
    
    const trafegoAgrupado = trafegoCompleto.reduce((acc: any, item: any) => {
      let plataforma = 'Meta Ads';
      
      if (item.plataforma) {
        plataforma = item.plataforma;
      } else if (item['Campaign Name']?.includes('Google')) {
        plataforma = 'Google Ads';
      }
      
      if (!acc[plataforma]) {
        acc[plataforma] = {
          investimento: 0,
          impressoes: 0,
          cliques: 0,
          leads: 0,
          cpl: 0,
          ctr: 0
        };
      }
      acc[plataforma].investimento += parseFloat(item['Spend (Cost, Amount Spent)'] || item.gasto || 0);
      acc[plataforma].impressoes += parseInt(item['Impressions'] || item.impressoes || 0);
      acc[plataforma].cliques += parseInt(item['Action Link Clicks'] || item.cliques || 0);
      acc[plataforma].leads += parseInt(item['Action Leads'] || item.leads || 0);
      return acc;
    }, {});

    return Object.keys(trafegoAgrupado).map(plataforma => ({
      plataforma,
      ...trafegoAgrupado[plataforma],
      cpl: trafegoAgrupado[plataforma].leads > 0 ? trafegoAgrupado[plataforma].investimento / trafegoAgrupado[plataforma].leads : 0,
      ctr: trafegoAgrupado[plataforma].impressoes > 0 ? (trafegoAgrupado[plataforma].cliques / trafegoAgrupado[plataforma].impressoes) * 100 : 0
    }));
  };

  // 3. Vendas por Dia
  const getVendasPorDia = () => {
    const vendasPorDia = dados_compradores.reduce((acc: any, comprador: any) => {
      const data = new Date(comprador.data || Date.now()).toLocaleDateString('pt-BR');
      if (!acc[data]) {
        acc[data] = 0;
      }
      acc[data]++;
      return acc;
    }, {});

    return Object.keys(vendasPorDia)
      .sort((a, b) => new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime())
      .map(data => ({
        data,
        vendas: vendasPorDia[data]
      }));
  };

  // 4. Melhores Fontes (Orgânicas vs Tráfego Pago)
  const getMelhoresFontes = () => {
    const todasFontes = [...dados_leads, ...dados_compradores];
    
    const fontesData = todasFontes.reduce((acc: any, item: any) => {
      const utmSource = item.utm_source || item['UTM SOURCE'] || 'direct';
      const isOrganic = ['organic', 'direct', 'referral', 'email', 'social'].includes(utmSource.toLowerCase()) ||
                       utmSource.toLowerCase().includes('organic') ||
                       utmSource.toLowerCase().includes('direct') ||
                       utmSource === '';
      
      const tipoFonte = isOrganic ? 'Orgânico' : 'Tráfego Pago';
      const fonte = utmSource || 'Direct';
      
      if (!acc[fonte]) {
        acc[fonte] = {
          fonte,
          tipo: tipoFonte,
          leads: 0,
          vendas: 0
        };
      }
      
      // Contar como lead se vier dos dados de leads
      if (dados_leads.some(l => l.email === item.email || l.utm_source === item.utm_source)) {
        acc[fonte].leads++;
      }
      
      // Contar como venda se vier dos dados de compradores
      if (dados_compradores.some(c => c.email === item.email)) {
        acc[fonte].vendas++;
      }
      
      return acc;
    }, {});

    const fontesArray = Object.values(fontesData).map((fonte: any) => ({
      ...fonte,
      conversao: fonte.leads > 0 ? (fonte.vendas / fonte.leads) * 100 : 0,
      roas: fonte.vendas > 0 ? fonte.vendas * (debriefing.ticket_medio || 0) : 0
    }));

    return fontesArray.sort((a: any, b: any) => b.leads - a.leads);
  };

  const handleEditDistribution = () => {
    const currentData = getVerbaPorEtapa();
    setDistributionData(currentData);
    setIsEditingDistribution(true);
  };

  const handleSaveDistribution = async () => {
    try {
      const totalValue = distributionData.reduce((sum, item) => sum + item.value, 0);
      const updatedData = distributionData.map(item => ({
        ...item,
        percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0
      }));

      const { error } = await supabase
        .from('debriefings')
        .update({
          insights_automaticos: updatedData.map(item => ({
            stage: item.name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_'),
            investment: item.value,
            percentage: item.percentage
          }))
        })
        .eq('id', debriefing.id);

      if (error) throw error;

      toast.success('Distribuição de verba atualizada com sucesso!');
      setIsEditingDistribution(false);
    } catch (error) {
      console.error('Erro ao salvar distribuição:', error);
      toast.error('Erro ao salvar distribuição de verba');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingDistribution(false);
    setDistributionData([]);
  };

  const updateDistributionValue = (index: number, newValue: number) => {
    const updated = [...distributionData];
    updated[index] = { ...updated[index], value: newValue };
    setDistributionData(updated);
  };

  const verbaPorEtapa = getVerbaPorEtapa();
  const plataformas = getDesempenhoPorPlataforma();
  const vendasPorDia = getVendasPorDia();
  const melhoresFontes = getMelhoresFontes();

  return (
    <div className="space-y-6">
      {/* Distribuição de Verba por Etapa */}
      <DebriefingChartWithTable
        chartId="budget-distribution"
        title="Distribuição de Verba por Etapa"
        data={verbaPorEtapa}
        columns={[
          { key: 'name', label: 'Etapa', type: 'text' },
          { key: 'value', label: 'Valor', type: 'currency' },
          { key: 'percentage', label: 'Percentual', type: 'percentage' },
          { key: 'count', label: 'Campanhas', type: 'number' },
        ]}
      >
        <div className="space-y-4">
          {!isEditingDistribution ? (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleEditDistribution}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveDistribution}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={isEditingDistribution ? distributionData : verbaPorEtapa}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(isEditingDistribution ? distributionData : verbaPorEtapa).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {(isEditingDistribution ? distributionData : verbaPorEtapa).map((etapa, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: etapa.color }}></div>
                    <span>{etapa.name}</span>
                    {etapa.count > 0 && (
                      <span className="text-xs text-muted-foreground">({etapa.count} campanhas)</span>
                    )}
                  </div>
                  <div className="text-right">
                    {isEditingDistribution ? (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`etapa-${index}`} className="sr-only">Valor para {etapa.name}</Label>
                        <Input
                          id={`etapa-${index}`}
                          type="number"
                          value={etapa.value}
                          onChange={(e) => updateDistributionValue(index, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="font-bold">{formatCurrency(etapa.value)}</div>
                        <div className="text-sm text-muted-foreground">{etapa.percentage.toFixed(1)}%</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DebriefingChartWithTable>

      {/* Desempenho por Plataforma */}
      {plataformas.length > 0 && (
        <DebriefingChartWithTable
          chartId="platform-performance"
          title="Desempenho por Plataforma"
          data={plataformas}
          columns={[
            { key: 'plataforma', label: 'Plataforma', type: 'text' },
            { key: 'investimento', label: 'Investimento', type: 'currency' },
            { key: 'impressoes', label: 'Impressões', type: 'number' },
            { key: 'cliques', label: 'Cliques', type: 'number' },
            { key: 'leads', label: 'Leads', type: 'number' },
            { key: 'cpl', label: 'CPL', type: 'currency' },
            { key: 'ctr', label: 'CTR', type: 'percentage' },
          ]}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={plataformas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plataforma" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'investimento') return formatCurrency(value);
                  if (name === 'cpl') return formatCurrency(value);
                  if (name === 'ctr') return value.toFixed(2) + '%';
                  return formatNumber(value);
                }}
              />
              <Bar dataKey="investimento" fill="#0088FE" name="Investimento" />
              <Bar dataKey="leads" fill="#00C49F" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </DebriefingChartWithTable>
      )}

      {/* Vendas por Dia */}
      {vendasPorDia.length > 0 && (
        <DebriefingChartWithTable
          chartId="daily-sales"
          title="Vendas por Dia"
          data={vendasPorDia}
          columns={[
            { key: 'data', label: 'Data', type: 'text' },
            { key: 'vendas', label: 'Vendas', type: 'number' },
          ]}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="vendas" stroke="#0088FE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </DebriefingChartWithTable>
      )}

      {/* Melhores Fontes de Tráfego */}
      {melhoresFontes.length > 0 && (
        <DebriefingChartWithTable
          chartId="traffic-sources"
          title="Melhores Fontes de Tráfego"
          data={melhoresFontes}
          columns={[
            { key: 'fonte', label: 'Fonte', type: 'text' },
            { key: 'tipo', label: 'Tipo', type: 'text' },
            { key: 'leads', label: 'Leads', type: 'number' },
            { key: 'vendas', label: 'Vendas', type: 'number' },
            { key: 'conversao', label: 'Conversão', type: 'percentage' },
          ]}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fonte</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-right p-2">Leads</th>
                  <th className="text-right p-2">Vendas</th>
                  <th className="text-right p-2">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {melhoresFontes.slice(0, 10).map((fonte, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{fonte.fonte}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        fonte.tipo === 'Orgânico' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {fonte.tipo}
                      </span>
                    </td>
                      <td className="text-right p-2">{fonte.leads}</td>
                    <td className="text-right p-2">{fonte.vendas}</td>
                    <td className="text-right p-2">{fonte.conversao.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DebriefingChartWithTable>
      )}
    </div>
  );
};