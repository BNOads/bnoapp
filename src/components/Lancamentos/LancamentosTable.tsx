import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, ExternalLink, Calendar, DollarSign, User, Building, X, Edit, ChevronUp, ChevronDown, ChevronsUpDown, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditarLancamentoModal from './EditarLancamentoModal';
import { Link } from 'react-router-dom';

interface LancamentosTableProps {
  lancamentos: any[];
  onRefresh: () => void;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  tipoLabels: Record<string, string>;
  showFilters?: boolean;
  filtros?: {
    status: string;
    tipo: string;
    cliente: string;
  };
  onFiltrosChange?: (filtros: any) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onSort?: (key: string) => void;
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  } | null;
}

export const LancamentosTable = ({ 
  lancamentos, 
  onRefresh, 
  statusColors, 
  statusLabels, 
  tipoLabels,
  showFilters = false,
  filtros = { status: 'all', tipo: 'all', cliente: 'all' },
  onFiltrosChange = () => {},
  selectedIds = [],
  onSelectionChange = () => {},
  onSort = () => {},
  sortConfig = null
}: LancamentosTableProps) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [editingLancamento, setEditingLancamento] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, primary_gestor_user_id')
      .eq('ativo', true);
    setClientes(data || []);
  };

  const clearFiltros = () => {
    onFiltrosChange({ status: 'all', tipo: 'all', cliente: 'all' });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(lancamentos.map(l => l.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const isAllSelected = lancamentos.length > 0 && selectedIds.length === lancamentos.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < lancamentos.length;

  const handleEditLancamento = (lancamento: any) => {
    setEditingLancamento(lancamento);
    setShowEditModal(true);
  };

  const handleLancamentoAtualizado = () => {
    onRefresh();
    setShowEditModal(false);
    setEditingLancamento(null);
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-primary" />
      : <ChevronDown className="h-4 w-4 text-primary" />;
  };

  const handleChangeGestor = async (lancamentoId: string, gestorId: string | null) => {
    const { error } = await supabase
      .from('lancamentos')
      .update({ gestor_responsavel_id: gestorId })
      .eq('id', lancamentoId);
    if (error) {
      toast({ title: 'Erro ao atualizar gestor', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gestor atualizado' });
      onRefresh();
    }
  };

  const handleChangeCliente = async (lancamentoId: string, clienteId: string) => {
    try {
      // Buscar gestor primário do cliente (user_id)
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('primary_gestor_user_id')
        .eq('id', clienteId)
        .maybeSingle();
      if (clienteError) throw clienteError;

      let gestorColabId: string | null = null;
      if (cliente?.primary_gestor_user_id) {
        const { data: colab } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('user_id', cliente.primary_gestor_user_id)
          .maybeSingle();
        gestorColabId = colab?.id ?? null;
      }

      const { error: updateError } = await supabase
        .from('lancamentos')
        .update({ cliente_id: clienteId, gestor_responsavel_id: gestorColabId })
        .eq('id', lancamentoId);
      if (updateError) throw updateError;

      toast({ title: 'Cliente associado', description: 'Associação realizada com sucesso.' });
      onRefresh();
    } catch (e: any) {
      console.error('Erro ao associar cliente:', e);
      toast({ title: 'Erro ao associar cliente', description: e.message, variant: 'destructive' });
    }
  };

  const SortableHeader = ({ children, sortKey }: { children: React.ReactNode; sortKey: string }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {children}
        {getSortIcon(sortKey)}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFiltros}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filtros.status} onValueChange={(value) => onFiltrosChange({...filtros, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="em_captacao">Em Captação</SelectItem>
                    <SelectItem value="cpl">CPL</SelectItem>
                    <SelectItem value="remarketing">Remarketing</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select value={filtros.tipo} onValueChange={(value) => onFiltrosChange({...filtros, tipo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="semente">Semente</SelectItem>
                    <SelectItem value="interno">Interno</SelectItem>
                    <SelectItem value="externo">Externo</SelectItem>
                    <SelectItem value="perpetuo">Perpétuo</SelectItem>
                    <SelectItem value="flash">Flash</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="tradicional">Lançamento Tradicional</SelectItem>
                    <SelectItem value="captacao_simples">Captação simples</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <Select value={filtros.cliente} onValueChange={(value) => onFiltrosChange({...filtros, cliente: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected || isSomeSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <SortableHeader sortKey="nome_lancamento">Lançamento</SortableHeader>
                <SortableHeader sortKey="clientes.nome">Cliente</SortableHeader>
                <SortableHeader sortKey="status_lancamento">Status</SortableHeader>
                <SortableHeader sortKey="tipo_lancamento">Tipo</SortableHeader>
                <SortableHeader sortKey="investimento_total">Investimento</SortableHeader>
                <SortableHeader sortKey="data_inicio_captacao">Data Início</SortableHeader>
                <SortableHeader sortKey="data_inicio_cpl">Início CPL</SortableHeader>
                <TableHead>Dashboard</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map((lancamento) => (
                <TableRow key={lancamento.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(lancamento.id)}
                      onCheckedChange={(checked) => handleSelectItem(lancamento.id, checked as boolean)}
                      aria-label={`Selecionar ${lancamento.nome_lancamento}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">
                        <Link to={`/lancamentos/${lancamento.id}`} className="text-primary hover:underline">
                          {lancamento.nome_lancamento}
                        </Link>
                      </div>
                      {lancamento.descricao && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {lancamento.descricao}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Select
                      value={lancamento.cliente_id ?? 'none'}
                      onValueChange={(value) => {
                        if (value === 'none') return;
                        handleChangeCliente(lancamento.id, value);
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem cliente</SelectItem>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className={`${statusColors[lancamento.status_lancamento]} text-white`}>
                      {statusLabels[lancamento.status_lancamento]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            className={`
                              ${lancamento.tipo_lancamento === 'tradicional' ? 'bg-[#2563EB] text-white hover:bg-[#2563EB]/90' : ''}
                              ${lancamento.tipo_lancamento === 'captacao_simples' ? 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90' : ''}
                              ${lancamento.tipo_lancamento === 'semente' ? 'bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90' : ''}
                              ${lancamento.tipo_lancamento === 'perpetuo' ? 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90' : ''}
                              ${!['tradicional', 'captacao_simples', 'semente', 'perpetuo'].includes(lancamento.tipo_lancamento) ? 'bg-[#9CA3AF] text-white hover:bg-[#9CA3AF]/90' : ''}
                            `}
                          >
                            {tipoLabels[lancamento.tipo_lancamento]}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tipo do Lançamento: {tipoLabels[lancamento.tipo_lancamento]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        R$ {Number(lancamento.investimento_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(lancamento.data_inicio_captacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {lancamento.data_inicio_cpl ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(lancamento.data_inicio_cpl).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {lancamento.link_dashboard ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        asChild
                      >
                        <a href={lancamento.link_dashboard.startsWith('http') ? lancamento.link_dashboard : `https://${lancamento.link_dashboard}`} target="_blank" rel="noopener noreferrer">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Abrir
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditLancamento(lancamento)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {lancamento.link_dashboard && (
                          <DropdownMenuItem asChild>
                            <a href={lancamento.link_dashboard} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver Dashboard
                            </a>
                          </DropdownMenuItem>
                        )}
                        {lancamento.link_briefing && (
                          <DropdownMenuItem asChild>
                            <a href={lancamento.link_briefing} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver Briefing
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditarLancamentoModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        lancamento={editingLancamento}
        onLancamentoAtualizado={handleLancamentoAtualizado}
      />
    </div>
  );
};

export default LancamentosTable;