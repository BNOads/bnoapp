import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, ExternalLink, Calendar, DollarSign, User, Building, X, Edit, ChevronUp, ChevronDown, ChevronsUpDown, BarChart3, Share2, Copy, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  onFiltrosChange = () => { },
  selectedIds = [],
  onSelectionChange = () => { },
  onSort = () => { },
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

  const handleTogglePublicLink = async (lancamento: any) => {
    try {
      if (!lancamento.link_publico_ativo) {
        // Gerar slug único
        const baseSlug = lancamento.nome_lancamento
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50);

        const randomId = Math.random().toString(36).substring(2, 8);
        const slug = `${baseSlug}-${randomId}`;

        const { error } = await supabase
          .from('lancamentos')
          .update({
            link_publico: slug,
            link_publico_ativo: true
          })
          .eq('id', lancamento.id);

        if (error) throw error;

        const publicUrl = `${window.location.origin}/lancamento/${slug}`;
        await navigator.clipboard.writeText(publicUrl);

        toast({
          title: 'Link público ativado!',
          description: 'O link foi copiado para a área de transferência.'
        });
      } else {
        const { error } = await supabase
          .from('lancamentos')
          .update({ link_publico_ativo: false })
          .eq('id', lancamento.id);

        if (error) throw error;

        toast({ title: 'Link público desativado' });
      }

      onRefresh();
    } catch (e: any) {
      console.error('Erro ao gerenciar link público:', e);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleCopyPublicLink = async (lancamento: any) => {
    if (!lancamento.link_publico) return;

    try {
      const publicUrl = `${window.location.origin}/lancamento/${lancamento.link_publico}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: 'Link copiado!', description: 'Link público copiado para a área de transferência.' });
    } catch (e) {
      toast({ title: 'Erro ao copiar link', variant: 'destructive' });
    }
  };

  const handleFinalizarLancamento = async (lancamentoId: string) => {
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({ status_lancamento: 'finalizado' })
        .eq('id', lancamentoId);

      if (error) throw error;

      toast({
        title: "Lançamento finalizado",
        description: "O lançamento foi marcado como finalizado.",
      });
      onRefresh();
    } catch (error: any) {
      console.error('Erro ao finalizar lançamento:', error);
      toast({
        title: "Erro ao finalizar",
        description: error.message,
        variant: "destructive",
      });
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
                <Select value={filtros.status} onValueChange={(value) => onFiltrosChange({ ...filtros, status: value })}>
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
                <Select value={filtros.tipo} onValueChange={(value) => onFiltrosChange({ ...filtros, tipo: value })}>
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
                <Select value={filtros.cliente} onValueChange={(value) => onFiltrosChange({ ...filtros, cliente: value })}>
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

      <Card className="border-border/50 shadow-sm overflow-hidden bg-background/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b-border/50">
                <TableHead className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected || isSomeSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                    className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </TableHead>
                <SortableHeader sortKey="nome_lancamento">Lançamento</SortableHeader>
                <SortableHeader sortKey="clientes.nome">Cliente</SortableHeader>
                <SortableHeader sortKey="status_lancamento">Status</SortableHeader>
                <SortableHeader sortKey="tipo_lancamento">Tipo</SortableHeader>
                <SortableHeader sortKey="investimento_total">Investimento</SortableHeader>
                <SortableHeader sortKey="data_inicio_captacao">Captação</SortableHeader>
                <SortableHeader sortKey="data_inicio_cpl">CPL</SortableHeader>
                <TableHead className="py-3 font-medium text-muted-foreground">Estatísticas</TableHead>
                <TableHead className="w-12 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map((lancamento) => (
                <TableRow key={lancamento.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3">
                    <Checkbox
                      checked={selectedIds.includes(lancamento.id)}
                      onCheckedChange={(checked) => handleSelectItem(lancamento.id, checked as boolean)}
                      aria-label={`Selecionar ${lancamento.nome_lancamento}`}
                      className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableCell>
                  <TableCell className="py-3 font-medium">
                    <div className="flex flex-col gap-0.5">
                      <Link to={`/lancamentos/${lancamento.id}`} className="text-[15px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                        {lancamento.nome_lancamento}
                      </Link>
                      {lancamento.descricao && (
                        <span className="text-[13px] text-muted-foreground line-clamp-1 max-w-[250px]" title={lancamento.descricao}>
                          {lancamento.descricao}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
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

                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit
                        ${lancamento.status_lancamento === 'em_captacao' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}
                        ${lancamento.status_lancamento === 'cpl' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : ''}
                        ${lancamento.status_lancamento === 'remarketing' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : ''}
                        ${lancamento.status_lancamento === 'finalizado' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                        ${lancamento.status_lancamento === 'pausado' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : ''}
                        ${lancamento.status_lancamento === 'cancelado' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ''}
                      `}>
                        <div className={`h-1.5 w-1.5 rounded-full ${statusColors[lancamento.status_lancamento]}`} />
                        {statusLabels[lancamento.status_lancamento]}
                      </div>

                      {(() => {
                        const alerts = [];
                        if (!lancamento.data_inicio_captacao) alerts.push('Data de início não definida');

                        const checklist = lancamento.checklist_configuracao || {};
                        const hasUncheckedItems = Object.values(checklist).some(val => val === false);
                        const topLevelKeys = ['checklist_criativos'];
                        const isMissingKeys = topLevelKeys.some(key => !checklist[key]);

                        if (hasUncheckedItems || isMissingKeys) {
                          alerts.push('Checklist pendente');
                        }

                        if (alerts.length > 0) {
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/50 dark:border-amber-900/50 dark:text-amber-200">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-xs">Pontos de Atenção:</span>
                                    {alerts.map((alert, i) => (
                                      <span key={i} className="text-xs">• {alert}</span>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider w-fit border cursor-help
                            ${lancamento.tipo_lancamento === 'tradicional' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : ''}
                            ${lancamento.tipo_lancamento === 'captacao_simples' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' : ''}
                            ${lancamento.tipo_lancamento === 'semente' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : ''}
                            ${lancamento.tipo_lancamento === 'perpetuo' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : ''}
                            ${!['tradicional', 'captacao_simples', 'semente', 'perpetuo'].includes(lancamento.tipo_lancamento) ? 'bg-muted text-muted-foreground border-border' : ''}
                          `}>
                            {tipoLabels[lancamento.tipo_lancamento]}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tipo do Lançamento: {tipoLabels[lancamento.tipo_lancamento]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-semibold text-[14px] text-emerald-600 dark:text-emerald-400">
                        {Number(lancamento.investimento_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-[13px] font-medium">
                        {new Date(lancamento.data_inicio_captacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    {lancamento.data_inicio_cpl ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-[13px] font-medium">
                          {new Date(lancamento.data_inicio_cpl).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm">-</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    {lancamento.link_dashboard ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        asChild
                      >
                        <a href={lancamento.link_dashboard.startsWith('http') ? lancamento.link_dashboard : `https://${lancamento.link_dashboard}`} target="_blank" rel="noopener noreferrer">
                          <BarChart3 className="h-4 w-4 mr-1.5" />
                          <span className="text-[13px]">Dash</span>
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm pl-2">-</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3 pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuItem onClick={() => handleEditLancamento(lancamento)} className="cursor-pointer">
                          <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                          Editar Lançamento
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleTogglePublicLink(lancamento)} className="cursor-pointer">
                          {lancamento.link_publico_ativo ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2 text-muted-foreground" />
                              Desativar Link Público
                            </>
                          ) : (
                            <>
                              <Share2 className="h-4 w-4 mr-2 text-muted-foreground" />
                              Ativar Link Público
                            </>
                          )}
                        </DropdownMenuItem>

                        {lancamento.link_publico_ativo && lancamento.link_publico && (
                          <DropdownMenuItem onClick={() => handleCopyPublicLink(lancamento)} className="cursor-pointer">
                            <Copy className="h-4 w-4 mr-2 text-muted-foreground" />
                            Copiar Link Público
                          </DropdownMenuItem>
                        )}

                        {lancamento.link_dashboard && (
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <a href={lancamento.link_dashboard} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                              Ver Dashboard
                            </a>
                          </DropdownMenuItem>
                        )}
                        {lancamento.link_briefing && (
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <a href={lancamento.link_briefing} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                              Ver Briefing
                            </a>
                          </DropdownMenuItem>
                        )}

                        {lancamento.status_lancamento !== 'finalizado' && (
                          <DropdownMenuItem onClick={() => {
                            if (window.confirm('Tem certeza que deseja finalizar este lançamento?')) {
                              handleFinalizarLancamento(lancamento.id);
                            }
                          }} className="text-green-600 focus:text-green-700 focus:bg-green-50/50 cursor-pointer mt-1 border-t border-border/50 pt-2">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Finalizar Lançamento
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