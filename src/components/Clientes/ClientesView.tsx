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
import { Calendar, FileText, Link2, Video, Search, Plus, Copy, Eye, Trash2, Upload, Edit, UserCheck, Filter, ArrowUpDown, EditIcon, Edit3, Users, Sheet, Pause, CheckCircle, ChevronDown, MoreHorizontal, LayoutList, LayoutGrid, GripVertical, History, Check } from "lucide-react";
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
import { CategoriesManager } from './CategoriesManager';
import { FieldOptionsManager } from './FieldOptionsManager';
import { useFieldOptions } from '@/hooks/useFieldOptions';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
  const { userData: currentUser } = useCurrentUser();
  const {
    canCreateContent,
    isAdmin
  } = useUserPermissions();
  const [modoEu, setModoEu] = useState(false);
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
  const [clientCategories, setClientCategories] = useState<any[]>([]);
  const [categoriesManagerOpen, setCategoriesManagerOpen] = useState(false);
  const [fieldOptionsManagerOpen, setFieldOptionsManagerOpen] = useState(false);

  // Field options filters
  const [situacaoFilter, setSituacaoFilter] = useState<string>('all');
  const [etapaOnboardingFilter, setEtapaOnboardingFilter] = useState<string>('all');
  const [etapaTrafegoFilter, setEtapaTrafegoFilter] = useState<string>('all');

  // Load field options
  const situacaoOptions = useFieldOptions('situacao_cliente');
  const etapaOnboardingOptions = useFieldOptions('etapa_onboarding');
  const etapaTrafegoOptions = useFieldOptions('etapa_trafego');
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
    carregarClientCategories();
  }, [activeTab]);

  const carregarClientCategories = async () => {
    try {
      const { data, error } = await supabase.from('client_categories').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setClientCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };
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
    const matchesSituacao = situacaoFilter === 'all' || !situacaoFilter || cliente.situacao_cliente === situacaoFilter;
    const matchesEtapaOnboarding = etapaOnboardingFilter === 'all' || !etapaOnboardingFilter || cliente.etapa_onboarding === etapaOnboardingFilter;
    const matchesEtapaTrafego = etapaTrafegoFilter === 'all' || !etapaTrafegoFilter || (cliente.funis_trabalhando && cliente.funis_trabalhando.includes(etapaTrafegoFilter));

    const matchesModoEu = !modoEu || (currentUser && (
      (cliente.primary_gestor?.user_id === currentUser.user_id || cliente.primary_gestor_user_id === currentUser.user_id) ||
      (cliente.primary_cs?.user_id === currentUser.user_id || cliente.primary_cs_user_id === currentUser.user_id) ||
      (cliente.client_roles && cliente.client_roles.some((r: any) => r.user_id === currentUser.user_id))
    ));

    return matchesSearch && matchesCategoria && matchesSerie && matchesSituacao && matchesEtapaOnboarding && matchesEtapaTrafego && matchesModoEu;
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
  const categorias = clientCategories.length > 0
    ? clientCategories.map(c => c.key)
    : [...new Set(clientes.map(c => c.categoria).filter(Boolean))];
  const series = ['Serie A', 'Serie B', 'Serie C', 'Serie D'];
  const limparFiltros = () => {
    setCategoriaFilter('all');
    setSerieFilter('all');
    setSearchTerm('');
    setSituacaoFilter('all');
    setEtapaOnboardingFilter('all');
    setEtapaTrafegoFilter('all');
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
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h2>
        <p className="text-muted-foreground mt-1">
          Gerencie painéis, alocações e acompanhe o acesso dos clientes
        </p>
      </div>
    </div>

    {/* Indicator para usuários não-admin */}
    {!canCreateContent && <ViewOnlyBadge />}

    {/* Tabs */}
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ativos' | 'desativados')} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <TabsList className="bg-background border border-border/50 rounded-lg p-1 h-auto">
            <TabsTrigger value="ativos" className="rounded-md px-6 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Ativos
            </TabsTrigger>
            <TabsTrigger value="desativados" className="rounded-md px-6 py-1.5 data-[state=active]:bg-red-50 data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-red-700 data-[state=active]:border data-[state=active]:border-red-200">
              Desativados
            </TabsTrigger>
          </TabsList>

          {/* Modo Eu Toggle */}
          <button
            onClick={() => setModoEu(!modoEu)}
            className={`h-9 pr-4 pl-1.5 rounded-full flex items-center justify-center gap-2 border transition-colors ${modoEu ? 'bg-indigo-50 border-indigo-400 text-indigo-900' : 'bg-background border-border text-indigo-900 hover:bg-slate-50'}`}
          >
            {currentUser && (
              <Avatar className="h-6 w-6 border border-indigo-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <AvatarImage src={currentUser.avatar_url || ''} />
                <AvatarFallback className="text-[10px] font-bold text-foreground bg-white">
                  {currentUser.nome?.substring(0, 2).toUpperCase() || 'EU'}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="text-[13px] font-semibold tracking-tight">Modo eu</span>
          </button>

          {/* Toggle de visualização */}
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'table' | 'grouped')} className="bg-blue-50 border border-blue-100 rounded-lg p-1">
            <ToggleGroupItem value="table" aria-label="Visualização em tabela" className="rounded-md px-4 py-1.5 h-auto text-blue-600 gap-2 data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-blue-700">
              <LayoutList className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Tabela</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="grouped" aria-label="Visualização agrupada" className="rounded-md px-4 py-1.5 h-auto text-slate-600 gap-2 data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-slate-800 hover:text-slate-900 border-none outline-none">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Agrupado</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Seletor de agrupamento */}
          {viewMode === 'grouped' && (
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'gestor' | 'cs')}>
              <SelectTrigger className="w-[140px] bg-background border-border/50 h-9 rounded-lg">
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="cs">CS</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Botão Editar foi movido para os filtros */}
      </div>

      <TabsContent value={activeTab} className="space-y-6">

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-center gap-3">
            <div className="relative flex-1 min-w-[250px] w-full lg:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
              <Input placeholder="Buscar clientes por nome, série ou cat" className="pl-9 h-10 w-full bg-background border-border/50 rounded-xl shadow-sm text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 bg-background border-border/50 rounded-xl shadow-sm gap-2 font-medium w-full lg:w-auto">
                    <Filter className="h-4 w-4 text-slate-500" />
                    Filtros
                    <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[300px] sm:w-[500px] p-4 rounded-2xl shadow-xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <h4 className="font-semibold text-sm">Filtros de Clientes</h4>
                      <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                        Limpar Filtros
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                            <SelectValue placeholder="Todas categorias" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas categorias</SelectItem>
                            {clientCategories && clientCategories.length > 0 ? (
                              clientCategories.map(cat => (
                                <SelectItem key={cat.key} value={cat.key}>
                                  <div className="flex items-center gap-2">
                                    <div style={{ width: 10, height: 10, background: cat.color }} className="rounded-sm" />
                                    <span>{cat.label}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              categorias
                                .filter(categoria => categoria && categoria.trim() !== '')
                                .map(categoria => <SelectItem key={categoria} value={categoria}>
                                  {categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
                                </SelectItem>)
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Situação</label>
                        <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                            <SelectValue placeholder="Todas situações" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas situações</SelectItem>
                            {situacaoOptions.options.map(opt => (
                              <SelectItem key={opt.id} value={opt.option_key}>
                                <div className="flex items-center gap-2">
                                  <div style={{ width: 8, height: 8, background: opt.color }} className="rounded-full" />
                                  <span>{opt.option_label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Etapa Onboarding</label>
                        <Select value={etapaOnboardingFilter} onValueChange={setEtapaOnboardingFilter}>
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                            <SelectValue placeholder="Todas etapas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas etapas</SelectItem>
                            {etapaOnboardingOptions.options.map(opt => (
                              <SelectItem key={opt.id} value={opt.option_key}>
                                <div className="flex items-center gap-2">
                                  <div style={{ width: 8, height: 8, background: opt.color }} className="rounded-full" />
                                  <span>{opt.option_label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Etapa de Tráfego</label>
                        <Select value={etapaTrafegoFilter} onValueChange={setEtapaTrafegoFilter}>
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                            <SelectValue placeholder="Todas etapas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas etapas</SelectItem>
                            {etapaTrafegoOptions.options.map(opt => (
                              <SelectItem key={opt.id} value={opt.option_key}>
                                <div className="flex items-center gap-2">
                                  <div style={{ width: 8, height: 8, background: opt.color }} className="rounded-full" />
                                  <span>{opt.option_label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Série</label>
                        <Select value={serieFilter} onValueChange={setSerieFilter}>
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                            <SelectValue placeholder="Todas séries" />
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
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {canCreateContent && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 bg-background border-border/50 rounded-xl shadow-sm gap-2 font-medium w-full lg:w-auto">
                      <Edit3 className="h-4 w-4 text-slate-500" />
                      Editar
                      <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-border/50">
                    <DropdownMenuItem onClick={() => setCategoriesManagerOpen(true)} className="rounded-lg cursor-pointer my-0.5 font-medium focus:bg-slate-100">
                      Categorias
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFieldOptionsManagerOpen(true)} className="rounded-lg cursor-pointer my-0.5 font-medium focus:bg-slate-100">
                      Campos e Etapas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canCreateContent && (
                <Button className="h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md text-sm font-semibold px-6 w-full lg:w-auto transition-all hover:shadow-lg" onClick={() => setModalOpen(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Criar Novo Cliente
                </Button>
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
              clientesSelecionados={clientesSelecionados}
              toggleClienteSelection={toggleClienteSelection}
              setClientesSelecionados={setClientesSelecionados}
              canCreateContent={canCreateContent}
              activeTab={activeTab}
            />
          ) : (
            <Card className={`bg-card shadow-sm rounded-2xl overflow-hidden transition-colors border ${activeTab === 'desativados' ? 'bg-red-50/20 border-red-200' : 'border-border/50'}`}>
              <div className="p-5 border-b border-border/50 bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-foreground">
                      {activeTab === 'ativos' ? 'Clientes Ativos' : 'Clientes Desativados'} ({sortedAndFilteredClientes.length})
                    </h3>
                    {/* Dropdown de configuração de colunas */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 rounded-lg font-semibold px-3">
                          <Eye className="h-3.5 w-3.5" />
                          <span className="text-xs">Colunas</span>
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
                  {clientesSelecionados.length > 0 && canCreateContent && <Button onClick={() => setEdicaoMassaModalOpen(true)} variant="outline" size="sm" className="h-8 rounded-lg font-medium text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                    <EditIcon className="h-3.5 w-3.5 mr-1.5" />
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
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-border/50">
                        {canCreateContent && activeTab === 'ativos' && <TableHead className="w-12 text-center align-middle">
                          <Checkbox checked={clientesSelecionados.length === sortedAndFilteredClientes.length} onCheckedChange={toggleSelectAll} className="border-slate-300" />
                        </TableHead>}
                        <TableHead className="cursor-pointer hover:bg-slate-100/50 transition-colors font-semibold text-slate-600 h-11" onClick={() => handleSort('nome')}>
                          <div className="flex items-center text-xs tracking-tight uppercase">
                            Cliente
                            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                          </div>
                        </TableHead>
                        <SortableContext items={orderedVisibleColumns} strategy={horizontalListSortingStrategy}>
                          {orderedVisibleColumns.map((columnId) => (
                            <SortableTableHead
                              key={columnId}
                              id={columnId}
                              onClick={() => handleSort(columnId)}
                              className={`hover:bg-slate-100/50 transition-colors font-semibold text-slate-600 h-11 ${['situacao_cliente', 'etapa_onboarding', 'etapa_trafego', 'gestor', 'cs'].includes(columnId) ? 'text-center' : ''}`}
                            >
                              <div className={`flex items-center text-xs tracking-tight uppercase ${['situacao_cliente', 'etapa_onboarding', 'etapa_trafego', 'gestor', 'cs'].includes(columnId) ? 'justify-center' : ''}`}>
                                {getColumnLabel(columnId)}
                                <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                              </div>
                            </SortableTableHead>
                          ))}
                        </SortableContext>
                        <TableHead className="text-center font-semibold text-slate-600 text-xs tracking-tight uppercase h-11">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAndFilteredClientes.map(cliente => <TableRow key={cliente.id} className={`hover:bg-slate-50/50 transition-colors border-b border-border/50 group/row ${activeTab === 'desativados' ? 'opacity-70' : ''}`}>
                        {canCreateContent && activeTab === 'ativos' && <TableCell className="py-4 text-center align-middle">
                          <Checkbox checked={clientesSelecionados.includes(cliente.id)} onCheckedChange={() => toggleClienteSelection(cliente.id)} className="border-slate-300" />
                        </TableCell>}
                        <TableCell className="py-4 font-medium text-foreground text-sm relative group">
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
                              }} className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-tight text-[13px]">
                                {cliente.nome}
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground/50 opacity-0 group-hover/row:opacity-100 transition-opacity hover:text-primary hover:bg-muted"
                                onClick={() => {
                                  setClienteHistorico({ id: cliente.id, nome: cliente.nome });
                                  setHistoricoModalOpen(true);
                                }}
                                title="Ver histórico de alterações"
                              >
                                <History className="h-3.5 w-3.5" />
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
                                <TableCell key={columnId} className="py-4">
                                  <Badge variant="outline" className={`font-semibold text-xs tracking-tight rounded-full px-3 py-1 bg-transparent border uppercase ${cliente.categoria === 'negocio_local' ? 'text-blue-600 border-blue-200' : 'text-green-600 border-green-200'}`}>
                                    {cliente.categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
                                  </Badge>
                                </TableCell>
                              );
                            case 'serie':
                              return (
                                <TableCell key={columnId} className="py-4">
                                  {canCreateContent && activeTab === 'ativos' ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                          <Badge className={`${getSerieColor(cliente.serie || 'Serie A')} rounded-full px-3 py-1 font-semibold tracking-tight text-[11px] cursor-pointer hover:opacity-80 flex items-center gap-1 bg-transparent border`}>
                                            {cliente.serie || 'Serie A'}
                                            <ChevronDown className="h-3 w-3" />
                                          </Badge>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="bg-background rounded-xl p-1 shadow-lg">
                                        {series.map((serie) => (
                                          <DropdownMenuItem
                                            key={serie}
                                            onClick={() => handleSerieChange(cliente.id, serie, cliente.serie || 'Serie A')}
                                            className={`rounded-lg cursor-pointer my-0.5 ${cliente.serie === serie ? 'bg-muted' : ''}`}
                                          >
                                            <Badge className={`${getSerieColor(serie)} text-xs w-full justify-center bg-transparent border`}>
                                              {serie}
                                            </Badge>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    cliente.serie ? (
                                      <Badge className={`${getSerieColor(cliente.serie)} rounded-full px-3 py-1 font-semibold tracking-tight text-[11px] bg-transparent border`}>
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
                                <TableCell key={columnId} className="text-center py-4">
                                  {canCreateContent && activeTab === 'ativos' ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                          <Badge style={{ backgroundColor: situacaoOptions.getColor(cliente.situacao_cliente) }} className="text-white font-bold tracking-wide rounded-full text-[11px] cursor-pointer hover:opacity-80 flex items-center justify-center gap-1.5 px-3.5 py-1.5 border-transparent shadow-sm w-[140px]">
                                            {situacaoOptions.getLabel(cliente.situacao_cliente)}
                                            <ChevronDown className="h-3 w-3 opacity-70" />
                                          </Badge>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="center" className="bg-background rounded-xl p-1.5 shadow-lg w-[180px]">
                                        {situacaoOptions.options.map((option) => (
                                          <DropdownMenuItem
                                            key={option.option_key}
                                            onClick={() => handleStatusChange(cliente.id, 'situacao_cliente', option.option_key, cliente.situacao_cliente || 'nao_iniciado')}
                                            className={`rounded-lg cursor-pointer my-0.5 justify-center ${cliente.situacao_cliente === option.option_key ? 'bg-muted' : ''}`}
                                          >
                                            <Badge style={{ backgroundColor: option.color }} className="text-white font-bold tracking-wide rounded-full text-[11px] w-full justify-center px-3 py-1 border-transparent">
                                              {option.option_label}
                                            </Badge>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <Badge style={{ backgroundColor: situacaoOptions.getColor(cliente.situacao_cliente) }} className="text-white font-bold tracking-wide rounded-full text-[11px] px-3.5 py-1.5 border-transparent shadow-sm w-[140px] justify-center">
                                      {situacaoOptions.getLabel(cliente.situacao_cliente)}
                                    </Badge>
                                  )}
                                </TableCell>
                              );
                            case 'etapa_onboarding':
                              return (
                                <TableCell key={columnId} className="text-center py-4">
                                  {canCreateContent && activeTab === 'ativos' ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                          <Badge style={{ backgroundColor: etapaOnboardingOptions.getColor(cliente.etapa_onboarding) }} className="text-white font-bold tracking-wide rounded-full text-[11px] cursor-pointer hover:opacity-80 flex items-center justify-center gap-1.5 px-3.5 py-1.5 border-transparent shadow-sm w-[140px]">
                                            {etapaOnboardingOptions.getLabel(cliente.etapa_onboarding)}
                                            <ChevronDown className="h-3 w-3 opacity-70" />
                                          </Badge>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="center" className="bg-background rounded-xl p-1.5 shadow-lg w-[180px]">
                                        {etapaOnboardingOptions.options.map((option) => (
                                          <DropdownMenuItem
                                            key={option.option_key}
                                            onClick={() => handleStatusChange(cliente.id, 'etapa_onboarding', option.option_key, cliente.etapa_onboarding || 'onboarding')}
                                            className={`rounded-lg cursor-pointer my-0.5 justify-center ${cliente.etapa_onboarding === option.option_key ? 'bg-muted' : ''}`}
                                          >
                                            <Badge style={{ backgroundColor: option.color }} className="text-white font-bold tracking-wide rounded-full text-[11px] w-full justify-center px-3 py-1 border-transparent">
                                              {option.option_label}
                                            </Badge>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <Badge style={{ backgroundColor: etapaOnboardingOptions.getColor(cliente.etapa_onboarding) }} className="text-white font-bold tracking-wide rounded-full text-[11px] px-3.5 py-1.5 border-transparent shadow-sm w-[140px] justify-center">
                                      {etapaOnboardingOptions.getLabel(cliente.etapa_onboarding)}
                                    </Badge>
                                  )}
                                </TableCell>
                              );
                            case 'etapa_trafego':
                              return (
                                <TableCell key={columnId} className="text-center py-4">
                                  {canCreateContent && activeTab === 'ativos' ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                          <Badge style={{ backgroundColor: etapaTrafegoOptions.getColor(cliente.etapa_trafego) }} className="text-white font-bold tracking-wide rounded-full text-[11px] cursor-pointer hover:opacity-80 flex items-center justify-center gap-1.5 px-3.5 py-1.5 border-transparent shadow-sm w-[140px] whitespace-nowrap overflow-hidden text-ellipsis">
                                            {etapaTrafegoOptions.getLabel(cliente.etapa_trafego)}
                                            <ChevronDown className="h-3 w-3 opacity-70 flex-shrink-0" />
                                          </Badge>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="center" className="bg-background rounded-xl p-1.5 shadow-lg w-[180px]">
                                        {etapaTrafegoOptions.options.map((option) => (
                                          <DropdownMenuItem
                                            key={option.option_key}
                                            onClick={() => handleStatusChange(cliente.id, 'etapa_trafego', option.option_key, cliente.etapa_trafego || 'estrategia')}
                                            className={`rounded-lg cursor-pointer my-0.5 justify-center ${cliente.etapa_trafego === option.option_key ? 'bg-muted' : ''}`}
                                          >
                                            <Badge style={{ backgroundColor: option.color }} className="text-white font-bold tracking-wide rounded-full text-[11px] w-full justify-center px-3 py-1 border-transparent">
                                              {option.option_label}
                                            </Badge>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <Badge style={{ backgroundColor: etapaTrafegoOptions.getColor(cliente.etapa_trafego) }} className="text-white font-bold tracking-wide rounded-full text-[11px] px-3.5 py-1.5 border-transparent shadow-sm w-[140px] justify-center">
                                      {etapaTrafegoOptions.getLabel(cliente.etapa_trafego)}
                                    </Badge>
                                  )}
                                </TableCell>
                              );
                            case 'gestor':
                              return (
                                <TableCell key={columnId} className="text-center py-4" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <div className="flex justify-center cursor-pointer group/avatar items-center p-1 rounded-md hover:bg-slate-100/50 transition-colors">
                                        {cliente.primary_gestor ? (
                                          <Avatar className="h-9 w-9 group-hover/avatar:ring-2 ring-blue-400 ring-offset-2 transition-all shadow-sm ring-1 ring-border">
                                            <AvatarImage src={cliente.primary_gestor.avatar_url} />
                                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold font-mono">
                                              {cliente.primary_gestor.nome.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : (
                                          <Button variant="outline" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-blue-50 hover:text-blue-600 rounded-full border-dashed group-hover/avatar:border-blue-300">
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-56 p-2 rounded-xl shadow-lg border-border/50 max-h-[300px] overflow-y-auto z-50">
                                      <div className="mb-2 px-2 pb-1 border-b text-xs font-semibold text-muted-foreground uppercase flex justify-between items-center">
                                        <span>Atribuir Gestor</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-blue-600" onClick={(e) => {
                                          e.stopPropagation();
                                          setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                          setTeamModalOpen(true);
                                        }}>
                                          <Users className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <DropdownMenuItem onClick={async (e) => {
                                        e.stopPropagation();
                                        await supabase.from('clientes').update({ primary_gestor_user_id: null }).eq('id', cliente.id);
                                        carregarClientes();
                                      }} className="rounded-lg cursor-pointer my-0.5 opacity-80">
                                        Nenhum gestor
                                      </DropdownMenuItem>
                                      {colaboradores.map((colab: any) => (
                                        <DropdownMenuItem key={colab.user_id} onClick={async (e) => {
                                          e.stopPropagation();
                                          await supabase.from('clientes').update({ primary_gestor_user_id: colab.user_id }).eq('id', cliente.id);
                                          carregarClientes();
                                        }} className="rounded-lg cursor-pointer my-0.5 flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarImage src={colab.avatar_url} />
                                            <AvatarFallback className="text-[10px]">{colab.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                          </Avatar>
                                          <span className="flex-1 text-sm">{colab.nome}</span>
                                          {cliente.primary_gestor?.id === colab.user_id && <Check className="h-4 w-4 text-blue-600" />}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              );
                            case 'cs':
                              const csTeam = cliente.client_roles?.filter((cr: any) => cr.role === 'cs') || [];
                              const primaryCs = cliente.primary_cs;
                              return (
                                <TableCell key={columnId} className="text-center py-4" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <div className="flex justify-center items-center gap-1.5 cursor-pointer group/avatar p-1 rounded-md hover:bg-slate-100/50 transition-colors">
                                        {primaryCs ? (
                                          <>
                                            <Avatar className="h-9 w-9 group-hover/avatar:ring-2 ring-blue-400 ring-offset-2 transition-all shadow-sm ring-1 ring-border">
                                              <AvatarImage src={primaryCs.avatar_url} />
                                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold font-mono">
                                                {primaryCs.nome.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                              </AvatarFallback>
                                            </Avatar>
                                            {csTeam.length > 1 && (
                                              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 h-5 rounded-full bg-slate-100 text-slate-600 mt-1">
                                                +{csTeam.length - 1}
                                              </Badge>
                                            )}
                                          </>
                                        ) : (
                                          <Button variant="outline" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-blue-50 hover:text-blue-600 rounded-full border-dashed group-hover/avatar:border-blue-300">
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-56 p-2 rounded-xl shadow-lg border-border/50 max-h-[300px] overflow-y-auto z-50">
                                      <div className="mb-2 px-2 pb-1 border-b text-xs font-semibold text-muted-foreground uppercase flex justify-between items-center">
                                        <span>Atribuir CS primário</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-blue-600" onClick={(e) => {
                                          e.stopPropagation();
                                          setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                          setTeamModalOpen(true);
                                        }}>
                                          <Users className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <DropdownMenuItem onClick={async (e) => {
                                        e.stopPropagation();
                                        await supabase.from('clientes').update({ primary_cs_user_id: null }).eq('id', cliente.id);
                                        carregarClientes();
                                      }} className="rounded-lg cursor-pointer my-0.5 opacity-80">
                                        Nenhum CS
                                      </DropdownMenuItem>
                                      {colaboradores.map((colab: any) => (
                                        <DropdownMenuItem key={colab.user_id} onClick={async (e) => {
                                          e.stopPropagation();
                                          await supabase.from('clientes').update({ primary_cs_user_id: colab.user_id }).eq('id', cliente.id);
                                          carregarClientes();
                                        }} className="rounded-lg cursor-pointer my-0.5 flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarImage src={colab.avatar_url} />
                                            <AvatarFallback className="text-[10px]">{colab.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                          </Avatar>
                                          <span className="flex-1 text-sm">{colab.nome}</span>
                                          {cliente.primary_cs?.id === colab.user_id && <Check className="h-4 w-4 text-blue-600" />}
                                        </DropdownMenuItem>
                                      ))}
                                      <div className="h-px bg-border/50 my-2 mx-1" />
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                        setTeamModalOpen(true);
                                      }} className="rounded-lg cursor-pointer my-0.5 font-medium text-blue-600 justify-center">
                                        Acesso Avançado (Copilotos)
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 hover:text-blue-600 transition-colors opacity-50 group-hover/row:opacity-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-xl border-border/50">
                                {activeTab === 'ativos' ? (
                                  <>
                                    <DropdownMenuItem onClick={e => handleCatalogoClick(cliente, e as any)} className="rounded-lg cursor-pointer my-0.5 font-medium text-slate-700 focus:bg-slate-100">
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
                                      }} className="rounded-lg cursor-pointer my-0.5 font-medium text-slate-700 focus:bg-slate-100">
                                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                        Kickoff
                                      </DropdownMenuItem>
                                    )}

                                    {canCreateContent && (
                                      <DropdownMenuItem onClick={() => handleEditClick(cliente)} className="rounded-lg cursor-pointer my-0.5 font-medium text-slate-700 focus:bg-slate-100">
                                        <Edit className="h-4 w-4 mr-2 text-slate-500" />
                                        Editar Cliente
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem onClick={() => navigate(`/painel/${cliente.id}`)} className="rounded-lg cursor-pointer my-0.5 font-medium text-slate-700 focus:bg-slate-100">
                                      <Eye className="h-4 w-4 mr-2 text-slate-500" />
                                      Ver Painel
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => {
                                      const fullLink = cliente.link_painel?.startsWith('http') ? cliente.link_painel : `${window.location.origin}${cliente.link_painel}`;
                                      copyToClipboard(fullLink);
                                    }} className="rounded-lg cursor-pointer my-0.5 font-medium text-slate-700 focus:bg-slate-100">
                                      <Copy className="h-4 w-4 mr-2 text-slate-500" />
                                      Copiar Link do Painel
                                    </DropdownMenuItem>

                                    {cliente.pasta_drive_url && (
                                      <DropdownMenuItem onClick={() => window.open(cliente.pasta_drive_url, '_blank')} className="rounded-lg cursor-pointer my-0.5 font-medium text-slate-700 focus:bg-slate-100">
                                        <span className="mr-2 opacity-80">📁</span>
                                        Pasta do Drive
                                      </DropdownMenuItem>
                                    )}

                                    {canCreateContent && (
                                      <>
                                        <div className="h-px bg-border/50 my-1.5 mx-1" />
                                        <DropdownMenuItem onClick={() => handleInativarClick(cliente)} className="text-orange-600 rounded-lg cursor-pointer my-0.5 font-medium focus:bg-orange-50 focus:text-orange-700">
                                          <Pause className="h-4 w-4 mr-2" />
                                          Inativar Cliente
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {canCreateContent && (
                                      <DropdownMenuItem onClick={() => handleReativarClick(cliente)} className="text-emerald-600 rounded-lg cursor-pointer my-0.5 font-medium focus:bg-emerald-50 focus:text-emerald-700">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Reativar Cliente
                                      </DropdownMenuItem>
                                    )}

                                    {canCreateContent && (
                                      <>
                                        <div className="h-px bg-border/50 my-1.5 mx-1" />
                                        <DropdownMenuItem onClick={() => handleDeleteClick(cliente)} className="text-red-600 rounded-lg cursor-pointer my-0.5 font-medium focus:bg-red-50 focus:text-red-700">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Apagar Cliente
                                        </DropdownMenuItem>
                                      </>
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

    {
      clienteKickoff && <KickoffModal isOpen={kickoffModalOpen} onClose={() => {
        setKickoffModalOpen(false);
        setClienteKickoff(null);
      }} clienteId={clienteKickoff.id} clienteNome={clienteKickoff.nome} />
    }

    {
      clienteTeam && <TeamAssignmentModal isOpen={teamModalOpen} onClose={() => {
        setTeamModalOpen(false);
        setClienteTeam(null);
      }} clienteId={clienteTeam.id} clienteNome={clienteTeam.nome} onSuccess={() => {
        carregarClientes();
      }} />
    }

    {
      clienteHistorico && <HistoricoStatusModal
        isOpen={historicoModalOpen}
        onClose={() => {
          setHistoricoModalOpen(false);
          setClienteHistorico(null);
        }}
        clienteId={clienteHistorico.id}
        clienteNome={clienteHistorico.nome}
      />
    }

    <CategoriesManager open={categoriesManagerOpen} onOpenChange={setCategoriesManagerOpen} onUpdated={() => carregarClientCategories()} />

    <FieldOptionsManager open={fieldOptionsManagerOpen} onOpenChange={setFieldOptionsManagerOpen} onUpdated={() => {
      // Reload field options by re-triggering the hooks
      carregarClientes();
    }} />
  </div >;
};