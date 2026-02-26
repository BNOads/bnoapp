import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react';
import { buildLaunchSheetCrossing, formatSheetColumnLabel, type MatchedPersonRow } from '@/lib/launchSheetCrossing';

interface CruzamentoDadosTabProps {
  lancamento?: any;
  lancamentoId?: string;
}

interface LancamentoLinkRow {
  id: string;
  nome: string;
  url: string | null;
  cached_data: unknown;
  last_sync_at: string | null;
}

interface TableColumn {
  key: string;
  label: string;
}

const PIE_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#f97316', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16', '#64748b'];

const toRows = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const formatSyncDate = (value: string | null): string => {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('pt-BR');
};

const truncate = (value: string, maxLength = 24): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Erro ao carregar os links das planilhas.';
};

const compareValues = (aValue: unknown, bValue: unknown, direction: 'asc' | 'desc'): number => {
  const aText = String(aValue ?? '').trim();
  const bText = String(bValue ?? '').trim();

  const aNum = Number(aText);
  const bNum = Number(bText);
  const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum) && aText !== '' && bText !== '';

  if (bothNumeric) {
    return direction === 'asc' ? aNum - bNum : bNum - aNum;
  }

  return direction === 'asc'
    ? aText.localeCompare(bText, 'pt-BR', { sensitivity: 'base' })
    : bText.localeCompare(aText, 'pt-BR', { sensitivity: 'base' });
};

