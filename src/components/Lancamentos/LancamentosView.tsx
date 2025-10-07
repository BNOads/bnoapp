import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, BarChart3, FileText, Filter, Search, X, Edit, Trash2, TrendingUp, Target } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NovoLancamentoModal from './NovoLancamentoModal';

import LancamentosTable from './LancamentosTable';


import EdicaoMassaLancamentosModal from './EdicaoMassaLancamentosModal';
import ExclusaoMassaModal from './ExclusaoMassaModal';
import GanttChart from './GanttChart';
import DashboardLancamentos from './DashboardLancamentos';

interface Lancamento {
  id: string;
  nome_lancamento: string;
  descricao?: string;
  status_lancamento: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao?: string;
  datas_cpls?: string[];
  data_inicio_remarketing?: string;
  data_fim_remarketing?: string;
  investimento_total: number;
  link_dashboard?: string;
  link_briefing?: string;
  observacoes?: string;
  meta_investimento?: number;
  resultado_obtido?: number;
  roi_percentual?: number;
  cliente_id?: string;
  created_at: string;
  updated_at: string;
  colaboradores?: {
    nome: string;
    avatar_url?: string;
  };
  clientes?: {
    nome: string;
  };
  gestor?: {
    id: string;
    nome: string;
  };
}

export const LancamentosView: React.FC = () => {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showEdicaoMassaModal, setShowEdicaoMassaModal] = useState(false);
  const [showExclusaoMassaModal, setShowExclusaoMassaModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('lista');
  const [statusTab, setStatusTab] = useState<'ativos' | 'finalizados'>('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [filtros, setFiltros] = useState({
    status: 'all',
    tipo: 'all',
    cliente: 'all'
  });
  const [clienteGestorMap, setClienteGestorMap] = useState<Record<string, string | null>>({});
  const [gestorInfoMap, setGestorInfoMap] = useState<Record<string, { nome: string; avatar_url?: string }>>({});
  
  const { toast } = useToast();

  const statusColors = {
    'em_captacao': 'bg-blue-500',
    'cpl': 'bg-orange-500',
    'remarketing': 'bg-purple-500',
    'finalizado': 'bg-green-500',
    'pausado': 'bg-yellow-500',
    'cancelado': 'bg-red-500'
  };

  const statusLabels = {
    'em_captacao': 'Em Captação',
    'cpl': 'CPL',
    'remarketing': 'Remarketing',
    'finalizado': 'Finalizado',
    'pausado': 'Pausado',
    'cancelado': 'Cancelado'
  };

  const tipoLabels = {
    'semente': 'Semente',
    'interno': 'Interno',
    'externo': 'Externo',
    'perpetuo': 'Perpétuo',
    'flash': 'Flash',
    'evento': 'Evento',
    'tradicional': 'Lançamento Tradicional',
    'captacao_simples': 'Captação simples',
    'outro': 'Outro'
  };

  const fetchLancamentos = async () => {
    try {
      let query = supabase
        .from('lancamentos')
        .select(`
          *,
          clientes:cliente_id (nome, slug, aliases),
          gestor:gestor_responsavel_id (id, nome)
        `)
        .eq('ativo', true);

      // Filtrar por status de acordo com a aba ativa
      if (statusTab === 'ativos') {
        query = query.in('status_lancamento', ['em_captacao', 'cpl', 'remarketing', 'pausado']);
      } else {
        query = query.eq('status_lancamento', 'finalizado');
      }

      // Aplicar filtros adicionais
      if (filtros.status && filtros.status !== 'all') {
        query = query.eq('status_lancamento', filtros.status as any);
      }
      if (filtros.tipo && filtros.tipo !== 'all') {
        query = query.eq('tipo_lancamento', filtros.tipo as any);
      }
      if (filtros.cliente && filtros.cliente !== 'all') {
        query = query.eq('cliente_id', filtros.cliente);
      }

      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar lançamentos:', error);
        toast({
          title: "Erro ao carregar lançamentos",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Remove duplicatas baseado no ID e também por chave composta (nome + cliente + data_inicio)
      const byId = Array.from(new Map((data || []).map((item: any) => [item.id, item])).values());
      const byCompositeMap = new Map<string, any>();
      for (const item of byId) {
        const key = `${item.nome_lancamento}|${item.cliente_id ?? ''}|${item.data_inicio_captacao}`;
        const existing = byCompositeMap.get(key);
        if (!existing) {
          byCompositeMap.set(key, item);
        } else {
          // manter o mais recente pelo updated_at
          const prev = new Date(existing.updated_at || existing.created_at).getTime();
          const curr = new Date(item.updated_at || item.created_at).getTime();
          if (curr > prev) byCompositeMap.set(key, item);
        }
      }
      const uniqueLancamentos = Array.from(byCompositeMap.values());

      // Buscar mapeamento de clientes -> gestores
      const clienteIds = Array.from(new Set(uniqueLancamentos.map((l: any) => l.cliente_id).filter(Boolean)));
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, primary_gestor_user_id')
        .in('id', clienteIds.length > 0 ? clienteIds : ['00000000-0000-0000-0000-000000000000']);

      const clienteMap: Record<string, string | null> = {};
      clientesData?.forEach((c) => { clienteMap[c.id] = c.primary_gestor_user_id || null; });
      setClienteGestorMap(clienteMap);

      // Buscar informações dos gestores
      const gestorUserIds = Array.from(new Set(Object.values(clienteMap).filter(Boolean) as string[]));
      const { data: colaboradoresData } = await supabase
        .from('colaboradores')
        .select('user_id, nome, avatar_url')
        .in('user_id', gestorUserIds.length > 0 ? gestorUserIds : ['00000000-0000-0000-0000-000000000000']);

      const gestorMap: Record<string, { nome: string; avatar_url?: string }> = {};
      colaboradoresData?.forEach((col) => { 
        gestorMap[col.user_id] = { nome: col.nome, avatar_url: col.avatar_url || undefined }; 
      });
      setGestorInfoMap(gestorMap);

      setLancamentos(uniqueLancamentos as any);
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      toast({
        title: "Erro ao carregar lançamentos",
        description: "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLancamentos();
  }, [filtros, searchTerm, statusTab]);

  const handleLancamentoCriado = () => {
    fetchLancamentos();
    setShowNovoModal(false);
    toast({
      title: "Lançamento criado",
      description: "O lançamento foi criado com sucesso.",
    });
  };


  const handleEdicaoMassaConcluida = () => {
    fetchLancamentos();
    setSelectedIds([]);
    setShowEdicaoMassaModal(false);
  };

  const handleExclusaoMassaConcluida = () => {
    fetchLancamentos();
    setSelectedIds([]);
    setShowExclusaoMassaModal(false);
  };


  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || '';
  };

  // Filtrar por termo de pesquisa
  let lancamentosFiltrados = lancamentos.filter(l => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      l.nome_lancamento.toLowerCase().includes(searchLower) ||
      l.descricao?.toLowerCase().includes(searchLower) ||
      l.clientes?.nome.toLowerCase().includes(searchLower)
    );
  });

  // Aplicar ordenação
  if (sortConfig !== null) {
    lancamentosFiltrados = [...lancamentosFiltrados].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Agrupamento por gestor - cálculo derivado sem hooks para evitar ordem variável de hooks
  const gestoresAggregados = (() => {
    const acc: Record<string, { 
      totalInvestimento: number; 
      lancamentos: Array<{ nome: string; cliente_nome: string; investimento: number }> 
    }> = {};

    for (const l of lancamentosFiltrados) {
      const gestorUserId = l.cliente_id ? clienteGestorMap[l.cliente_id] : null;
      if (!gestorUserId) continue;
      
      if (!acc[gestorUserId]) {
        acc[gestorUserId] = { totalInvestimento: 0, lancamentos: [] };
      }
      acc[gestorUserId].totalInvestimento += Number(l.investimento_total) || 0;
      acc[gestorUserId].lancamentos.push({ 
        nome: l.nome_lancamento, 
        cliente_nome: l.clientes?.nome || '', 
        investimento: Number(l.investimento_total) || 0 
      });
    }

    const list = Object.entries(acc).map(([gestorUserId, data]) => ({
      gestorUserId,
      gestorNome: gestorInfoMap[gestorUserId]?.nome || 'Gestor sem nome',
      avatar_url: gestorInfoMap[gestorUserId]?.avatar_url,
      totalInvestimento: data.totalInvestimento,
      lancamentos: data.lancamentos
    }));

    list.sort((a, b) => b.totalInvestimento - a.totalInvestimento);
    return list;
  })();


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Lançamentos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os lançamentos e campanhas da sua equipe
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Stats sempre com base em TODOS os lançamentos, não nos filtrados
  const stats = {
    total: lancamentos.length,
    ativos: lancamentos.filter(l => ['em_captacao', 'cpl', 'remarketing'].includes(l.status_lancamento)).length,
    investimentoTotal: lancamentos.reduce((sum, l) => sum + Number(l.investimento_total), 0),
    finalizados: lancamentos.filter(l => l.status_lancamento === 'finalizado').length
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Lançamentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os lançamentos e campanhas da sua equipe
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar lançamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowEdicaoMassaModal(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar Selecionados ({selectedIds.length})
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowExclusaoMassaModal(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Selecionados ({selectedIds.length})
              </Button>
            </>
          )}
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          
          <Button
            onClick={() => setShowNovoModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total de Lançamentos</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Lançamentos Ativos</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.ativos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Investimento Total</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              R$ {stats.investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Finalizados</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.finalizados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Lançamentos por Gestor */}
      {gestoresAggregados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Lançamentos por Gestor
            </CardTitle>
            <CardDescription>
              Investimento total agrupado por gestor responsável
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gestoresAggregados.map((gestor) => (
                <Card key={gestor.gestorUserId} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={gestor.avatar_url} />
                          <AvatarFallback>
                            {gestor.gestorNome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{gestor.gestorNome}</h3>
                          <p className="text-sm text-muted-foreground">
                            {gestor.lancamentos.length} {gestor.lancamentos.length === 1 ? 'lançamento' : 'lançamentos'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Total Investido</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(gestor.totalInvestimento)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {gestor.lancamentos.slice(0, 3).map((lanc, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                          <div className="flex-1">
                            <span className="font-medium">{lanc.nome}</span>
                            {lanc.cliente_nome && (
                              <span className="text-muted-foreground ml-2">• {lanc.cliente_nome}</span>
                            )}
                          </div>
                          <span className="font-semibold ml-4">{formatCurrency(lanc.investimento)}</span>
                        </div>
                      ))}
                      {gestor.lancamentos.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{gestor.lancamentos.length - 3} mais {gestor.lancamentos.length - 3 === 1 ? 'lançamento' : 'lançamentos'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Status (Ativos/Finalizados) */}
      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as 'ativos' | 'finalizados')}>
        <TabsList>
          <TabsTrigger value="ativos">Lançamentos Ativos</TabsTrigger>
          <TabsTrigger value="finalizados">Lançamentos Finalizados</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="space-y-4">
          {/* Tabs de Visualização */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="gantt">Gantt</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>

            <TabsContent value="lista" className="space-y-4">
              <LancamentosTable
            lancamentos={lancamentosFiltrados}
            onRefresh={fetchLancamentos}
            statusColors={statusColors}
            statusLabels={statusLabels}
            tipoLabels={tipoLabels}
            showFilters={showFilters}
            filtros={filtros}
            onFiltrosChange={setFiltros}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onSort={handleSort}
            sortConfig={sortConfig}
          />
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <GanttChart 
            lancamentos={lancamentosFiltrados}
            statusColors={statusColors}
            statusLabels={statusLabels}
          />
        </TabsContent>

            <TabsContent value="dashboard" className="space-y-4">
              <DashboardLancamentos 
                lancamentos={lancamentosFiltrados}
                statusLabels={statusLabels}
                tipoLabels={tipoLabels}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <NovoLancamentoModal
        open={showNovoModal}
        onOpenChange={setShowNovoModal}
        onLancamentoCriado={handleLancamentoCriado}
      />


      <EdicaoMassaLancamentosModal
        open={showEdicaoMassaModal}
        onOpenChange={setShowEdicaoMassaModal}
        selectedIds={selectedIds}
        onEdicaoCompleta={handleEdicaoMassaConcluida}
      />

      <ExclusaoMassaModal
        open={showExclusaoMassaModal}
        onOpenChange={setShowExclusaoMassaModal}
        selectedIds={selectedIds}
        lancamentos={lancamentosFiltrados}
        onExclusaoCompleta={handleExclusaoMassaConcluida}
      />
    </div>
  );
};

export default LancamentosView;