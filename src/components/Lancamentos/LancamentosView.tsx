import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, BarChart3, Calendar, FileText, Import, Filter, Search, X, Edit } from 'lucide-react';
import NovoLancamentoModal from './NovoLancamentoModal';
import ImportarLancamentosModal from './ImportarLancamentosModal';
import LancamentosTable from './LancamentosTable';
import { ImportCSVButton } from './ImportCSVButton';
import EdicaoMassaLancamentosModal from './EdicaoMassaLancamentosModal';
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEdicaoMassaModal, setShowEdicaoMassaModal] = useState(false);
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

      const lista = (data as any) || [];
      // Remover duplicados por nome, mantendo o mais recente (updated_at)
      const map = new Map<string, any>();
      for (const item of lista) {
        const key = (item.nome_lancamento || '').trim().toLowerCase();
        const prev = map.get(key);
        if (!prev || new Date(item.updated_at) > new Date(prev.updated_at)) {
          map.set(key, item);
        }
      }
      setLancamentos(Array.from(map.values()));
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

  const handleImportacaoConcluida = () => {
    fetchLancamentos();
    setShowImportModal(false);
    toast({
      title: "Importação concluída",
      description: "Os lançamentos foram importados com sucesso.",
    });
  };

  const handleEdicaoMassaConcluida = () => {
    fetchLancamentos();
    setSelectedIds([]);
    setShowEdicaoMassaModal(false);
  };

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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const stats = {
    total: lancamentosFiltrados.length,
    ativos: lancamentosFiltrados.filter(l => ['em_captacao', 'cpl', 'remarketing'].includes(l.status_lancamento)).length,
    investimentoTotal: lancamentosFiltrados.reduce((sum, l) => sum + Number(l.investimento_total), 0),
    finalizados: lancamentosFiltrados.filter(l => l.status_lancamento === 'finalizado').length
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
            <Button
              variant="outline"
              onClick={() => setShowEdicaoMassaModal(true)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar Selecionados ({selectedIds.length})
            </Button>
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
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="gap-2"
          >
            <Import className="h-4 w-4" />
            Importar
          </Button>
          
          <ImportCSVButton onImportComplete={handleImportacaoConcluida} />
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

      <ImportarLancamentosModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportacaoConcluida={handleImportacaoConcluida}
      />

      <EdicaoMassaLancamentosModal
        open={showEdicaoMassaModal}
        onOpenChange={setShowEdicaoMassaModal}
        selectedIds={selectedIds}
        onEdicaoCompleta={handleEdicaoMassaConcluida}
      />
    </div>
  );
};

export default LancamentosView;