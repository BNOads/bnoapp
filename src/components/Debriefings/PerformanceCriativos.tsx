import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter } from 'recharts';
import { Download, ExternalLink, Trophy, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

interface PerformanceCriativosProps {
  dados_leads?: any[];
  dados_compradores?: any[];
  dados_trafego?: any[];
  dados_outras_fontes?: any[];
}

interface CriativoMetrics {
  utm_content: string;
  nome_criativo: string;
  link_criativo: string;
  plataforma: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  leads: number;
  vendas: number;
  faturamento: number;
  cpl: number;
  cpv: number;
  ctr: number;
  conversao: number;
  roas: number;
}

export function PerformanceCriativos({ 
  dados_leads = [], 
  dados_compradores = [], 
  dados_trafego = [], 
  dados_outras_fontes = [] 
}: PerformanceCriativosProps) {
  const [filtroPlataforma, setFiltroPlataforma] = useState<string>('todas');
  const [ordenarPor, setOrdenarPor] = useState<string>('vendas');

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

  // Normalizar email para cruzamento
  const normalizeEmail = (email: string) => {
    return email?.toLowerCase().trim() || '';
  };

  // Criar sets de emails para cruzamento
  const emailsLeads = new Set(dados_leads.map(lead => normalizeEmail(lead.email)));
  const emailsCompradores = new Set(dados_compradores.map(comprador => normalizeEmail(comprador.email)));

  // Calcular métricas por criativo
  const criativosMetrics = useMemo(() => {
    const todasFontes = [...dados_trafego, ...dados_outras_fontes];
    const metricas: { [key: string]: CriativoMetrics } = {};

    // Agrupar dados de tráfego por utm_content
    todasFontes.forEach((item: any) => {
      const utmContent = item.utm_content || item.ad_name || item.nome_criativo || '(sem identificação)';
      const plataforma = item.plataforma || 'Meta Ads';
      
      if (!metricas[utmContent]) {
        metricas[utmContent] = {
          utm_content: utmContent,
          nome_criativo: item.ad_name || item.nome_criativo || utmContent,
          link_criativo: item.link_criativo || '',
          plataforma: plataforma,
          investimento: 0,
          impressoes: 0,
          cliques: 0,
          leads: 0,
          vendas: 0,
          faturamento: 0,
          cpl: 0,
          cpv: 0,
          ctr: 0,
          conversao: 0,
          roas: 0
        };
      }

      // Somar métricas de tráfego
      metricas[utmContent].investimento += parseFloat(item.spend || item.gasto || 0);
      metricas[utmContent].impressoes += parseInt(item.impressions || item.impressoes || 0);
      metricas[utmContent].cliques += parseInt(item.action_link_clicks || item.cliques || 0);
    });

    // Contar leads por utm_content
    dados_leads.forEach((lead: any) => {
      const utmContent = lead.utm_content || '(sem identificação)';
      if (metricas[utmContent]) {
        metricas[utmContent].leads++;
      } else if (utmContent !== '(sem identificação)') {
        // Criar entrada para leads sem dados de tráfego
        metricas[utmContent] = {
          utm_content: utmContent,
          nome_criativo: utmContent,
          link_criativo: '',
          plataforma: 'Desconhecida',
          investimento: 0,
          impressoes: 0,
          cliques: 0,
          leads: 1,
          vendas: 0,
          faturamento: 0,
          cpl: 0,
          cpv: 0,
          ctr: 0,
          conversao: 0,
          roas: 0
        };
      }
    });

    // Contar vendas por utm_content
    dados_compradores.forEach((comprador: any) => {
      // Buscar o lead correspondente para obter utm_content
      const leadCorrespondente = dados_leads.find(lead => 
        normalizeEmail(lead.email) === normalizeEmail(comprador.email)
      );
      
      if (leadCorrespondente) {
        const utmContent = leadCorrespondente.utm_content || comprador.utm_content || '(sem identificação)';
        if (metricas[utmContent]) {
          metricas[utmContent].vendas++;
          metricas[utmContent].faturamento += parseFloat(comprador.valor || 0);
        }
      }
    });

    // Calcular métricas derivadas
    Object.values(metricas).forEach(criativo => {
      criativo.cpl = criativo.leads > 0 ? criativo.investimento / criativo.leads : 0;
      criativo.cpv = criativo.vendas > 0 ? criativo.investimento / criativo.vendas : 0;
      criativo.ctr = criativo.impressoes > 0 ? (criativo.cliques / criativo.impressoes) * 100 : 0;
      criativo.conversao = criativo.leads > 0 ? (criativo.vendas / criativo.leads) * 100 : 0;
      criativo.roas = criativo.investimento > 0 ? criativo.faturamento / criativo.investimento : 0;
    });

    return Object.values(metricas);
  }, [dados_leads, dados_compradores, dados_trafego, dados_outras_fontes]);

  // Filtrar e ordenar criativos
  const criativosFiltrados = useMemo(() => {
    let filtrados = criativosMetrics;

    // Filtrar por plataforma
    if (filtroPlataforma !== 'todas') {
      filtrados = filtrados.filter(c => c.plataforma.toLowerCase().includes(filtroPlataforma.toLowerCase()));
    }

    // Ordenar
    filtrados.sort((a, b) => {
      switch (ordenarPor) {
        case 'vendas':
          return b.vendas - a.vendas;
        case 'roas':
          return b.roas - a.roas;
        case 'leads':
          return b.leads - a.leads;
        case 'investimento':
          return b.investimento - a.investimento;
        case 'conversao':
          return b.conversao - a.conversao;
        default:
          return b.vendas - a.vendas;
      }
    });

    return filtrados;
  }, [criativosMetrics, filtroPlataforma, ordenarPor]);

  // Top 3 criativos por vendas e ROAS
  const top3Vendas = criativosFiltrados.slice(0, 3);
  const top3ROAS = [...criativosFiltrados].sort((a, b) => b.roas - a.roas).slice(0, 3);

  // Obter plataformas únicas
  const plataformasUnicas = Array.from(new Set(criativosMetrics.map(c => c.plataforma)));

  // Dados para gráficos
  const dadosGraficoVendas = criativosFiltrados.slice(0, 10).map(c => ({
    nome: c.nome_criativo.length > 20 ? c.nome_criativo.substring(0, 20) + '...' : c.nome_criativo,
    vendas: c.vendas,
    investimento: c.investimento
  }));

  const dadosGraficoDispersao = criativosFiltrados.filter(c => c.roas > 0 && c.cpl > 0).map(c => ({
    nome: c.nome_criativo,
    roas: c.roas,
    cpl: c.cpl,
    vendas: c.vendas
  }));

  const exportarCSV = () => {
    const headers = [
      'UTM Content', 'Nome do Criativo', 'Plataforma', 'Impressões', 
      'Cliques', 'Leads', 'Vendas', 'Investimento', 'Faturamento',
      'CPL', 'CPV', 'CTR', 'Conversão', 'ROAS'
    ];

    const csvContent = [
      headers.join(','),
      ...criativosFiltrados.map(c => [
        c.utm_content,
        c.nome_criativo,
        c.plataforma,
        c.impressoes,
        c.cliques,
        c.leads,
        c.vendas,
        c.investimento.toFixed(2),
        c.faturamento.toFixed(2),
        c.cpl.toFixed(2),
        c.cpv.toFixed(2),
        c.ctr.toFixed(2),
        c.conversao.toFixed(2),
        c.roas.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'performance_criativos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance por Criativo</h2>
          <p className="text-muted-foreground">
            Análise detalhada baseada no cruzamento de utm_content entre leads, vendas e tráfego
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={filtroPlataforma} onValueChange={setFiltroPlataforma}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {plataformasUnicas.map(plataforma => (
                <SelectItem key={plataforma} value={plataforma.toLowerCase()}>
                  {plataforma}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ordenarPor} onValueChange={setOrdenarPor}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="roas">ROAS</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
              <SelectItem value="investimento">Investimento</SelectItem>
              <SelectItem value="conversao">Conversão</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportarCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Top Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 3 Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {top3Vendas.map((criativo, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index + 1}º
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{criativo.nome_criativo}</p>
                      <p className="text-xs text-muted-foreground">{criativo.plataforma}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{criativo.vendas} vendas</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(criativo.roas)}x ROAS</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top 3 ROAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {top3ROAS.map((criativo, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index + 1}º
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{criativo.nome_criativo}</p>
                      <p className="text-xs text-muted-foreground">{criativo.plataforma}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatNumber(criativo.roas)}x</p>
                    <p className="text-xs text-muted-foreground">{criativo.vendas} vendas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Criativo (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGraficoVendas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nome" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip formatter={(value: number, name: string) => {
                  if (name === 'investimento') return [formatCurrency(value), 'Investimento'];
                  return [formatNumber(value), name === 'vendas' ? 'Vendas' : name];
                }} />
                <Bar dataKey="vendas" fill="#8884d8" name="Vendas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROAS x CPL (Eficiência)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={dadosGraficoDispersao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="cpl" 
                  name="CPL"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis 
                  dataKey="roas" 
                  name="ROAS"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'cpl') return [formatCurrency(value), 'CPL'];
                    if (name === 'roas') return [`${formatNumber(value)}x`, 'ROAS'];
                    return [formatNumber(value), name];
                  }}
                  labelFormatter={(label) => `Criativo: ${label}`}
                />
                <Scatter dataKey="roas" fill="#82ca9d" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela Detalhada - Performance por Criativo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mostrando {criativosFiltrados.length} criativos ordenados por {ordenarPor}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criativo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-center">Impressões</TableHead>
                  <TableHead className="text-center">Cliques</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-center">CPL</TableHead>
                  <TableHead className="text-center">CPV</TableHead>
                  <TableHead className="text-center">CTR</TableHead>
                  <TableHead className="text-center">Conversão</TableHead>
                  <TableHead className="text-center">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criativosFiltrados.map((criativo, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {criativo.link_criativo && (
                          <div className="flex-shrink-0">
                            <img 
                              src={criativo.link_criativo} 
                              alt={`Preview ${criativo.nome_criativo}`}
                              className="w-12 h-12 object-cover rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{criativo.nome_criativo}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {criativo.utm_content}
                          </p>
                          {criativo.link_criativo && (
                            <a 
                              href={criativo.link_criativo} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                            >
                              Ver criativo <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{criativo.plataforma}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{criativo.impressoes.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-center">{criativo.cliques.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-center">{criativo.leads}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={criativo.vendas > 0 ? "default" : "secondary"}>
                        {criativo.vendas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatCurrency(criativo.cpl)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(criativo.cpv)}</TableCell>
                    <TableCell className="text-center">{formatNumber(criativo.ctr)}%</TableCell>
                    <TableCell className="text-center">{formatNumber(criativo.conversao)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={criativo.roas >= 3 ? "default" : criativo.roas >= 1 ? "secondary" : "destructive"}>
                        {formatNumber(criativo.roas)}x
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {criativosFiltrados.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum criativo encontrado com os filtros aplicados.</p>
                <p className="text-sm mt-2">Verifique se os dados contêm o campo utm_content.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}