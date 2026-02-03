import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, FileText, Link2, Video, Search, Plus, Copy, Eye, Trash2, Upload, Edit, UserCheck, Filter, ArrowUpDown, EditIcon, Users, Sheet, Pause, CheckCircle, ChevronDown, MoreHorizontal, LayoutList, LayoutGrid, GripVertical, History } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoClienteModal } from "./NovoClienteModal";
import { DeleteClienteModal } from "./DeleteClienteModal";
import { InativarClienteModal } from "./InativarClienteModal";
import { ReativarClienteModal } from "./ReativarClienteModal";
import { ImportarClientesModal } from "./ImportarClientesModal";
import { EditarClienteModal } from "./EditarClienteModal";
import { EdicaoMassaModal } from "./EdicaoMassaModal";
import { AlocacaoClientes } from "./AlocacaoClientes";
import { KickoffModal } from "./KickoffModal";
import { TeamAssignmentModal } from "./TeamAssignmentModal";
import { HistoricoStatusModal } from "./HistoricoStatusModal";
import { ClientesGroupedView } from "./ClientesGroupedView";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
interface Cliente {
  id: string;
  nome: string;
  categoria?: string;
  serie?: string;
  status_cliente?: string;
  etapa_atual?: string;
  funis_trabalhando?: string[];
  primary_gestor_user_id?: string;
  primary_cs_user_id?: string;
  catalogo_criativos_url?: string;
  primary_gestor?: {
    id: string;
    nome: string;
    avatar_url?: string;
  };
  primary_cs?: {
    id: string;
    nome: string;
    avatar_url?: string;
  };
  client_roles?: Array<{
    user_id: string;
    role: 'gestor' | 'cs';
    is_primary: boolean;
  }>;
}
// Componente de TableHead arrastável
interface SortableTableHeadProps {
  id: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const SortableTableHead = ({ id, children, onClick, className }: SortableTableHeadProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={className}
    >
      <div className="flex items-center gap-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-primary p-1 -ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center flex-1 cursor-pointer" onClick={onClick}>
          {children}
        </div>
      </div>
    </TableHead>
  );
};

