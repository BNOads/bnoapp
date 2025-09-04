import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, ExternalLink, Calendar, DollarSign, User, Building, X, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditarLancamentoModal from './EditarLancamentoModal';

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
  onSelectionChange = () => {}
}: LancamentosTableProps) => {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [editingLancamento, setEditingLancamento] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchColaboradores();
    fetchClientes();
  }, []);

  const fetchColaboradores = async () => {
    const { data } = await supabase
      .from('colaboradores')
      .select('id, nome')
      .eq('ativo', true);
    setColaboradores(data || []);
  };

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
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
                <TableHead>Lançamento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Investimento</TableHead>
                <TableHead>Data Início</TableHead>
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
                      <div className="font-semibold">{lancamento.nome_lancamento}</div>
                      {lancamento.descricao && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {lancamento.descricao}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {lancamento.clientes?.nome ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{lancamento.clientes.nome}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Cliente não definido</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className={`${statusColors[lancamento.status_lancamento]} text-white`}>
                      {statusLabels[lancamento.status_lancamento]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {tipoLabels[lancamento.tipo_lancamento]}
                    </span>
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