export const CruzamentoDadosTab = ({ lancamento, lancamentoId: lancamentoIdProp }: CruzamentoDadosTabProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [leadsLink, setLeadsLink] = useState<LancamentoLinkRow | null>(null);
  const [pesquisaLink, setPesquisaLink] = useState<LancamentoLinkRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [utmFilters, setUtmFilters] = useState({
    utm_campaign: 'all',
    utm_source: 'all',
    utm_medium: 'all',
    utm_term: 'all'
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'nome',
    direction: 'asc',
  });
  const [lastSync, setLastSync] = useState<string | null>(null);

  const isPaidLaunch = lancamento?.tipo_lancamento === 'pago';
  const resultLabel = isPaidLaunch ? 'Vendas' : 'Leads';
  const singularResultLabel = isPaidLaunch ? 'Venda' : 'Lead';

  const fixedColumns = useMemo<TableColumn[]>(
    () => [
      { key: 'nome', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'utm_source', label: 'UTM Source' },
      { key: 'utm_medium', label: 'UTM Medium' },
      { key: 'utm_campaign', label: 'UTM Campaign' },
      { key: 'utm_term', label: 'UTM Term' },
    ],
    []
  );

  const fetchLinks = useCallback(async (forceRefresh = false) => {
    if (!lancamento?.id) return;

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('lancamento_links')
        .select('id, nome, url, cached_data, last_sync_at')
        .eq('lancamento_id', lancamento.id)
        .in('nome', ['Planilha de Leads', 'Planilha de Pesquisa']);

      if (error) throw error;

      const links = (data || []) as LancamentoLinkRow[];
      setLeadsLink(links.find((item) => item.nome === 'Planilha de Leads') || null);
      setPesquisaLink(links.find((item) => item.nome === 'Planilha de Pesquisa') || null);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados de cruzamento:', error);
      setErrorMsg(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lancamento]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const leadsRows = useMemo(() => toRows(leadsLink?.cached_data), [leadsLink]);
  const pesquisaRows = useMemo(() => toRows(pesquisaLink?.cached_data), [pesquisaLink]);

  const crossing = useMemo(() => {
    return buildLaunchSheetCrossing(leadsRows, pesquisaRows);
  }, [leadsRows, pesquisaRows]);

  const uniqueUtms = useMemo(() => {
    const campaigns = new Set<string>();
    const sources = new Set<string>();
    const mediums = new Set<string>();
    const terms = new Set<string>();

    crossing.matchedPeople.forEach(p => {
      if (p.utm_campaign) campaigns.add(p.utm_campaign);
      if (p.utm_source) sources.add(p.utm_source);
      if (p.utm_medium) mediums.add(p.utm_medium);
      if (p.utm_term) terms.add(p.utm_term);
    });

    return {
      campaigns: Array.from(campaigns).sort(),
      sources: Array.from(sources).sort(),
      mediums: Array.from(mediums).sort(),
      terms: Array.from(terms).sort(),
    };
  }, [crossing.matchedPeople]);

  const dynamicColumns = useMemo<TableColumn[]>(() => {
    return crossing.questionColumns.map((questionKey) => ({
      key: questionKey,
      label: formatSheetColumnLabel(questionKey),
    }));
  }, [crossing.questionColumns]);

  const tableColumns = useMemo<TableColumn[]>(() => {
    return [...fixedColumns, ...dynamicColumns];
  }, [fixedColumns, dynamicColumns]);

  const filteredRows = useMemo<MatchedPersonRow[]>(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    const rows = crossing.matchedPeople.filter((row) => {
      if (utmFilters.utm_campaign !== 'all' && row.utm_campaign !== utmFilters.utm_campaign) return false;
      if (utmFilters.utm_source !== 'all' && row.utm_source !== utmFilters.utm_source) return false;
      if (utmFilters.utm_medium !== 'all' && row.utm_medium !== utmFilters.utm_medium) return false;
      if (utmFilters.utm_term !== 'all' && row.utm_term !== utmFilters.utm_term) return false;

      if (!searchLower) return true;
      return tableColumns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(searchLower));
    });

    return [...rows].sort((a, b) => compareValues(a[sortConfig.key], b[sortConfig.key], sortConfig.direction));
  }, [crossing.matchedPeople, searchTerm, sortConfig, tableColumns]);

  const themeChartData = useMemo(() => crossing.themeMetrics.slice(0, 10), [crossing.themeMetrics]);
  const campaignChartData = useMemo(() => crossing.campaignMetrics.slice(0, 10), [crossing.campaignMetrics]);
  const profileCharts = useMemo(() => crossing.profileMetrics.slice(0, 4), [crossing.profileMetrics]);
  const sourceChartData = useMemo(() => crossing.sourceMetrics, [crossing.sourceMetrics]);

  const missingLinks = useMemo(() => {
    const missing: string[] = [];
    if (!leadsLink) missing.push('Planilha de Leads');
    if (!pesquisaLink) missing.push('Planilha de Pesquisa');
    return missing;
  }, [leadsLink, pesquisaLink]);

  const emptyConnectedLinks = useMemo(() => {
    const empty: string[] = [];
    if (leadsLink && leadsRows.length === 0) empty.push('Planilha de Leads');
    if (pesquisaLink && pesquisaRows.length === 0) empty.push('Planilha de Pesquisa');
    return empty;
  }, [leadsLink, pesquisaLink, leadsRows.length, pesquisaRows.length]);

  const handleSort = (columnKey: string) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key: columnKey,
        direction: 'asc',
      };
    });
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (errorMsg) {
    return (
      <Card>
        <CardContent className="py-10 space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Erro ao carregar cruzamento</span>
          </div>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={() => fetchLinks(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (missingLinks.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cruzamento de dados indisponível</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conecte as planilhas abaixo para habilitar o cruzamento:
          </p>
          <div className="space-y-2">
            {missingLinks.map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (emptyConnectedLinks.length > 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Planilha conectada sem dados</CardTitle>
          <Button variant="outline" size="sm" onClick={() => fetchLinks(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As planilhas abaixo estão conectadas, mas não possuem `cached_data`. Execute a sincronização nas abas respectivas.
          </p>
          <div className="space-y-2">
            {emptyConnectedLinks.map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Leads sincronizada: {formatSyncDate(leadsLink?.last_sync_at || null)}</div>
          <div>Pesquisa sincronizada: {formatSyncDate(pesquisaLink?.last_sync_at || null)}</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLinks(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar dados
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{resultLabel} únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{crossing.leadsUniqueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Respondentes únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{crossing.pesquisaUniqueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nas duas planilhas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{crossing.intersectionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(crossing.responseRate)}</p>
            <p className="text-xs text-muted-foreground mt-1">Não responderam: {formatPercent(crossing.nonResponseRate)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de resposta por tema (Campaign + Term)</CardTitle>
            <p className="text-sm text-muted-foreground">Top 10 temas por volume de {resultLabel.toLowerCase()}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={themeChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tema" tickFormatter={(value) => truncate(String(value))} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${Number(value).toFixed(0)}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'taxa_resposta') return [`${value.toFixed(1)}%`, 'Taxa de resposta'];
                      if (name === 'responderam') return [value, 'Responderam'];
                      return [value, 'Leads'];
                    }}
                    labelFormatter={(value) => String(value)}
                  />
                  <Legend
                    formatter={(value) => {
                      if (value === 'leads') return resultLabel;
                      if (value === 'responderam') return 'Responderam';
                      return 'Taxa de resposta';
                    }}
                  />
                  <Bar yAxisId="left" dataKey="leads" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="responderam" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="taxa_resposta" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top campanhas por adesão de pesquisa</CardTitle>
            <p className="text-sm text-muted-foreground">Top 10 campanhas por % de resposta</p>
          </CardHeader>
          <CardContent>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="utm_campaign"
                    tickFormatter={(value) => truncate(String(value))}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tickFormatter={(value) => `${Number(value).toFixed(0)}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'taxa_resposta') return [`${value.toFixed(1)}%`, 'Taxa de resposta'];
                      return [value, name || 'Valor'];
                    }}
                    labelFormatter={(value) => String(value)}
                  />
                  <Bar dataKey="taxa_resposta" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {profileCharts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {profileCharts.map((metric) => (
            <Card key={metric.fieldKey}>
              <CardHeader>
                <CardTitle>{metric.fieldLabel}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribuição de perfil entre respondentes ({metric.totalAnswers} respostas válidas)
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metric.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickFormatter={(value) => truncate(String(value), 20)} interval={0} angle={-20} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'value') return [value, 'Respostas'];
                          return [value, name || 'Valor'];
                        }}
                        labelFormatter={(value) => String(value)}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Origem dos respondentes</CardTitle>
          <p className="text-sm text-muted-foreground">Distribuição por UTM Source (Top 8 + Outros)</p>
        </CardHeader>
        <CardContent>
          {sourceChartData.length > 0 ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={2}>
                    {sourceChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [String(value), 'Respondentes']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => {
                      return <span title={value}>{value.length > 20 ? value.substring(0, 20) + '...' : value}</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-10 text-sm text-muted-foreground text-center">Sem dados de origem para os respondentes.</div>
          )}
        </CardContent>
      </Card>

      {crossing.intersectionCount === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">Sem interseção entre planilhas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Não encontramos pessoas em comum entre Leads e Pesquisa com a regra Email OU Telefone.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pessoas nas duas planilhas</CardTitle>
          <p className="text-sm text-muted-foreground">
            {crossing.intersectionCount} pessoas encontradas no cruzamento (busca e ordenação por coluna habilitadas)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Campanha (utm_campaign)</label>
              <Select value={utmFilters.utm_campaign} onValueChange={(val) => setUtmFilters(prev => ({ ...prev, utm_campaign: val }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Campanhas</SelectItem>
                  {uniqueUtms.campaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Origem (utm_source)</label>
              <Select value={utmFilters.utm_source} onValueChange={(val) => setUtmFilters(prev => ({ ...prev, utm_source: val }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Origens</SelectItem>
                  {uniqueUtms.sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Meio (utm_medium)</label>
              <Select value={utmFilters.utm_medium} onValueChange={(val) => setUtmFilters(prev => ({ ...prev, utm_medium: val }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Meios</SelectItem>
                  {uniqueUtms.mediums.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Termo (utm_term)</label>
              <Select value={utmFilters.utm_term} onValueChange={(val) => setUtmFilters(prev => ({ ...prev, utm_term: val }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Termos</SelectItem>
                  {uniqueUtms.terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative pt-2">
            <Input
              placeholder="Buscar por nome, email, telefone, tema ou respostas..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    {tableColumns.map((column) => (
                      <TableHead
                        key={column.key}
                        className="whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort(column.key)}
                      >
                        <div className="flex items-center gap-1">
                          <span>{column.label}</span>
                          {renderSortIcon(column.key)}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((person) => (
                      <TableRow key={person.key}>
                        {tableColumns.map((column) => (
                          <TableCell key={`${person.key}_${column.key}`} className="whitespace-nowrap align-top">
                            {String(person[column.key] ?? '') || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={tableColumns.length} className="text-center py-8 text-muted-foreground">
                        Nenhum resultado encontrado para "{searchTerm}"
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="bg-muted/30 p-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Mostrando {filteredRows.length} de {crossing.matchedPeople.length} registros filtrados</span>
              <Badge variant="outline">Perguntas dinâmicas: {dynamicColumns.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
