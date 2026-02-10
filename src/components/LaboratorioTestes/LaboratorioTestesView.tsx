import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Plus, Search, Filter, X, Beaker, TrendingUp, Activity, CalendarDays, LayoutList, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLaboratorioTestes } from '@/hooks/useLaboratorioTestes';
import { useTestePermissions } from '@/hooks/useTestePermissions';
import { supabase } from '@/integrations/supabase/client';
import { TestesTable } from './TestesTable';
import { NovoTesteModal } from './NovoTesteModal';
import { EditarTesteModal } from './EditarTesteModal';
import { ConcluirTesteModal, type ConcluirTesteData } from './ConcluirTesteModal';
import { TesteRelatorios } from './TesteRelatorios';
import { TemplatesManager } from './TemplatesManager';
import type { TesteFilters, TesteLaboratorio } from '@/types/laboratorio-testes';
import { DEFAULT_FILTERS, STATUS_LABELS, VALIDACAO_LABELS, TIPO_LABELS, CANAL_LABELS } from '@/types/laboratorio-testes';
import { TestesGroupedView } from './TestesGroupedView';

export const LaboratorioTestesView = () => {
  const navigate = useNavigate();
  const { canCreate, canArchive, canManageTemplates, canEditAll, canEditOwn, currentUserId, currentColaboradorId, loading: permLoading } = useTestePermissions();

  const [filters, setFilters] = useState<TesteFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [editingTeste, setEditingTeste] = useState<TesteLaboratorio | null>(null);
  const [concludingTesteId, setConcludingTesteId] = useState<string | null>(null);
  const [concludingTesteName, setConcludingTesteName] = useState('');
  const [viewMode, setViewMode] = useState<'lista' | 'agrupado'>('lista');

  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [gestores, setGestores] = useState<{ id: string; user_id: string; nome: string }[]>([]);
  const [funis, setFunis] = useState<string[]>([]);

  const { testes, loading, createTeste, updateTeste, archiveTeste, duplicateTeste, refetch } = useLaboratorioTestes(filters, currentUserId, currentColaboradorId);

  // Load clients and gestores for filter dropdowns
  useEffect(() => {
    supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => {
      if (data) setClientes(data);
    });
    supabase.from('colaboradores').select('id, user_id, nome').eq('ativo', true).order('nome').then(({ data }) => {
      if (data) setGestores(data);
    });
  }, []);

  // Load funnels from orcamentos_funil when client filter changes
  useEffect(() => {
    if (filters.cliente_id) {
      supabase
        .from('orcamentos_funil')
        .select('nome_funil')
        .eq('cliente_id', filters.cliente_id)
        .eq('ativo', true)
        .order('nome_funil')
        .then(({ data }) => {
          const uniqueFunis = [...new Set((data || []).map((d: any) => d.nome_funil).filter(Boolean))];
          setFunis(uniqueFunis);
        });
    } else {
      setFunis([]);
    }
  }, [filters.cliente_id]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const total = testes.length;
    const rodando = testes.filter(t => t.status === 'rodando').length;
    const concluidos = testes.filter(t => t.status === 'concluido').length;
    const vencedores = testes.filter(t => t.validacao === 'deu_bom').length;
    const taxaSucesso = concluidos > 0 ? Math.round((vencedores / concluidos) * 100) : 0;
    const doMes = testes.filter(t => t.created_at >= monthStart).length;
    return { total, rodando, taxaSucesso, doMes };
  }, [testes]);

  const updateFilter = (key: keyof TesteFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleEdit = (teste: TesteLaboratorio) => {
    if (canEditAll || (canEditOwn && teste.gestor?.user_id === currentUserId)) {
      setEditingTeste(teste);
    }
  };

  const handleArchive = async (id: string) => {
    if (canArchive) {
      await archiveTeste(id);
    }
  };

  const handleDuplicate = async (teste: TesteLaboratorio) => {
    await duplicateTeste(teste);
  };

  const handleStartTeste = async (id: string) => {
    await updateTeste(id, { status: 'rodando', data_inicio: new Date().toISOString().split('T')[0] } as any);
    refetch();
  };

  const handleConcludeTeste = (id: string) => {
    const teste = testes.find(t => t.id === id);
    setConcludingTesteId(id);
    setConcludingTesteName(teste?.nome || '');
  };

  const handleConfirmConclude = async (data: ConcluirTesteData) => {
    if (!concludingTesteId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('testes_laboratorio').update({
      status: 'concluido',
      data_fim: new Date().toISOString().split('T')[0],
      validacao: data.validacao,
      resultado_observado: data.resultado_observado ? parseFloat(data.resultado_observado) : null,
      aprendizados: data.aprendizados || null,
    }).eq('id', concludingTesteId);

    // Insert comment with the result description
    await supabase.from('testes_laboratorio_comentarios').insert({
      teste_id: concludingTesteId,
      autor_user_id: user.id,
      comentario: `[Conclusao do teste] ${data.comentario}`,
    });

    await supabase.from('testes_laboratorio_audit_log').insert({
      teste_id: concludingTesteId,
      acao: 'concluido',
      campo_alterado: 'status',
      valor_anterior: 'rodando',
      valor_novo: 'concluido',
      user_id: user.id,
    });

    setConcludingTesteId(null);
    refetch();
  };

  const handleRedoTeste = async (id: string) => {
    await updateTeste(id, { status: 'rodando', data_fim: '', validacao: 'em_teste' as any } as any);
    refetch();
  };

  const handleNavigate = (id: string) => {
    navigate(`/laboratorio-testes/${id}`);
  };

  const hasActiveFilters = filters.cliente_id || filters.funil || filters.gestor_id ||
    filters.tipo_teste || filters.canal || filters.status || filters.validacao ||
    filters.data_inicio || filters.data_fim;

  if (permLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100">
            <FlaskConical className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Laboratorio de Testes
            </h1>
            <p className="text-sm text-muted-foreground">
              Registre, acompanhe e aprenda com testes de trafego
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar testes..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center p-1 bg-muted rounded-lg border ml-2">
            <Button
              variant={viewMode === 'lista' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('lista')}
              className={viewMode === 'lista' ? 'bg-white shadow-sm h-8 px-3' : 'h-8 px-3 text-muted-foreground'}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Tabela
            </Button>
            <Button
              variant={viewMode === 'agrupado' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('agrupado')}
              className={viewMode === 'agrupado' ? 'bg-white shadow-sm h-8 px-3' : 'h-8 px-3 text-muted-foreground'}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Agrupado
            </Button>
          </div>
          {canCreate && (
            <Button
              onClick={() => setShowNovoModal(true)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Teste
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total de Testes
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-2 rounded-full bg-violet-50">
                  <Beaker className="h-5 w-5 text-violet-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Rodando
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.rodando}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-50">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Taxa de Sucesso
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.taxaSucesso}%</p>
                </div>
                <div className="p-2 rounded-full bg-emerald-50">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Testes do Mes
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.doMes}</p>
                </div>
                <div className="p-2 rounded-full bg-amber-50">
                  <CalendarDays className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          {([
            { value: 'todos', label: 'Todos' },
            { value: 'meus', label: 'Meus Testes' },
            { value: 'time', label: 'Testes do Time' },
            { value: 'vencedores', label: 'Testes Vencedores' },
          ] as const).map((qf) => (
            <Button
              key={qf.value}
              variant={filters.quick_filter === qf.value ? 'default' : 'outline'}
              size="sm"
              className={
                filters.quick_filter === qf.value
                  ? 'bg-violet-600 hover:bg-violet-700'
                  : ''
              }
              onClick={() => updateFilter('quick_filter', qf.value)}
            >
              {qf.label}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={hasActiveFilters ? 'border-violet-300 text-violet-700' : ''}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs bg-violet-100 text-violet-700">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                <Select
                  value={filters.cliente_id || 'all'}
                  onValueChange={(v) => updateFilter('cliente_id', v === 'all' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Funil */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Funil</label>
                <Select
                  value={filters.funil || 'all'}
                  onValueChange={(v) => updateFilter('funil', v === 'all' ? '' : v)}
                  disabled={!filters.cliente_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filters.cliente_id ? 'Selecione o funil' : 'Selecione um cliente primeiro'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os funis</SelectItem>
                    {funis.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gestor */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Gestor</label>
                <Select
                  value={filters.gestor_id || 'all'}
                  onValueChange={(v) => updateFilter('gestor_id', v === 'all' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os gestores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os gestores</SelectItem>
                    {gestores.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select
                  value={filters.tipo_teste || 'all'}
                  onValueChange={(v) => updateFilter('tipo_teste', v === 'all' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {Object.entries(TIPO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Validacao */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Validacao</label>
                <Select
                  value={filters.validacao || 'all'}
                  onValueChange={(v) => updateFilter('validacao', v === 'all' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as validacoes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as validacoes</SelectItem>
                    {Object.entries(VALIDACAO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Inicio */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data Inicio</label>
                <Input
                  type="date"
                  value={filters.data_inicio}
                  onChange={(e) => updateFilter('data_inicio', e.target.value)}
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
                <Input
                  type="date"
                  value={filters.data_fim}
                  onChange={(e) => updateFilter('data_fim', e.target.value)}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="lista" className="w-full">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="relatorios">Relatorios</TabsTrigger>
          {canManageTemplates && (
            <TabsTrigger value="templates">Templates</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/6" />
                      <div className="h-4 bg-gray-200 rounded w-1/6" />
                      <div className="h-4 bg-gray-200 rounded w-1/8" />
                      <div className="flex-1" />
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : testes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-violet-50 mb-4">
                  <FlaskConical className="h-12 w-12 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum teste encontrado
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {filters.search || hasActiveFilters
                    ? 'Nenhum teste corresponde aos filtros aplicados. Tente ajustar os criterios de busca.'
                    : 'O laboratorio esta vazio. Comece registrando seu primeiro teste de trafego para acompanhar hipoteses, resultados e aprendizados.'}
                </p>
                {canCreate && !filters.search && !hasActiveFilters && (
                  <Button
                    onClick={() => setShowNovoModal(true)}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Teste
                  </Button>
                )}
                {(filters.search || hasActiveFilters) && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            viewMode === 'lista' ? (
              <TestesTable
                testes={testes}
                loading={loading}
                onNavigate={handleNavigate}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onDuplicate={handleDuplicate}
                onStartTeste={handleStartTeste}
                onConcludeTeste={handleConcludeTeste}
                onRedoTeste={handleRedoTeste}
                canEditAll={canEditAll}
                canEditOwn={canEditOwn}
                canArchive={canArchive}
                currentUserId={currentUserId}
              />
            ) : (
              <TestesGroupedView
                testes={testes}
                loading={loading}
                onNavigate={handleNavigate}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onDuplicate={handleDuplicate}
                onStartTeste={handleStartTeste}
                onConcludeTeste={handleConcludeTeste}
                onRedoTeste={handleRedoTeste}
                canEditAll={canEditAll}
                canEditOwn={canEditOwn}
                canArchive={canArchive}
                currentUserId={currentUserId}
              />
            )
          )}
        </TabsContent>

        <TabsContent value="relatorios" className="mt-4">
          <TesteRelatorios />
        </TabsContent>

        {canManageTemplates && (
          <TabsContent value="templates" className="mt-4">
            <TemplatesManager />
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      <NovoTesteModal
        open={showNovoModal}
        onOpenChange={setShowNovoModal}
        onSuccess={refetch}
        createTeste={createTeste}
        currentColaboradorId={currentColaboradorId}
      />

      {editingTeste && (
        <EditarTesteModal
          open={!!editingTeste}
          onOpenChange={(open) => { if (!open) setEditingTeste(null); }}
          teste={editingTeste}
          onSuccess={refetch}
          updateTeste={updateTeste}
        />
      )}

      <ConcluirTesteModal
        open={!!concludingTesteId}
        onOpenChange={(open) => { if (!open) setConcludingTesteId(null); }}
        onConfirm={handleConfirmConclude}
        testeName={concludingTesteName}
      />
    </div>
  );
};
