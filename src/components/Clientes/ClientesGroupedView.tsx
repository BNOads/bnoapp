import React, { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, User, ArrowUpDown, GripVertical, History, Plus, Check } from "lucide-react";
import { HistoricoStatusModal } from "./HistoricoStatusModal";
import { useNavigate } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFieldOptions } from "@/hooks/useFieldOptions";

interface Cliente {
  id: string;
  nome: string;
  categoria?: string;
  serie?: string;
  status_cliente?: string;
  situacao_cliente?: string;
  etapa_onboarding?: string;
  etapa_trafego?: string;
  etapa_atual?: string;
  funis_trabalhando?: string[];
  primary_gestor_user_id?: string;
  primary_cs_user_id?: string;
  catalogo_criativos_url?: string;
  primary_gestor?: {
    id: string;
    nome: string;
    avatar_url?: string;
    user_id?: string;
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

interface Colaborador {
  user_id: string;
  nome: string;
  avatar_url?: string;
}

interface ClientesGroupedViewProps {
  clientes: Cliente[];
  colaboradores: Colaborador[];
  groupBy: 'gestor' | 'cs';
  onClienteClick?: (cliente: Cliente) => void;
  onClienteUpdate?: () => void;
  clientesSelecionados?: string[];
  toggleClienteSelection?: (id: string) => void;
  setClientesSelecionados?: React.Dispatch<React.SetStateAction<string[]>>;
  canCreateContent?: boolean;
  activeTab?: string;
}

// Opções para classificações
const seriesOptions = ['Serie A', 'Serie B', 'Serie C', 'Serie D'];

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

// Definição das colunas (mesmos nomes da visualização padrão)
const columnDefinitions = [
  { id: 'categoria', label: 'Categoria' },
  { id: 'serie', label: 'Série' },
  { id: 'situacao_cliente', label: 'Situação do Cliente' },
  { id: 'etapa_onboarding', label: 'Etapa Onboarding' },
  { id: 'etapa_trafego', label: 'Etapas de Tráfego' },
];

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
      <div className="flex items-center gap-1 justify-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-primary p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center flex-1 cursor-pointer justify-center" onClick={onClick}>
          {children}
        </div>
      </div>
    </TableHead>
  );
};

