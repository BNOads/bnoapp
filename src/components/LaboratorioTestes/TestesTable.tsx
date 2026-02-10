import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Copy, Archive, FlaskConical, Play, CheckCircle2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import type { TesteLaboratorio } from '@/types/laboratorio-testes';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TIPO_LABELS,
  VALIDACAO_LABELS,
  VALIDACAO_COLORS,
} from '@/types/laboratorio-testes';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TestesTableProps {
  testes: TesteLaboratorio[];
  loading: boolean;
  onNavigate: (id: string) => void;
  onEdit: (teste: TesteLaboratorio) => void;
  onArchive: (id: string) => void;
  onDuplicate: (teste: TesteLaboratorio) => void;
  onStartTeste: (id: string) => void;
  onConcludeTeste: (id: string) => void;
  onRedoTeste: (id: string) => void;
  canEditAll: boolean;
  canEditOwn: boolean;
  canArchive: boolean;
  currentUserId?: string;
  visibleColumns: string[];
  columnOrder: string[];
  onColumnOrderChange: (newOrder: string[]) => void;
}

type SortKey = 'status' | 'nome' | 'cliente' | 'funil' | 'tipo' | 'gestor' | 'validacao' | 'data';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER = ['rodando', 'planejado', 'pausado', 'concluido', 'cancelado'];

function getInitials(nome: string): string {
  return nome
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

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

function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <TableRow>
      {Array.from({ length: columnCount + 1 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export const TestesTable = ({
  testes,
  loading,
  onNavigate,
  onEdit,
  onArchive,
  onDuplicate,
  onStartTeste,
  onConcludeTeste,
  onRedoTeste,
  canEditAll,
  canEditOwn,
  canArchive,
  currentUserId,
  visibleColumns,
  columnOrder,
  onColumnOrderChange,
}: TestesTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedTestes = useMemo(() => {
    const sorted = [...testes].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'status':
          cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
          break;
        case 'nome':
          cmp = a.nome.localeCompare(b.nome);
          break;
        case 'cliente':
          cmp = (a.cliente?.nome || '').localeCompare(b.cliente?.nome || '');
          break;
        case 'funil':
          cmp = (a.funil || '').localeCompare(b.funil || '');
          break;
        case 'tipo':
          cmp = (TIPO_LABELS[a.tipo_teste] || '').localeCompare(TIPO_LABELS[b.tipo_teste] || '');
          break;
        case 'gestor':
          cmp = (a.gestor?.nome || '').localeCompare(b.gestor?.nome || '');
          break;
        case 'validacao':
          cmp = (VALIDACAO_LABELS[a.validacao] || '').localeCompare(VALIDACAO_LABELS[b.validacao] || '');
          break;
        case 'data':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [testes, sortKey, sortDir]);

  const canUserEdit = (teste: TesteLaboratorio): boolean => {
    if (canEditAll) return true;
    if (canEditOwn && currentUserId && teste.gestor?.user_id === currentUserId) return true;
    return false;
  };

  const allColumns: { key: SortKey; label: string; className?: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'nome', label: 'Nome' },
    { key: 'data', label: 'Data' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'funil', label: 'Funil' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'gestor', label: 'Gestor' },
    { key: 'validacao', label: 'Validação' },
  ];

  const orderedVisibleColumns = useMemo(() => {
    return columnOrder
      .filter(id => visibleColumns.includes(id))
      .map(id => allColumns.find(col => col.key === id))
      .filter(Boolean) as { key: SortKey; label: string; className?: string }[];
  }, [columnOrder, visibleColumns]);

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      onColumnOrderChange(newOrder);
    }
  };

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {orderedVisibleColumns.map(col => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} columnCount={orderedVisibleColumns.length} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (testes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border py-16 text-muted-foreground">
        <FlaskConical className="mb-4 h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">Nenhum experimento encontrado</p>
        <p className="mt-1 text-sm">Tente ajustar os filtros ou crie um novo teste.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleColumnDragEnd}
            >
              <SortableContext
                items={orderedVisibleColumns.map(col => col.key)}
                strategy={horizontalListSortingStrategy}
              >
                {orderedVisibleColumns.map(col => (
                  <SortableTableHead
                    key={col.key}
                    id={col.key}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center whitespace-nowrap">
                      {col.label}
                      <SortIcon column={col.key} />
                    </div>
                  </SortableTableHead>
                ))}
              </SortableContext>
            </DndContext>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTestes.map((teste) => {
            return (
              <TableRow
                key={teste.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onNavigate(teste.id)}
              >
                {orderedVisibleColumns.map(col => {
                  switch (col.key) {
                    case 'status':
                      return (
                        <TableCell key={col.key} onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={STATUS_COLORS[teste.status]}
                            >
                              {STATUS_LABELS[teste.status]}
                            </Badge>
                            {teste.status === 'planejado' && canUserEdit(teste) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => onStartTeste(teste.id)}
                                title="Iniciar teste"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {teste.status === 'rodando' && canUserEdit(teste) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                onClick={() => onConcludeTeste(teste.id)}
                                title="Concluir teste"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {(teste.status === 'concluido' || teste.status === 'cancelado') && canUserEdit(teste) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => onRedoTeste(teste.id)}
                                title="Refazer teste"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      );
                    case 'nome':
                      return (
                        <TableCell key={col.key} className="text-sm font-medium max-w-[200px] truncate">
                          {teste.nome}
                        </TableCell>
                      );
                    case 'data':
                      return (
                        <TableCell key={col.key} className="whitespace-nowrap text-sm">
                          {format(new Date(teste.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                      );
                    case 'cliente':
                      return (
                        <TableCell key={col.key} className="text-sm">
                          {teste.cliente?.nome || '-'}
                        </TableCell>
                      );
                    case 'funil':
                      return (
                        <TableCell key={col.key} className="text-sm">
                          {teste.funil || '-'}
                        </TableCell>
                      );
                    case 'tipo':
                      return (
                        <TableCell key={col.key} className="text-sm">
                          {TIPO_LABELS[teste.tipo_teste]}
                        </TableCell>
                      );
                    case 'gestor':
                      return (
                        <TableCell key={col.key}>
                          {teste.gestor ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(teste.gestor.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{teste.gestor.nome}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    case 'validacao':
                      return (
                        <TableCell key={col.key}>
                          <Badge variant="outline" className={VALIDACAO_COLORS[teste.validacao]}>
                            {VALIDACAO_LABELS[teste.validacao]}
                          </Badge>
                        </TableCell>
                      );
                    default:
                      return null;
                  }
                })}

                {/* Actions */}
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="text-right"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUserEdit(teste) && (
                        <DropdownMenuItem onClick={() => onEdit(teste)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDuplicate(teste)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      {canArchive && (
                        <DropdownMenuItem onClick={() => onArchive(teste.id)}>
                          <Archive className="mr-2 h-4 w-4" />
                          Arquivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