export const ClientesView = () => {
  const {
    canCreateContent
  } = useUserPermissions();
  const [activeTab, setActiveTab] = useState<'ativos' | 'desativados'>('ativos');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [inativarModalOpen, setInativarModalOpen] = useState(false);
  const [reativarModalOpen, setReativarModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [edicaoMassaModalOpen, setEdicaoMassaModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [clienteToInativar, setClienteToInativar] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [clienteToReativar, setClienteToReativar] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [clienteToEdit, setClienteToEdit] = useState<any | null>(null);
  const [kickoffModalOpen, setKickoffModalOpen] = useState(false);
  const [clienteKickoff, setClienteKickoff] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [clienteTeam, setClienteTeam] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [serieFilter, setSerieFilter] = useState<string>('all');
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [groupBy, setGroupBy] = useState<'gestor' | 'cs'>('gestor');

  // Definição das colunas configuráveis
  const columnDefinitions = [
    { id: 'categoria', label: 'Categoria', default: true },
    { id: 'serie', label: 'Série', default: true },
    { id: 'situacao_cliente', label: 'Situação do Cliente', default: true },
    { id: 'etapa_onboarding', label: 'Etapa Onboarding', default: true },
    { id: 'etapa_trafego', label: 'Etapas de Tráfego', default: true },
    { id: 'gestor', label: 'Gestor', default: true },
    { id: 'cs', label: 'CS', default: true },
  ];

  const defaultColumnOrder = columnDefinitions.map(c => c.id);

  // Estado para colunas visíveis (carrega do localStorage)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('clientes_visible_columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return columnDefinitions.filter(c => c.default).map(c => c.id);
      }
    }
    return columnDefinitions.filter(c => c.default).map(c => c.id);
  });

  // Estado para ordem das colunas (carrega do localStorage)
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('clientes_column_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garantir que todas as colunas estejam presentes
        const allColumns = new Set(defaultColumnOrder);
        const validOrder = parsed.filter((id: string) => allColumns.has(id));
        const missing = defaultColumnOrder.filter(id => !validOrder.includes(id));
        return [...validOrder, ...missing];
      } catch {
        return defaultColumnOrder;
      }
    }
    return defaultColumnOrder;
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler para reordenação de colunas
  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        localStorage.setItem('clientes_column_order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  // Colunas ordenadas e filtradas por visibilidade
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter(id => visibleColumns.includes(id));
  }, [columnOrder, visibleColumns]);

  // Persistir preferências de colunas no localStorage
  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId];
      localStorage.setItem('clientes_visible_columns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);
  
  const getColumnLabel = (columnId: string) => {
    return columnDefinitions.find(c => c.id === columnId)?.label || columnId;
  };

  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const carregarClientes = async () => {
    try {
      const isActive = activeTab === 'ativos';
      const {
        data,
        error
      } = await supabase.from('clientes').select(`
          *,
          primary_gestor:colaboradores!clientes_primary_gestor_user_id_fkey(user_id, nome, avatar_url),
          primary_cs:colaboradores!clientes_primary_cs_user_id_fkey(user_id, nome, avatar_url),
          client_roles(
            user_id, role, is_primary,
            colaboradores(user_id, nome, avatar_url)
          )
        `).eq('ativo', true).eq('is_active', isActive).is('deleted_at', null).order('created_at', {
        ascending: false
      });
      if (error) {
        throw error;
      }
      setClientes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const carregarColaboradores = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('colaboradores').select('user_id, nome, email, avatar_url, nivel_acesso').eq('ativo', true);
      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error('Error loading colaboradores:', error);
    }
  };
  useEffect(() => {
    carregarClientes();
    carregarColaboradores();
  }, [activeTab]);
  const getStatusColor = (etapa: string) => {
    switch (etapa) {
      case 'ativo':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'implantacao':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'negociacao':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'pausa':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const getStatusLabel = (etapa: string) => {
    switch (etapa) {
      case 'ativo':
        return 'Ativo';
      case 'implantacao':
        return 'Implantação';
      case 'negociacao':
        return 'Negociação';
      case 'pausa':
        return 'Em Pausa';
      case 'prospecção':
        return 'Prospecção';
      case 'apresentacao':
        return 'Apresentação';
      case 'contrato':
        return 'Contrato';
      default:
        return 'Indefinido';
    }
  };
  const formatarDataAcesso = (data: string) => {
    if (!data) return 'Nunca';
    const agora = new Date();
    const acesso = new Date(data);
    const diff = agora.getTime() - acesso.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const dias = Math.floor(horas / 24);
    if (horas < 1) return 'Agora há pouco';
    if (horas < 24) return `${horas}h atrás`;
    if (dias === 1) return '1 dia atrás';
    return `${dias} dias atrás`;
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência."
    });
  };
  const handleCatalogoClick = (cliente: Cliente, event: React.MouseEvent) => {
    const targetUrl = cliente.catalogo_criativos_url || `/criativos/${cliente.id}`;

    // Se for Ctrl/Cmd + clique, abrir em nova aba
    if (event.ctrlKey || event.metaKey) {
      window.open(targetUrl, '_blank');
    } else {
      // Clique simples, navegar na mesma aba
      if (cliente.catalogo_criativos_url) {
        window.location.href = cliente.catalogo_criativos_url;
      } else {
        navigate(targetUrl, {
          state: {
            from: '/?tab=clientes'
          }
        });
      }
    }
  };
  const handleInativarClick = (cliente: any) => {
    setClienteToInativar({
      id: cliente.id,
      nome: cliente.nome
    });
    setInativarModalOpen(true);
  };

  const handleReativarClick = (cliente: any) => {
    setClienteToReativar({
      id: cliente.id,
      nome: cliente.nome
    });
    setReativarModalOpen(true);
  };

  const handleDeleteClick = (cliente: any) => {
    setClienteToDelete({
      id: cliente.id,
      nome: cliente.nome
    });
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setClienteToDelete(null);
    carregarClientes();
  };

  const handleInativarSuccess = () => {
    setInativarModalOpen(false);
    setClienteToInativar(null);
    carregarClientes();
  };

  const handleReativarSuccess = () => {
    setReativarModalOpen(false);
    setClienteToReativar(null);
    carregarClientes();
  };
  const handleEditClick = (cliente: any) => {
    setClienteToEdit(cliente);
    setEditModalOpen(true);
  };
  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setClienteToEdit(null);
    carregarClientes();
  };
  const handleEdicaoMassaSuccess = () => {
    setEdicaoMassaModalOpen(false);
    setClientesSelecionados([]);
    carregarClientes();
  };

  // Filtrar clientes baseado nos filtros ativos
  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) || cliente.serie?.toLowerCase().includes(searchTerm.toLowerCase()) || cliente.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFilter === 'all' || !categoriaFilter || cliente.categoria === categoriaFilter;
    const matchesSerie = serieFilter === 'all' || !serieFilter || cliente.serie === serieFilter;
    return matchesSearch && matchesCategoria && matchesSerie;
  });

  // Funções de seleção múltipla
  const toggleClienteSelection = (clienteId: string) => {
    setClientesSelecionados(prev => prev.includes(clienteId) ? prev.filter(id => id !== clienteId) : [...prev, clienteId]);
  };
  const toggleSelectAll = () => {
    if (clientesSelecionados.length === filteredClientes.length) {
      setClientesSelecionados([]);
    } else {
      setClientesSelecionados(filteredClientes.map(c => c.id));
    }
  };

  // Função de ordenação
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Aplicar ordenação aos clientes filtrados
  const sortedAndFilteredClientes = [...filteredClientes].sort((a, b) => {
    let aValue, bValue;

    // Tratamento especial para campos de gestor e cs
    if (sortField === 'gestor') {
      aValue = a.primary_gestor?.nome || '';
      bValue = b.primary_gestor?.nome || '';
    } else if (sortField === 'cs') {
      aValue = a.primary_cs?.nome || '';
      bValue = b.primary_cs?.nome || '';
    } else {
      aValue = a[sortField];
      bValue = b[sortField];
    }

    // Tratar valores nulos
    if (!aValue) aValue = '';
    if (!bValue) bValue = '';

    // Para campos de string
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Obter listas únicas para os filtros
  const categorias = [...new Set(clientes.map(c => c.categoria).filter(Boolean))];
  const series = ['Serie A', 'Serie B', 'Serie C', 'Serie D'];
  const limparFiltros = () => {
    setCategoriaFilter('all');
    setSerieFilter('all');
    setSearchTerm('');
    setClientesSelecionados([]);
  };

  // Função para obter cor da série
  const getSerieColor = (serie: string) => {
    switch (serie) {
      case 'Serie A':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Serie B':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Serie C':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'Serie D':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Função para atualizar série do cliente
  const handleSerieChange = async (clienteId: string, novaSerie: string, serieAnterior: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ serie: novaSerie } as any)
        .eq('id', clienteId);

      if (error) throw error;

      // Registrar no audit log
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User para audit (serie):', user?.id);
      if (user) {
        const auditData = {
          user_id: user.id,
          cliente_id: clienteId,
          acao: 'alteracao_status',
          motivo: JSON.stringify({
            campo: 'serie',
            valor_anterior: serieAnterior,
            valor_novo: novaSerie
          })
        };
        console.log('Inserindo audit (serie):', auditData);
        const { data: auditResult, error: auditError } = await supabase
          .from('clientes_audit_log')
          .insert(auditData)
          .select();
        console.log('Resultado audit (serie):', auditResult, 'Erro:', auditError);
        if (auditError) console.error('Erro ao registrar audit:', auditError);
      }

      toast({
        title: "Série atualizada",
        description: "A série do cliente foi atualizada com sucesso.",
      });

      carregarClientes();
    } catch (error: any) {
      console.error('Erro ao atualizar série:', error);
      toast({
        title: "Erro ao atualizar série",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Opções para Situação do Cliente
  const situacaoClienteOptions = [
    { value: 'nao_iniciado', label: 'Não Iniciado', color: 'bg-gray-500' },
    { value: 'alerta', label: 'Alerta', color: 'bg-red-500' },
    { value: 'ponto_de_atencao', label: 'Ponto de Atenção', color: 'bg-yellow-500' },
    { value: 'resultados_normais', label: 'Resultados Normais', color: 'bg-blue-500' },
    { value: 'indo_bem', label: 'Indo bem', color: 'bg-green-500' },
  ];

  // Opções para Etapa Onboarding
  const etapaOnboardingOptions = [
    { value: 'onboarding', label: 'Onboarding', color: 'bg-orange-500' },
    { value: 'ongoing', label: 'Ongoing', color: 'bg-green-500' },
    { value: 'pausa_temporaria', label: 'Pausa Temporária', color: 'bg-red-500' },
  ];

  // Opções para Etapas de Tráfego
  const etapaTrafegoOptions = [
    { value: 'estrategia', label: 'Estratégia', color: 'bg-gray-500' },
    { value: 'distribuicao_criativos', label: 'Distribuição de Criativos', color: 'bg-blue-500' },
    { value: 'conversao_iniciada', label: 'Conversão Iniciada', color: 'bg-yellow-500' },
    { value: 'voo_de_cruzeiro', label: 'Voo de Cruzeiro', color: 'bg-green-500' },
    { value: 'campanhas_pausadas', label: 'Campanhas Pausadas', color: 'bg-red-500' },
  ];

  const getStatusOption = (options: typeof situacaoClienteOptions, value: string | null) => {
    return options.find(o => o.value === value) || options[0];
  };

  // Função genérica para atualizar status do cliente
  const handleStatusChange = async (clienteId: string, field: string, value: string, valorAnterior: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ [field]: value } as any)
        .eq('id', clienteId);

      if (error) throw error;

      // Registrar no audit log
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User para audit:', user?.id);
      if (user) {
        const auditData = {
          user_id: user.id,
          cliente_id: clienteId,
          acao: 'alteracao_status',
          motivo: JSON.stringify({
            campo: field,
            valor_anterior: valorAnterior,
            valor_novo: value
          })
        };
        console.log('Inserindo audit:', auditData);
        const { data: auditResult, error: auditError } = await supabase
          .from('clientes_audit_log')
          .insert(auditData)
          .select();
        console.log('Resultado audit:', auditResult, 'Erro:', auditError);
        if (auditError) console.error('Erro ao registrar audit:', auditError);
      }

      toast({
        title: "Status atualizado",
        description: "O status do cliente foi atualizado com sucesso.",
      });

      carregarClientes();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  return <div className="space-y-8">
    {/* Header */}
    <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Clientes</h2>
        <p className="text-muted-foreground mt-1 text-sm lg:text-base">
          Gerencie painéis, alocações e acompanhe o acesso dos clientes
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
        {canCreateContent && <>
          <Button variant="outline" size="sm" className="sm:size-default lg:size-lg w-full sm:w-auto" onClick={() => window.open('https://forms.clickup.com/36694061/f/12zu1d-44913/5SA3APCY8WF3WVCL8N', '_blank')}>
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Criar Novo Cliente</span>
            <span className="sm:hidden">Novo Cliente</span>
          </Button>
          <Button variant="hero" size="sm" className="sm:size-default lg:size-lg w-full sm:w-auto" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Novo Painel
          </Button>
        </>}
      </div>
    </div>

    {/* Indicator para usuários não-admin */}
    {!canCreateContent && <ViewOnlyBadge />}

    {/* Tabs */}
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ativos' | 'desativados')} className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="ativos">
          Ativos
        </TabsTrigger>
        <TabsTrigger value="desativados" className="data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
          Desativados {clientes.length > 0 && activeTab === 'desativados' && (
            <Badge className="ml-2 bg-destructive text-destructive-foreground">{clientes.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="space-y-6">

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar clientes por nome, série ou categoria..." className="pl-10 bg-background border-border" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categorias
                    .filter(categoria => categoria && categoria.trim() !== '')
                    .map(categoria => <SelectItem key={categoria} value={categoria}>
                      {categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
                    </SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={serieFilter} onValueChange={setSerieFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas séries</SelectItem>
                  {series
                    .filter(serie => serie && serie.trim() !== '')
                    .map(serie => <SelectItem key={serie} value={serie}>
                      {serie}
                    </SelectItem>)}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={limparFiltros}>
                <Filter className="h-4 w-4 mr-2" />
                Limpar
              </Button>

              {/* Toggle de visualização */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'table' | 'grouped')} className="border rounded-md border-primary/50">
                <ToggleGroupItem value="table" aria-label="Visualização em tabela" className="px-3 gap-2 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                  <LayoutList className="h-4 w-4" />
                  <span className="text-sm font-medium">Tabela</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="grouped" aria-label="Visualização agrupada" className="px-3 gap-2 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-sm font-medium">Agrupado</span>
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Seletor de agrupamento */}
              {viewMode === 'grouped' && (
                <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'gestor' | 'cs')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Agrupar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="cs">CS</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Visualização de Clientes */}
          {viewMode === 'grouped' ? (
            <ClientesGroupedView
              clientes={sortedAndFilteredClientes}
              colaboradores={colaboradores}
              groupBy={groupBy}
              onClienteClick={(cliente) => navigate(`/painel/${cliente.id}`)}
              onClienteUpdate={carregarClientes}
            />
          ) : (
          <Card className={`bg-card border shadow-card ${activeTab === 'desativados' ? 'border-destructive/30' : 'border-border'}`}>
            <div className={`p-6 border-b ${activeTab === 'desativados' ? 'bg-destructive/5 border-destructive/30' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-semibold ${activeTab === 'desativados' ? 'text-destructive' : 'text-foreground'}`}>
                    {activeTab === 'ativos' ? 'Clientes Ativos' : 'Clientes Desativados'} ({sortedAndFilteredClientes.length})
                  </h3>
                  {/* Dropdown de configuração de colunas */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-2 text-primary border-primary/50 hover:bg-primary/10" title="Configurar colunas visíveis">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm font-medium">Colunas</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <div className="px-2 py-1.5 text-sm font-semibold">Colunas Visíveis</div>
                      {columnDefinitions.map((column) => (
                        <DropdownMenuItem
                          key={column.id}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleColumn(column.id);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={isColumnVisible(column.id)}
                            onCheckedChange={() => toggleColumn(column.id)}
                          />
                          <span>{column.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {clientesSelecionados.length > 0 && canCreateContent && <Button onClick={() => setEdicaoMassaModalOpen(true)} variant="outline" size="sm">
                  <EditIcon className="h-4 w-4 mr-2" />
                  Editar {clientesSelecionados.length} selecionado(s)
                </Button>}
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div> : sortedAndFilteredClientes.length === 0 ? <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {clientes.length === 0 ? "Nenhum cliente encontrado." : "Nenhum cliente corresponde aos filtros aplicados."}
                </p>
                {clientes.length === 0 && canCreateContent && <Button onClick={() => setModalOpen(true)} className="mt-4">
                  Criar Primeiro Painel
                </Button>}
                {clientes.length > 0 && <Button onClick={limparFiltros} variant="outline" className="mt-4">
                  Limpar Filtros
                </Button>}
              </div> : <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEnd}
              >
                <Table>
                <TableHeader>
                  <TableRow>
                    {canCreateContent && activeTab === 'ativos' && <TableHead className="w-12">
                      <Checkbox checked={clientesSelecionados.length === sortedAndFilteredClientes.length} onCheckedChange={toggleSelectAll} />
                    </TableHead>}
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('nome')}>
                      <div className="flex items-center">
                        Cliente
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <SortableContext items={orderedVisibleColumns} strategy={horizontalListSortingStrategy}>
                      {orderedVisibleColumns.map((columnId) => (
                        <SortableTableHead
                          key={columnId}
                          id={columnId}
                          onClick={() => handleSort(columnId)}
                          className={`hover:bg-muted/50 ${['situacao_cliente', 'etapa_onboarding', 'etapa_trafego', 'gestor', 'cs'].includes(columnId) ? 'text-center' : ''}`}
                        >
                          {getColumnLabel(columnId)}
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </SortableTableHead>
                      ))}
                    </SortableContext>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredClientes.map(cliente => <TableRow key={cliente.id} className={`hover:bg-muted/50 h-16 ${activeTab === 'desativados' ? 'opacity-70' : ''}`}>
                    {canCreateContent && activeTab === 'ativos' && <TableCell className="py-3">
                      <Checkbox checked={clientesSelecionados.includes(cliente.id)} onCheckedChange={() => toggleClienteSelection(cliente.id)} />
                    </TableCell>}
                    <TableCell className="py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <a href={`/painel/${cliente.id}`} onClick={e => {
                            // Se não for ctrl+click nem cmd+click, prevenir o comportamento padrão e navegar programaticamente
                            if (!e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                              navigate(`/painel/${cliente.id}`, {
                                state: {
                                  from: '/?tab=clientes'
                                }
                              });
                            }
                            // Para ctrl+click ou cmd+click, deixar o comportamento padrão do navegador
                          }} className="font-medium text-foreground hover:text-primary transition-colors text-base">
                            {cliente.nome}
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setClienteHistorico({ id: cliente.id, nome: cliente.nome });
                              setHistoricoModalOpen(true);
                            }}
                            title="Ver histórico de alterações"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                        {cliente.funis_trabalhando && cliente.funis_trabalhando.length > 0 && <div className="flex flex-wrap gap-1 mt-1">
                          {cliente.funis_trabalhando.slice(0, 2).map((funil: string, index: number) => <Badge key={index} variant="outline" className="text-xs">
                            {funil}
                          </Badge>)}
                          {cliente.funis_trabalhando.length > 2 && <Badge variant="outline" className="text-xs">
                            +{cliente.funis_trabalhando.length - 2}
                          </Badge>}
                        </div>}
                      </div>
                    </TableCell>
                    {/* Dynamic column cells based on order */}
                    {orderedVisibleColumns.map((columnId) => {
                      switch (columnId) {
                        case 'categoria':
                          return (
                            <TableCell key={columnId} className="py-3">
                              <Badge variant="outline" className={`text-sm ${cliente.categoria === 'negocio_local' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
                                {cliente.categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
                              </Badge>
                            </TableCell>
                          );
                        case 'serie':
                          return (
                            <TableCell key={columnId} className="py-3">
                              {canCreateContent && activeTab === 'ativos' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                      <Badge className={`${getSerieColor(cliente.serie || 'Serie A')} text-xs cursor-pointer hover:opacity-80 flex items-center gap-1`}>
                                        {cliente.serie || 'Serie A'}
                                        <ChevronDown className="h-3 w-3" />
                                      </Badge>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="bg-background">
                                    {series.map((serie) => (
                                      <DropdownMenuItem
                                        key={serie}
                                        onClick={() => handleSerieChange(cliente.id, serie, cliente.serie || 'Serie A')}
                                        className={cliente.serie === serie ? 'bg-muted' : ''}
                                      >
                                        <Badge className={`${getSerieColor(serie)} text-xs w-full justify-center`}>
                                          {serie}
                                        </Badge>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                cliente.serie ? (
                                  <Badge className={`${getSerieColor(cliente.serie)} text-xs`}>
                                    {cliente.serie}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )
                              )}
                            </TableCell>
                          );
                        case 'situacao_cliente':
                          return (
                            <TableCell key={columnId} className="text-center py-3">
                              {canCreateContent && activeTab === 'ativos' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                      <Badge className={`${getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).color} text-white text-sm cursor-pointer hover:opacity-80 flex items-center gap-1 px-3 py-1`}>
                                        {getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).label}
                                        <ChevronDown className="h-3 w-3" />
                                      </Badge>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="bg-background">
                                    {situacaoClienteOptions.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => handleStatusChange(cliente.id, 'situacao_cliente', option.value, cliente.situacao_cliente || 'nao_iniciado')}
                                        className={cliente.situacao_cliente === option.value ? 'bg-muted' : ''}
                                      >
                                        <Badge className={`${option.color} text-white text-sm w-full justify-center`}>
                                          {option.label}
                                        </Badge>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Badge className={`${getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).color} text-white text-sm px-3 py-1`}>
                                  {getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).label}
                                </Badge>
                              )}
                            </TableCell>
                          );
                        case 'etapa_onboarding':
                          return (
                            <TableCell key={columnId} className="text-center py-3">
                              {canCreateContent && activeTab === 'ativos' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                      <Badge className={`${getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).color} text-white text-sm cursor-pointer hover:opacity-80 flex items-center gap-1 px-3 py-1`}>
                                        {getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).label}
                                        <ChevronDown className="h-3 w-3" />
                                      </Badge>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="bg-background">
                                    {etapaOnboardingOptions.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => handleStatusChange(cliente.id, 'etapa_onboarding', option.value, cliente.etapa_onboarding || 'onboarding')}
                                        className={cliente.etapa_onboarding === option.value ? 'bg-muted' : ''}
                                      >
                                        <Badge className={`${option.color} text-white text-sm w-full justify-center`}>
                                          {option.label}
                                        </Badge>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Badge className={`${getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).color} text-white text-sm px-3 py-1`}>
                                  {getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).label}
                                </Badge>
                              )}
                            </TableCell>
                          );
                        case 'etapa_trafego':
                          return (
                            <TableCell key={columnId} className="text-center py-3">
                              {canCreateContent && activeTab === 'ativos' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                      <Badge className={`${getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).color} text-white text-sm cursor-pointer hover:opacity-80 flex items-center gap-1 px-3 py-1`}>
                                        {getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).label}
                                        <ChevronDown className="h-3 w-3" />
                                      </Badge>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="bg-background">
                                    {etapaTrafegoOptions.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => handleStatusChange(cliente.id, 'etapa_trafego', option.value, cliente.etapa_trafego || 'estrategia')}
                                        className={cliente.etapa_trafego === option.value ? 'bg-muted' : ''}
                                      >
                                        <Badge className={`${option.color} text-white text-sm w-full justify-center`}>
                                          {option.label}
                                        </Badge>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Badge className={`${getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).color} text-white text-sm px-3 py-1`}>
                                  {getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).label}
                                </Badge>
                              )}
                            </TableCell>
                          );
                        case 'gestor':
                          return (
                            <TableCell key={columnId} className="text-center py-3">
                              {cliente.primary_gestor ? (
                                <div className="flex justify-center">
                                  <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80" onClick={() => {
                                    setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                    setTeamModalOpen(true);
                                  }}>
                                    <AvatarImage src={cliente.primary_gestor.avatar_url} />
                                    <AvatarFallback className="text-sm">
                                      {cliente.primary_gestor.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground" onClick={() => {
                                  setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                  setTeamModalOpen(true);
                                }}>
                                  <Users className="h-5 w-5" />
                                </Button>
                              )}
                            </TableCell>
                          );
                        case 'cs':
                          const csTeam = cliente.client_roles?.filter(cr => cr.role === 'cs') || [];
                          const primaryCs = cliente.primary_cs;
                          return (
                            <TableCell key={columnId} className="text-center py-3">
                              {primaryCs ? (
                                <div className="flex justify-center items-center gap-1">
                                  <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80" onClick={() => {
                                    setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                    setTeamModalOpen(true);
                                  }}>
                                    <AvatarImage src={primaryCs.avatar_url} />
                                    <AvatarFallback className="text-sm">
                                      {primaryCs.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {csTeam.length > 1 && (
                                    <Badge variant="secondary" className="text-xs px-1 h-5">
                                      +{csTeam.length - 1}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground" onClick={() => {
                                  setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                  setTeamModalOpen(true);
                                }}>
                                  <Users className="h-5 w-5" />
                                </Button>
                              )}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}

                    <TableCell className="py-3">
                      <div className="flex items-center justify-center">
                        {/* Menu de ações */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {activeTab === 'ativos' ? (
                              <>
                                <DropdownMenuItem onClick={e => handleCatalogoClick(cliente, e as any)}>
                                  <Sheet className="h-4 w-4 mr-2 text-green-600" />
                                  Catálogo de Criativos
                                </DropdownMenuItem>

                                {canCreateContent && (
                                  <DropdownMenuItem onClick={() => {
                                    setClienteKickoff({
                                      id: cliente.id,
                                      nome: cliente.nome
                                    });
                                    setKickoffModalOpen(true);
                                  }}>
                                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                    Kickoff
                                  </DropdownMenuItem>
                                )}

                                {canCreateContent && (
                                  <DropdownMenuItem onClick={() => handleEditClick(cliente)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar Cliente
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => navigate(`/painel/${cliente.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Painel
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => {
                                  const fullLink = cliente.link_painel?.startsWith('http') ? cliente.link_painel : `${window.location.origin}${cliente.link_painel}`;
                                  copyToClipboard(fullLink);
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar Link do Painel
                                </DropdownMenuItem>

                                {cliente.pasta_drive_url && (
                                  <DropdownMenuItem onClick={() => window.open(cliente.pasta_drive_url, '_blank')}>
                                    <span className="mr-2">📁</span>
                                    Pasta do Drive
                                  </DropdownMenuItem>
                                )}

                                {canCreateContent && (
                                  <DropdownMenuItem onClick={() => handleInativarClick(cliente)} className="text-orange-500">
                                    <Pause className="h-4 w-4 mr-2" />
                                    Inativar Cliente
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : (
                              <>
                                {canCreateContent && (
                                  <DropdownMenuItem onClick={() => handleReativarClick(cliente)} className="text-green-500">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Reativar Cliente
                                  </DropdownMenuItem>
                                )}

                                {canCreateContent && (
                                  <DropdownMenuItem onClick={() => handleDeleteClick(cliente)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Apagar Cliente
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
              </DndContext>}
            </div>
          </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>

    {/* Modals */}
    <NovoClienteModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={() => {
      carregarClientes(); // Recarregar lista após criar
    }} />

    <InativarClienteModal
      open={inativarModalOpen}
      onOpenChange={open => {
        setInativarModalOpen(open);
        if (!open) {
          setClienteToInativar(null);
        }
      }}
      cliente={clienteToInativar}
      onSuccess={handleInativarSuccess}
    />

    <ReativarClienteModal
      open={reativarModalOpen}
      onOpenChange={open => {
        setReativarModalOpen(open);
        if (!open) {
          setClienteToReativar(null);
        }
      }}
      cliente={clienteToReativar}
      onSuccess={handleReativarSuccess}
    />

    <DeleteClienteModal open={deleteModalOpen} onOpenChange={open => {
      setDeleteModalOpen(open);
      if (!open) {
        setClienteToDelete(null);
      }
    }} cliente={clienteToDelete} onSuccess={handleDeleteSuccess} />

    <ImportarClientesModal open={importModalOpen} onOpenChange={setImportModalOpen} onSuccess={() => {
      carregarClientes(); // Recarregar lista após importar
    }} />

    <EditarClienteModal open={editModalOpen} onOpenChange={open => {
      setEditModalOpen(open);
      if (!open) {
        setClienteToEdit(null);
      }
    }} cliente={clienteToEdit} onSuccess={handleEditSuccess} />

    <EdicaoMassaModal isOpen={edicaoMassaModalOpen} onClose={() => setEdicaoMassaModalOpen(false)} onSuccess={handleEdicaoMassaSuccess} clientesSelecionados={clientes.filter(c => clientesSelecionados.includes(c.id))} />

    {clienteKickoff && <KickoffModal isOpen={kickoffModalOpen} onClose={() => {
      setKickoffModalOpen(false);
      setClienteKickoff(null);
    }} clienteId={clienteKickoff.id} clienteNome={clienteKickoff.nome} />}

    {clienteTeam && <TeamAssignmentModal isOpen={teamModalOpen} onClose={() => {
      setTeamModalOpen(false);
      setClienteTeam(null);
    }} clienteId={clienteTeam.id} clienteNome={clienteTeam.nome} onSuccess={() => {
      carregarClientes();
    }} />}

    {clienteHistorico && <HistoricoStatusModal
      isOpen={historicoModalOpen}
      onClose={() => {
        setHistoricoModalOpen(false);
        setClienteHistorico(null);
      }}
      clienteId={clienteHistorico.id}
      clienteNome={clienteHistorico.nome}
    />}
  </div>;
};