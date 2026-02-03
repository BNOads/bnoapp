import React, { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, User, ArrowUpDown, GripVertical, History } from "lucide-react";
import { HistoricoStatusModal } from "./HistoricoStatusModal";
import { useNavigate } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

// Opções para classificações (mesmos nomes da visualização padrão)
const situacaoClienteOptions = [
  { value: 'nao_iniciado', label: 'Não Iniciado', color: 'bg-gray-500' },
  { value: 'alerta', label: 'Alerta', color: 'bg-red-500' },
  { value: 'ponto_de_atencao', label: 'Ponto de Atenção', color: 'bg-yellow-500' },
  { value: 'resultados_normais', label: 'Resultados Normais', color: 'bg-blue-500' },
  { value: 'indo_bem', label: 'Indo bem', color: 'bg-green-500' },
];

const etapaOnboardingOptions = [
  { value: 'onboarding', label: 'Onboarding', color: 'bg-orange-500' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-green-500' },
  { value: 'pausa_temporaria', label: 'Pausa Temporária', color: 'bg-red-500' },
];

const etapaTrafegoOptions = [
  { value: 'estrategia', label: 'Estratégia', color: 'bg-gray-500' },
  { value: 'distribuicao_criativos', label: 'Distribuição de Criativos', color: 'bg-blue-500' },
  { value: 'conversao_iniciada', label: 'Conversão Iniciada', color: 'bg-yellow-500' },
  { value: 'voo_de_cruzeiro', label: 'Voo de Cruzeiro', color: 'bg-green-500' },
  { value: 'campanhas_pausadas', label: 'Campanhas Pausadas', color: 'bg-red-500' },
];

const seriesOptions = ['Serie A', 'Serie B', 'Serie C', 'Serie D'];

const getStatusOption = (options: typeof situacaoClienteOptions, value: string | null | undefined) => {
  return options.find(o => o.value === value) || options[0];
};

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
  onClienteUpdate
}: ClientesGroupedViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
              className={`text-sm font-medium px-4 py-2 min-w-[140px] justify-center ${
                cliente.categoria === 'negocio_local'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-green-50 text-green-700 border-green-200'
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
                  <Badge className={`${getSerieColor(cliente.serie || 'Serie A')} text-sm font-medium px-4 py-2 min-w-[100px] justify-center cursor-pointer hover:opacity-80 flex items-center gap-1`}>
                    {cliente.serie || 'Serie A'}
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-background">
                {seriesOptions.map((serie) => (
                  <DropdownMenuItem
                    key={serie}
                    onClick={() => handleStatusChange(cliente.id, 'serie', serie, cliente.serie || 'Serie A')}
                    className={cliente.serie === serie ? 'bg-muted' : ''}
                  >
                    <Badge className={`${getSerieColor(serie)} text-sm w-full justify-center`}>
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
                    className={`${getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).color} text-white text-sm font-medium px-4 py-2 min-w-[160px] justify-center cursor-pointer hover:opacity-80 flex items-center gap-1`}
                  >
                    {getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).label}
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-background">
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
          </TableCell>
        );
      case 'etapa_onboarding':
        return (
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <Badge
                    className={`${getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).color} text-white text-sm font-medium px-4 py-2 min-w-[140px] justify-center cursor-pointer hover:opacity-80 flex items-center gap-1`}
                  >
                    {getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).label}
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-background">
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
          </TableCell>
        );
      case 'etapa_trafego':
        return (
          <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <Badge
                    className={`${getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).color} text-white text-sm font-medium px-4 py-2 min-w-[180px] justify-center cursor-pointer hover:opacity-80 flex items-center gap-1`}
                  >
                    {getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).label}
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-background">
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
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}

                    <Avatar className="h-8 w-8">
                      {group.responsavel.avatar_url ? (
                        <AvatarImage src={group.responsavel.avatar_url} />
                      ) : null}
                      <AvatarFallback className="text-xs bg-primary/10">
                        {group.responsavel.nome === 'Sem Responsável' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          group.responsavel.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <span className="font-medium text-foreground">
                        {group.responsavel.nome}
                      </span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {group.clientes.length}
                      </Badge>
                    </div>
                  </div>
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
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('nome')}
                          >
                            <div className="flex items-center">
                              Cliente
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </div>
                          </TableHead>
                          <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                            {columnOrder.map((columnId) => (
                              <SortableTableHead
                                key={columnId}
                                id={columnId}
                                onClick={() => handleSort(columnId)}
                                className="text-center hover:bg-muted/50"
                              >
                                {getColumnLabel(columnId)}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              </SortableTableHead>
                            ))}
                          </SortableContext>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.clientes.map((cliente) => (
                          <TableRow
                            key={cliente.id}
                            className="hover:bg-muted/50 cursor-pointer h-16"
                            onClick={() => {
                              if (onClienteClick) {
                                onClienteClick(cliente);
                              } else {
                                navigate(`/painel/${cliente.id}`);
                              }
                            }}
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-base">{cliente.nome}</span>
                                {cliente.funis_trabalhando && cliente.funis_trabalhando.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {cliente.funis_trabalhando[0]}
                                    {cliente.funis_trabalhando.length > 1 && ` +${cliente.funis_trabalhando.length - 1}`}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary ml-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setClienteHistorico({ id: cliente.id, nome: cliente.nome });
                                    setHistoricoModalOpen(true);
                                  }}
                                  title="Ver histórico de alterações"
                                >
                                  <History className="h-4 w-4" />
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