export const ClientesGroupedView = ({
  clientes,
  colaboradores,
  groupBy,
  onClienteClick,
  onClienteUpdate,
  clientesSelecionados,
  toggleClienteSelection,
  setClientesSelecionados,
  canCreateContent,
  activeTab
}: ClientesGroupedViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const situacaoOptions = useFieldOptions('situacao_cliente');
  const etapaOnboardingOptions = useFieldOptions('etapa_onboarding');
  const etapaTrafegoOptions = useFieldOptions('etapa_trafego');

  // Estado para ordenação
  const [sortField, setSortField] = useState<string>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Estado para modal de histórico
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState<{ id: string; nome: string } | null>(null);

  // Estado para ordem das colunas (carrega do localStorage)
  const defaultColumnOrder = columnDefinitions.map(c => c.id);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('clientes_grouped_column_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
        localStorage.setItem('clientes_grouped_column_order', JSON.stringify(newOrder));
        return newOrder;
      });
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

  // Função para atualizar campo do cliente
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

      if (onClienteUpdate) {
        onClienteUpdate();
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Agrupar clientes por responsável
  const groupedClientes = useMemo(() => {
    return clientes.reduce((acc, cliente) => {
      let responsavel: { id: string; nome: string; avatar_url?: string } | null = null;

      if (groupBy === 'gestor') {
        responsavel = cliente.primary_gestor || null;
      } else {
        responsavel = cliente.primary_cs || null;
      }

      const groupKey = (responsavel as any)?.user_id || responsavel?.nome || 'sem_responsavel';

      if (!acc[groupKey]) {
        acc[groupKey] = {
          responsavel: responsavel || { id: 'sem_responsavel', nome: 'Sem Responsável' },
          clientes: []
        };
      }

      acc[groupKey].clientes.push(cliente);
      return acc;
    }, {} as Record<string, { responsavel: { id?: string; nome: string; avatar_url?: string; user_id?: string }; clientes: Cliente[] }>);
  }, [clientes, groupBy]);

  // Ordenar grupos por nome do responsável e clientes dentro dos grupos
  const sortedGroups = useMemo(() => {
    const groups = Object.entries(groupedClientes).sort((a, b) => {
      if (a[0] === 'sem_responsavel') return 1;
      if (b[0] === 'sem_responsavel') return -1;
      return a[1].responsavel.nome.localeCompare(b[1].responsavel.nome);
    });

    // Ordenar clientes dentro de cada grupo
    return groups.map(([key, group]) => {
      const sortedClientes = [...group.clientes].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case 'nome':
            aValue = a.nome || '';
            bValue = b.nome || '';
            break;
          case 'categoria':
            aValue = a.categoria || '';
            bValue = b.categoria || '';
            break;
          case 'serie':
            aValue = a.serie || '';
            bValue = b.serie || '';
            break;
          case 'situacao_cliente':
            aValue = a.situacao_cliente || '';
            bValue = b.situacao_cliente || '';
            break;
          case 'etapa_onboarding':
            aValue = a.etapa_onboarding || '';
            bValue = b.etapa_onboarding || '';
            break;
          case 'etapa_trafego':
            aValue = a.etapa_trafego || '';
            bValue = b.etapa_trafego || '';
            break;
          default:
            aValue = a.nome || '';
            bValue = b.nome || '';
        }

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

      return [key, { ...group, clientes: sortedClientes }] as [string, typeof group];
    });
  }, [groupedClientes, sortField, sortDirection]);

  // Inicializar com todos os grupos expandidos
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    return new Set(Object.keys(groupedClientes));
  });

  // Atualizar grupos expandidos quando os grupos mudarem
  useEffect(() => {
    setExpandedGroups(new Set(Object.keys(groupedClientes)));
  }, [groupedClientes]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(sortedGroups.map(([key]) => key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleSelectGroup = (e: React.MouseEvent, groupClientes: Cliente[]) => {
    e.stopPropagation();
    if (!setClientesSelecionados || !clientesSelecionados) return;

    const groupClientIds = groupClientes.map((c: Cliente) => c.id);
    const allSelectedInGroup = groupClientIds.every((id: string) => clientesSelecionados.includes(id));

    if (allSelectedInGroup) {
      setClientesSelecionados((prev: string[]) => prev.filter((id: string) => !groupClientIds.includes(id)));
    } else {
      setClientesSelecionados((prev: string[]) => {
        const newSelected = new Set([...prev, ...groupClientIds]);
        return Array.from(newSelected);
      });
    }
  };

  const getColumnLabel = (columnId: string) => {
    return columnDefinitions.find(c => c.id === columnId)?.label || columnId;
  };

  // Renderizar célula baseada na coluna
  const renderCell = (cliente: Cliente, columnId: string) => {
    switch (columnId) {
      case 'categoria':
        return (
          <TableCell className="text-center py-4">
            <Badge
              variant="outline"
              className={`font-semibold text-xs tracking-tight rounded-full px-3 py-1 bg-transparent border uppercase ${cliente.categoria === 'negocio_local'
                ? 'text-blue-600 border-blue-200'
                : 'text-green-600 border-green-200'
                }`}
            >
              {cliente.categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
            </Badge>
          </TableCell>
        );
      case 'serie':
        return (
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <Badge className={`${getSerieColor(cliente.serie || 'Serie A')} rounded-full px-3 py-1 font-semibold tracking-tight text-[11px] cursor-pointer hover:opacity-80 flex items-center gap-1 bg-transparent border`}>
                    {cliente.serie || 'Serie A'}
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-background rounded-xl p-1 shadow-lg">
                {seriesOptions.map((serie) => (
                  <DropdownMenuItem
                    key={serie}
                    onClick={() => handleStatusChange(cliente.id, 'serie', serie, cliente.serie || 'Serie A')}
                    className={`rounded-lg cursor-pointer my-0.5 ${cliente.serie === serie ? 'bg-muted' : ''}`}
                  >
                    <Badge className={`${getSerieColor(serie)} text-xs w-full justify-center bg-transparent border`}>
                      {serie}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        );
      case 'situacao_cliente':
        return (
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <Badge
                    style={{ backgroundColor: situacaoOptions.getColor(cliente.situacao_cliente) }}
                    className="text-white font-bold tracking-wide rounded-full text-[11px] cursor-pointer hover:opacity-80 flex items-center justify-center gap-1.5 px-3.5 py-1.5 border-transparent shadow-sm w-[140px]"
                  >
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
          </TableCell>
        );
      case 'etapa_onboarding':
        return (
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <Badge
                    style={{ backgroundColor: etapaOnboardingOptions.getColor(cliente.etapa_onboarding) }}
                    className="text-white font-bold tracking-wide rounded-full text-[11px] cursor-pointer hover:opacity-80 flex items-center justify-center gap-1.5 px-3.5 py-1.5 border-transparent shadow-sm w-[140px]"
                  >
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
          </TableCell>
        );
      case 'etapa_trafego':
        return (
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <Badge
                    style={{ backgroundColor: etapaTrafegoOptions.getColor(cliente.etapa_trafego) }}
                    className="text-white font-bold tracking-wide rounded-full text-[11px] cursor-pointer hover:opacity-80 flex items-center justify-center gap-1.5 px-3.5 py-1.5 border-transparent shadow-sm w-[140px] whitespace-nowrap overflow-hidden text-ellipsis"
                  >
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
          </TableCell>
        );
      case 'gestor':
        return (
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex justify-center items-center gap-1.5 cursor-pointer group/avatar p-1 rounded-md hover:bg-slate-100/50 transition-colors">
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
                </div>
                <DropdownMenuItem onClick={async (e) => {
                  e.stopPropagation();
                  await supabase.from('clientes').update({ primary_gestor_user_id: null }).eq('id', cliente.id);
                  if (onClienteUpdate) onClienteUpdate();
                }} className="rounded-lg cursor-pointer my-0.5 opacity-80">
                  Nenhum gestor
                </DropdownMenuItem>
                {colaboradores.map((colab: any) => (
                  <DropdownMenuItem key={colab.user_id} onClick={async (e) => {
                    e.stopPropagation();
                    await supabase.from('clientes').update({ primary_gestor_user_id: colab.user_id }).eq('id', cliente.id);
                    if (onClienteUpdate) onClienteUpdate();
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
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
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
                </div>
                <DropdownMenuItem onClick={async (e) => {
                  e.stopPropagation();
                  await supabase.from('clientes').update({ primary_cs_user_id: null }).eq('id', cliente.id);
                  if (onClienteUpdate) onClienteUpdate();
                }} className="rounded-lg cursor-pointer my-0.5 opacity-80">
                  Nenhum CS
                </DropdownMenuItem>
                {colaboradores.map((colab: any) => (
                  <DropdownMenuItem key={colab.user_id} onClick={async (e) => {
                    e.stopPropagation();
                    await supabase.from('clientes').update({ primary_cs_user_id: colab.user_id }).eq('id', cliente.id);
                    if (onClienteUpdate) onClienteUpdate();
                  }} className="rounded-lg cursor-pointer my-0.5 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={colab.avatar_url} />
                      <AvatarFallback className="text-[10px]">{colab.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">{colab.nome}</span>
                    {primaryCs?.id === colab.user_id && <Check className="h-4 w-4 text-blue-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Controles de expansão */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expandir todos
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Recolher todos
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          {clientes.length} clientes em {sortedGroups.length} grupos
        </span>
      </div>

      {sortedGroups.map(([groupKey, group]) => {
        const isExpanded = expandedGroups.has(groupKey);

        return (
          <Collapsible
            key={groupKey}
            open={isExpanded}
            onOpenChange={() => toggleGroup(groupKey)}
          >
            <div className="border rounded-lg bg-card">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}

                    <Avatar className="h-9 w-9 ring-1 ring-border shadow-sm">
                      {group.responsavel.avatar_url ? (
                        <AvatarImage src={group.responsavel.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold font-mono">
                        {group.responsavel.nome === 'Sem Responsável' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          group.responsavel.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <span className="font-semibold text-foreground text-base">
                        {group.responsavel.nome}
                      </span>
                      <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full text-xs">
                        {group.clientes.length} {group.clientes.length === 1 ? 'cliente' : 'clientes'}
                      </Badge>
                    </div>
                  </div>
                  {canCreateContent && activeTab === 'ativos' && clientesSelecionados && (
                    <div onClick={(e) => e.stopPropagation()} className="ml-auto mr-4">
                      <Checkbox
                        checked={group.clientes.length > 0 && group.clientes.every((c: Cliente) => clientesSelecionados.includes(c.id))}
                        onCheckedChange={() => handleSelectGroup(new MouseEvent('click') as any, group.clientes)}
                        className="h-4 w-4 border-slate-300"
                      />
                    </div>
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t overflow-x-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleColumnDragEnd}
                  >
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="border-b border-border/50">
                          {canCreateContent && activeTab === 'ativos' && clientesSelecionados && (
                            <TableHead className="w-12 text-center align-middle px-4">
                              <Checkbox
                                checked={group.clientes.length > 0 && group.clientes.every((c: Cliente) => clientesSelecionados.includes(c.id))}
                                onCheckedChange={() => handleSelectGroup(new MouseEvent('click') as any, group.clientes)}
                                className="border-slate-300"
                              />
                            </TableHead>
                          )}
                          <TableHead
                            className="cursor-pointer hover:bg-slate-100/50 transition-colors font-semibold text-slate-600 h-11"
                            onClick={() => handleSort('nome')}
                          >
                            <div className="flex items-center text-xs tracking-tight uppercase px-4">
                              Cliente
                              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                            </div>
                          </TableHead>
                          <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                            {columnOrder.map((columnId) => (
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.clientes.map((cliente) => (
                          <TableRow
                            key={cliente.id}
                            className="hover:bg-slate-50/50 cursor-pointer h-16 transition-colors border-b border-border/50 group/row"
                            onClick={() => {
                              if (onClienteClick) {
                                onClienteClick(cliente);
                              } else {
                                navigate(`/painel/${cliente.id}`);
                              }
                            }}
                          >
                            {canCreateContent && activeTab === 'ativos' && toggleClienteSelection && clientesSelecionados && (
                              <TableCell className="w-12 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={clientesSelecionados.includes(cliente.id)}
                                  onCheckedChange={() => toggleClienteSelection(cliente.id)}
                                  className="border-slate-300"
                                />
                              </TableCell>
                            )}
                            <TableCell className="py-4 px-8 font-medium text-foreground text-sm">
                              <div className="flex items-center gap-2 group">
                                <div className="h-4 w-4 rounded-full border border-blue-200 bg-blue-50/50 flex-shrink-0" />
                                <span className="font-bold text-slate-800 group-hover/row:text-blue-600 transition-colors uppercase tracking-tight text-[13px]">{cliente.nome}</span>
                                {cliente.funis_trabalhando && cliente.funis_trabalhando.length > 0 && (
                                  <div className="flex flex-wrap gap-1 ml-2">
                                    <Badge variant="outline" className="text-[10px] font-semibold tracking-wide">
                                      {cliente.funis_trabalhando[0]}
                                      {cliente.funis_trabalhando.length > 1 && ` +${cliente.funis_trabalhando.length - 1}`}
                                    </Badge>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground/50 opacity-0 group-hover:opacity-100 group-hover/row:opacity-100 transition-opacity hover:text-primary hover:bg-muted ml-auto mr-4"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setClienteHistorico({ id: cliente.id, nome: cliente.nome });
                                    setHistoricoModalOpen(true);
                                  }}
                                  title="Ver histórico de alterações"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>

                            {columnOrder.map((columnId) => (
                              <React.Fragment key={columnId}>
                                {renderCell(cliente, columnId)}
                              </React.Fragment>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {sortedGroups.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum cliente encontrado.
        </div>
      )}

      {/* Modal de Histórico */}
      {clienteHistorico && (
        <HistoricoStatusModal
          isOpen={historicoModalOpen}
          onClose={() => {
            setHistoricoModalOpen(false);
            setClienteHistorico(null);
          }}
          clienteId={clienteHistorico.id}
          clienteNome={clienteHistorico.nome}
        />
      )}
    </div>
  );
};
