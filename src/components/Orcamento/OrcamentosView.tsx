import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, Trash2, TrendingUp, Users, Target, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { NovoOrcamentoModal } from './NovoOrcamentoModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OrcamentoStatusToggle } from '@/components/Clientes/OrcamentoStatusToggle';

interface Orcamento {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  valor_gasto: number;
  etapa_funil: string;
  periodo_mes: number;
  periodo_ano: number;
  status_orcamento: string;
  observacoes?: string;
  created_at: string;
  cliente_id: string;
  cliente_nome?: string;
  active: boolean;
  ativo?: boolean;
}

type SortField = 'nome_funil' | 'cliente_nome' | 'valor_investimento' | 'valor_gasto' | 'periodo_mes' | 'etapa_funil';
type SortDirection = 'asc' | 'desc';

const ETAPAS_FUNIL = [
  { value: 'captacao', label: 'Captação' },
  { value: 'cpl', label: 'CPL' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'remarketing', label: 'Remarketing' },
  { value: 'email_marketing', label: 'E-mail Marketing' },
  { value: 'upsell', label: 'Upsell' }
];

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo', color: 'bg-green-500' },
  { value: 'pausado', label: 'Pausado', color: 'bg-yellow-500' },
  { value: 'concluido', label: 'Concluído', color: 'bg-blue-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' }
];

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export const OrcamentosView = () => {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('all');
  const [etapaFiltro, setEtapaFiltro] = useState('all');
  const [mesFiltro, setMesFiltro] = useState<number>(new Date().getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState<number>(new Date().getFullYear());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orcamentoToDelete, setOrcamentoToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('nome_funil');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [clienteGestorMap, setClienteGestorMap] = useState<Record<string, string | null>>({});
  const [gestorInfoMap, setGestorInfoMap] = useState<Record<string, { nome: string; avatar_url?: string }>>({});

  const { toast } = useToast();
  const { canManageBudgets } = useUserPermissions();

  useEffect(() => {
    loadOrcamentos();
  }, []);

  const loadOrcamentos = async () => {
    try {
      setLoading(true);
      
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos_funil')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (orcamentosError) throw orcamentosError;

      // Normalize active status from both fields
      const normalizedOrcamentos = (orcamentosData || []).map(o => ({
        ...o,
        active: o.active ?? o.ativo ?? true
      }));

      // Buscar apenas clientes que têm orçamentos
      const clienteIds = Array.from(new Set((orcamentosData || []).map(o => o.cliente_id).filter(Boolean)));
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nome, primary_gestor_user_id')
        .in('id', clienteIds.length > 0 ? clienteIds : ['00000000-0000-0000-0000-000000000000']);

      if (clientesError) throw clientesError;

      // Buscar apenas os gestores usados pelos clientes acima
      const gestorIds = Array.from(new Set((clientesData || []).map(c => c.primary_gestor_user_id).filter(Boolean)));
      const { data: colaboradoresData, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select('user_id, nome, avatar_url')
        .in('user_id', gestorIds.length > 0 ? gestorIds : ['00000000-0000-0000-0000-000000000000']);

      if (colaboradoresError) throw colaboradoresError;

      const clienteMap: Record<string, string | null> = {};
      clientesData?.forEach((c) => { clienteMap[c.id] = c.primary_gestor_user_id || null; });
      setClienteGestorMap(clienteMap);

      const gestorMap: Record<string, { nome: string; avatar_url?: string }> = {};
      colaboradoresData?.forEach((col) => { gestorMap[col.user_id] = { nome: col.nome, avatar_url: col.avatar_url || undefined }; });
      setGestorInfoMap(gestorMap);

      const orcamentosComCliente = normalizedOrcamentos.map(orcamento => {
        const cliente = clientesData?.find(c => c.id === orcamento.cliente_id);
        return {
          ...orcamento,
          cliente_nome: cliente?.nome || 'Cliente não encontrado'
        };
      });

      setOrcamentos(orcamentosComCliente);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar orçamentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const handleDelete = async () => {
    if (!orcamentoToDelete) return;

    try {
      const { error } = await supabase
        .from('orcamentos_funil')
        .update({ ativo: false })
        .eq('id', orcamentoToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso"
      });

      loadOrcamentos();
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir orçamento",
        variant: "destructive"
      });
    } finally {
      setDeleteModalOpen(false);
      setOrcamentoToDelete(null);
    }
  };

  const filteredAndSortedOrcamentos = useMemo(() => {
    // Determinar se estamos no período atual
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const isCurrentPeriod = mesFiltro === currentMonth && anoFiltro === currentYear;
    
    let filtered = orcamentos.filter(orcamento => {
      const matchesSearch = 
        orcamento.nome_funil.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orcamento.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orcamento.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCliente = clienteFiltro === 'all' || orcamento.cliente_id === clienteFiltro;
      const matchesEtapa = etapaFiltro === 'all' || orcamento.etapa_funil === etapaFiltro;
      
      // Lógica de período e status baseada se é período atual ou passado
      if (isCurrentPeriod) {
        // Período atual: TODOS os orçamentos ativos (ligados), independente do período cadastrado
        const matchesStatus = orcamento.active === true;
        return matchesSearch && matchesCliente && matchesEtapa && matchesStatus;
      } else {
        // Períodos passados: filtrar por período específico E considerar ativos e pausados
        const matchesPeriodo = orcamento.periodo_mes === mesFiltro && orcamento.periodo_ano === anoFiltro;
        const matchesStatus = ['ativo', 'pausado'].includes(orcamento.status_orcamento);
        return matchesSearch && matchesCliente && matchesEtapa && matchesPeriodo && matchesStatus;
      }
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orcamentos, searchTerm, clienteFiltro, etapaFiltro, mesFiltro, anoFiltro, sortField, sortDirection]);

  // Agrupamento por gestor com base no período/filters atuais
  const gestoresAggregados = useMemo(() => {
    const acc: Record<string, { totalPrevisto: number; totalGasto: number; funis: Array<{ nome_funil: string; cliente_nome: string; valor_investimento: number }> }> = {};

    // Considerar apenas orçamentos ativos
    for (const o of filteredAndSortedOrcamentos) {
      if (!o.active) continue; // Ignorar orçamentos desativados
      const gestorId = o.cliente_id ? clienteGestorMap[o.cliente_id] : null;
      if (!gestorId) continue;
      if (!acc[gestorId]) {
        acc[gestorId] = { totalPrevisto: 0, totalGasto: 0, funis: [] };
      }
      acc[gestorId].totalPrevisto += o.valor_investimento || 0;
      acc[gestorId].totalGasto += o.valor_gasto || 0;
      acc[gestorId].funis.push({ nome_funil: o.nome_funil, cliente_nome: o.cliente_nome || '', valor_investimento: o.valor_investimento || 0 });
    }

    const list = Object.entries(acc).map(([gestorId, data]) => ({
      gestorId,
      gestorNome: gestorInfoMap[gestorId]?.nome || 'Gestor sem nome',
      avatar_url: gestorInfoMap[gestorId]?.avatar_url,
      totalPrevisto: data.totalPrevisto,
      totalGasto: data.totalGasto,
      funis: data.funis
    }));

    // Ordenar por total previsto desc
    list.sort((a, b) => b.totalPrevisto - a.totalPrevisto);
    return list;
  }, [filteredAndSortedOrcamentos, clienteGestorMap, gestorInfoMap]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getEtapaLabel = (etapa: string) => {
    return ETAPAS_FUNIL.find(e => e.value === etapa)?.label || etapa;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge variant="secondary" className={`${statusOption?.color || 'bg-gray-500'} text-white`}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  // Totais do período selecionado
  const totalPrevisto = filteredAndSortedOrcamentos.reduce((sum, o) => sum + o.valor_investimento, 0);
  const totalGasto = filteredAndSortedOrcamentos.reduce((sum, o) => sum + o.valor_gasto, 0);
  const totalClientes = new Set(filteredAndSortedOrcamentos.map(o => o.cliente_id)).size;

  // Dados para o gráfico
  const chartData = useMemo(() => {
    const etapasData = ETAPAS_FUNIL.map(etapa => {
      const orcamentosEtapa = filteredAndSortedOrcamentos.filter(o => o.etapa_funil === etapa.value);
      return {
        etapa: etapa.label,
        previsto: orcamentosEtapa.reduce((sum, o) => sum + o.valor_investimento, 0),
        gasto: orcamentosEtapa.reduce((sum, o) => sum + o.valor_gasto, 0)
      };
    });
    return etapasData.filter(data => data.previsto > 0 || data.gasto > 0);
  }, [filteredAndSortedOrcamentos]);

  const uniqueClientesMap = new Map<string, string>();
  orcamentos.forEach((o) => {
    if (o.cliente_id && o.cliente_nome) uniqueClientesMap.set(o.cliente_id, o.cliente_nome);
  });
  const uniqueClientes = Array.from(uniqueClientesMap, ([id, nome]) => ({ id, nome }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando orçamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Orçamentos por Funil</h1>
          <p className="text-muted-foreground">
            Gerencie orçamentos de marketing organizados por funil e período
          </p>
        </div>
        
        {canManageBudgets && (
          <Button onClick={() => setModalNovo(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Orçamento
          </Button>
        )}
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsto ({MESES[mesFiltro - 1]?.label}/{anoFiltro})</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPrevisto)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto ({MESES[mesFiltro - 1]?.label}/{anoFiltro})</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalGasto)}</div>
            <p className="text-xs text-muted-foreground">
              {totalPrevisto > 0 ? `${((totalGasto / totalPrevisto) * 100).toFixed(1)}% do previsto` : '0% do previsto'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPrevisto - totalGasto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPrevisto - totalGasto)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClientes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Previsto vs Gasto por Etapa - {MESES[mesFiltro - 1]?.label}/{anoFiltro}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="etapa" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="previsto" fill="#3b82f6" name="Previsto" />
                <Bar dataKey="gasto" fill="#ef4444" name="Gasto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Orçamentos por Gestor */}
      {gestoresAggregados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Orçamentos por Gestor ({MESES[mesFiltro - 1]?.label}/{anoFiltro})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gestoresAggregados.map((g) => (
              <Card key={g.gestorId}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={g.avatar_url} />
                    <AvatarFallback>{g.gestorNome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{g.gestorNome}</CardTitle>
                    <div className="text-xs text-muted-foreground">Previsto {formatCurrency(g.totalPrevisto)}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {g.funis.slice(0,5).map((f, idx) => (
                    <div key={`${f.cliente_nome}-${f.nome_funil}-${idx}`} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.nome_funil}</p>
                        <p className="text-xs text-muted-foreground truncate">{f.cliente_nome}</p>
                      </div>
                      <div className="text-sm font-semibold">{formatCurrency(f.valor_investimento)}</div>
                    </div>
                  ))}
                  {g.funis.length > 5 && (
                    <div className="text-xs text-muted-foreground">+{g.funis.length - 5} funis adicionais</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {uniqueClientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={etapaFiltro} onValueChange={setEtapaFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {ETAPAS_FUNIL.map((etapa) => (
              <SelectItem key={etapa.value} value={etapa.value}>
                {etapa.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mesFiltro.toString()} onValueChange={(value) => setMesFiltro(Number(value))}>
          <SelectTrigger>
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((mes) => (
              <SelectItem key={mes.value} value={mes.value.toString()}>
                {mes.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={anoFiltro.toString()} onValueChange={(value) => setAnoFiltro(Number(value))}>
          <SelectTrigger>
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((ano) => (
              <SelectItem key={ano} value={ano.toString()}>
                {ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm('');
            setClienteFiltro('all');
            setEtapaFiltro('all');
            setMesFiltro(new Date().getMonth() + 1);
            setAnoFiltro(new Date().getFullYear());
          }}
        >
          Limpar Filtros
        </Button>
      </div>

      {/* Tabela de orçamentos */}
      {filteredAndSortedOrcamentos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum orçamento encontrado para o período selecionado.
              </p>
              {canManageBudgets && (
                <Button onClick={() => setModalNovo(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Orçamento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos - {MESES[mesFiltro - 1]?.label}/{anoFiltro}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo/Desativado</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('nome_funil')}
                    >
                      <div className="flex items-center gap-1">
                        Funil
                        {getSortIcon('nome_funil')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('cliente_nome')}
                    >
                      <div className="flex items-center gap-1">
                        Cliente
                        {getSortIcon('cliente_nome')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('etapa_funil')}
                    >
                      <div className="flex items-center gap-1">
                        Etapa
                        {getSortIcon('etapa_funil')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('valor_investimento')}
                    >
                      <div className="flex items-center gap-1">
                        Previsto
                        {getSortIcon('valor_investimento')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('valor_gasto')}
                    >
                      <div className="flex items-center gap-1">
                        Gasto
                        {getSortIcon('valor_gasto')}
                      </div>
                    </TableHead>
                    {canManageBudgets && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedOrcamentos.map((orcamento) => (
                    <TableRow key={orcamento.id}>
                      <TableCell>
                        <OrcamentoStatusToggle
                          orcamentoId={orcamento.id}
                          currentStatus={orcamento.active}
                          onStatusChange={(newStatus) => {
                            setOrcamentos(prev => prev.map(o => 
                              o.id === orcamento.id ? { ...o, active: newStatus } : o
                            ));
                          }}
                          disabled={!canManageBudgets}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{orcamento.nome_funil}</TableCell>
                      <TableCell>{orcamento.cliente_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getEtapaLabel(orcamento.etapa_funil)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-600 font-semibold">
                        {formatCurrency(orcamento.valor_investimento)}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        {formatCurrency(orcamento.valor_gasto)}
                      </TableCell>
                      {canManageBudgets && (
                        <TableCell>
                          <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setOrcamentoToDelete(orcamento.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
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
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <NovoOrcamentoModal
        open={modalNovo}
        onOpenChange={setModalNovo}
        onSuccess={loadOrcamentos}
      />
    </div>
  );
};