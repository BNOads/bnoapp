import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CheckCircle, Clock, AlertCircle, Plus, Users, User, Search, Edit, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  eh_tarefa_bnoapp: boolean;
  data_vencimento: string;
  created_at: string;
  data_conclusao?: string;
  concluida_por?: string;
  responsavel_id?: string;
}
interface TarefasListProps {
  clienteId: string;
  tipo: 'equipe' | 'cliente';
  isPublicView?: boolean;
}
const TAREFAS_PER_PAGE = 10;
export const TarefasListEnhanced = ({
  clienteId,
  tipo,
  isPublicView = false
}: TarefasListProps) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [tarefasConcluidas, setTarefasConcluidas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'brasileirao',
    data_vencimento: ''
  });
  const {
    toast
  } = useToast();

  // Search functionality for active tasks
  const {
    searchTerm,
    setSearchTerm,
    filteredItems: filteredTarefas
  } = useSearch(tarefas.filter(t => t.status !== 'concluida'), ['titulo', 'descricao']);

  // Search functionality for completed tasks
  const {
    searchTerm: completedSearchTerm,
    setSearchTerm: setCompletedSearchTerm,
    filteredItems: filteredTarefasConcluidas
  } = useSearch(tarefasConcluidas, ['titulo', 'descricao']);

  // Pagination logic for active tasks
  const totalPages = Math.ceil(filteredTarefas.length / TAREFAS_PER_PAGE);
  const startIndex = (currentPage - 1) * TAREFAS_PER_PAGE;
  const endIndex = startIndex + TAREFAS_PER_PAGE;
  const currentTarefas = filteredTarefas.slice(startIndex, endIndex);

  // Pagination logic for completed tasks
  const completedTotalPages = Math.ceil(filteredTarefasConcluidas.length / TAREFAS_PER_PAGE);
  const completedStartIndex = (completedCurrentPage - 1) * TAREFAS_PER_PAGE;
  const completedEndIndex = completedStartIndex + TAREFAS_PER_PAGE;
  const currentCompletedTarefas = filteredTarefasConcluidas.slice(completedStartIndex, completedEndIndex);
  useEffect(() => {
    const checkAuth = async () => {
      if (!isPublicView) {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
    loadTarefas();
  }, [clienteId, tipo, isPublicView]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  useEffect(() => {
    setCompletedCurrentPage(1);
  }, [completedSearchTerm]);
  const loadTarefas = async () => {
    try {
      let clientInstance = supabase;
      if (isPublicView) {
        const {
          createPublicSupabaseClient
        } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }
      const {
        data,
        error
      } = await clientInstance.from('tarefas' as any).select('*').eq('cliente_id', clienteId).eq('eh_tarefa_bnoapp', tipo === 'equipe').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const allTarefas = (data as any) || [];
      setTarefas(allTarefas);
      setTarefasConcluidas(allTarefas.filter((t: any) => t.status === 'concluida'));
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tarefas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const criarTarefa = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');
      const {
        error
      } = await supabase.from('tarefas' as any).insert({
        ...novaTarefa,
        cliente_id: clienteId,
        eh_tarefa_bnoapp: tipo === 'equipe',
        created_by: user.data.user.id,
        status: 'pendente'
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso"
      });
      setShowModal(false);
      setNovaTarefa({
        titulo: '',
        descricao: '',
        prioridade: 'brasileirao',
        data_vencimento: ''
      });
      loadTarefas();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa",
        variant: "destructive"
      });
    }
  };
  const editarTarefa = async () => {
    if (!editingTarefa) return;
    try {
      const {
        error
      } = await supabase.from('tarefas').update({
        titulo: editingTarefa.titulo,
        descricao: editingTarefa.descricao,
        prioridade: editingTarefa.prioridade as 'brasileirao' | 'libertadores' | 'copa_mundo',
        data_vencimento: editingTarefa.data_vencimento
      }).eq('id', editingTarefa.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso"
      });
      setShowEditModal(false);
      setEditingTarefa(null);
      loadTarefas();
    } catch (error) {
      console.error('Erro ao editar tarefa:', error);
      toast({
        title: "Erro",
        description: "Erro ao editar tarefa",
        variant: "destructive"
      });
    }
  };
  const concluirTarefa = async (tarefaId: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');
      const {
        error
      } = await supabase.from('tarefas').update({
        status: 'concluida'
      }).eq('id', tarefaId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Tarefa marcada como concluída"
      });
      loadTarefas();
      // Adjust pagination if necessary
      if (currentTarefas.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error);
      toast({
        title: "Erro",
        description: "Erro ao concluir tarefa",
        variant: "destructive"
      });
    }
  };
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluida':
        return {
          icon: CheckCircle,
          variant: 'default' as const,
          color: 'text-green-600'
        };
      case 'em_andamento':
        return {
          icon: Clock,
          variant: 'secondary' as const,
          color: 'text-blue-600'
        };
      case 'pendente':
        return {
          icon: AlertCircle,
          variant: 'outline' as const,
          color: 'text-yellow-600'
        };
      default:
        return {
          icon: AlertCircle,
          variant: 'outline' as const,
          color: 'text-gray-600'
        };
    }
  };
  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'copa_mundo':
        return 'border-l-red-500';
      case 'libertadores':
        return 'border-l-yellow-500';
      case 'brasileirao':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };
  if (loading) {
    return <div className="text-center py-4">Carregando tarefas...</div>;
  }
  const tarefasAtivas = tarefas.filter(t => t.status !== 'concluida');
  return <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            
            {tarefasConcluidas.length > 0 && <Dialog open={showCompletedModal} onOpenChange={setShowCompletedModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluídas ({tarefasConcluidas.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tarefas Concluídas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Search for completed tasks */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input placeholder="Buscar tarefas concluídas..." value={completedSearchTerm} onChange={e => setCompletedSearchTerm(e.target.value)} className="pl-9" />
                    </div>

                    {filteredTarefasConcluidas.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                        {completedSearchTerm ? <p>Nenhuma tarefa concluída encontrada para "{completedSearchTerm}"</p> : <p>Nenhuma tarefa concluída</p>}
                      </div> : <>
                        <div className="space-y-3">
                          {currentCompletedTarefas.map(tarefa => {
                      const statusConfig = getStatusConfig(tarefa.status);
                      const StatusIcon = statusConfig.icon;
                      return <div key={tarefa.id} className={`border-l-4 ${getPrioridadeColor(tarefa.prioridade)} bg-muted/30 rounded-lg p-4`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold">{tarefa.titulo}</h4>
                                      <Badge variant={statusConfig.variant}>
                                        <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
                                        Concluída
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {tarefa.prioridade}
                                      </Badge>
                                    </div>
                                    {tarefa.descricao && <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span>Criada: {new Date(tarefa.created_at).toLocaleDateString('pt-BR')}</span>
                                      {tarefa.data_vencimento && <span>Vencimento: {new Date(tarefa.data_vencimento).toLocaleDateString('pt-BR')}</span>}
                                      {tarefa.data_conclusao && <span>Concluída: {new Date(tarefa.data_conclusao).toLocaleDateString('pt-BR')}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>;
                    })}
                        </div>

                        {/* Pagination for completed tasks */}
                        {completedTotalPages > 1 && <div className="flex justify-center mt-6">
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious onClick={() => setCompletedCurrentPage(Math.max(1, completedCurrentPage - 1))} className={completedCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                </PaginationItem>
                                
                                {Array.from({
                          length: completedTotalPages
                        }, (_, i) => i + 1).map(page => <PaginationItem key={page}>
                                    <PaginationLink onClick={() => setCompletedCurrentPage(page)} isActive={completedCurrentPage === page} className="cursor-pointer">
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>)}
                                
                                <PaginationItem>
                                  <PaginationNext onClick={() => setCompletedCurrentPage(Math.min(completedTotalPages, completedCurrentPage + 1))} className={completedCurrentPage === completedTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>}
                      </>}
                  </div>
                </DialogContent>
              </Dialog>}
          </div>
          
          <div className="flex items-center gap-2">
            {tarefasAtivas.length > 0 && <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Buscar tarefas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-64" />
              </div>}
            
            {isAuthenticated && <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {tipo === 'equipe' ? 'Nova Tarefa da Equipe' : 'Nova Tarefa do Cliente'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Título da tarefa" value={novaTarefa.titulo} onChange={e => setNovaTarefa({
                  ...novaTarefa,
                  titulo: e.target.value
                })} />
                    <Textarea placeholder="Descrição da tarefa" value={novaTarefa.descricao} onChange={e => setNovaTarefa({
                  ...novaTarefa,
                  descricao: e.target.value
                })} />
                    <Select value={novaTarefa.prioridade} onValueChange={value => setNovaTarefa({
                  ...novaTarefa,
                  prioridade: value
                })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brasileirao">Brasileirão</SelectItem>
                        <SelectItem value="libertadores">Libertadores</SelectItem>
                        <SelectItem value="copa_mundo">Copa do Mundo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={novaTarefa.data_vencimento} onChange={e => setNovaTarefa({
                  ...novaTarefa,
                  data_vencimento: e.target.value
                })} />
                    <div className="flex gap-2">
                      <Button onClick={criarTarefa} className="flex-1">
                        Criar Tarefa
                      </Button>
                      <Button variant="outline" onClick={() => setShowModal(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTarefas.length === 0 ? <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {searchTerm ? <p>Nenhuma tarefa encontrada para "{searchTerm}"</p> : tarefasAtivas.length === 0 ? <>
                <p>Nenhuma tarefa ativa encontrada</p>
                <p className="text-sm">
                  {tipo === 'equipe' ? 'Crie tarefas para organizar o trabalho da equipe' : 'Crie tarefas para o cliente acompanhar'}
                </p>
              </> : null}
          </div> : <>
            <div className="space-y-3">
              {currentTarefas.map(tarefa => {
            const statusConfig = getStatusConfig(tarefa.status);
            const StatusIcon = statusConfig.icon;
            return <div key={tarefa.id} className={`border-l-4 ${getPrioridadeColor(tarefa.prioridade)} bg-muted/30 rounded-lg p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{tarefa.titulo}</h4>
                          <Badge variant={statusConfig.variant}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
                            {tarefa.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {tarefa.prioridade}
                          </Badge>
                        </div>
                        {tarefa.descricao && <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Criada: {new Date(tarefa.created_at).toLocaleDateString('pt-BR')}</span>
                          {tarefa.data_vencimento && <span>Vencimento: {new Date(tarefa.data_vencimento).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isAuthenticated && <>
                            <Button size="sm" variant="outline" onClick={() => {
                      setEditingTarefa(tarefa);
                      setShowEditModal(true);
                    }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => concluirTarefa(tarefa.id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>}
                      </div>
                    </div>
                  </div>;
          })}
            </div>

            {/* Pagination for active tasks */}
            {totalPages > 1 && <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                    
                    {Array.from({
                length: totalPages
              }, (_, i) => i + 1).map(page => <PaginationItem key={page}>
                        <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                          {page}
                        </PaginationLink>
                      </PaginationItem>)}
                    
                    <PaginationItem>
                      <PaginationNext onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>}
          </>}
      </CardContent>

      {/* Edit Task Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          {editingTarefa && <div className="space-y-4">
              <Input placeholder="Título da tarefa" value={editingTarefa.titulo} onChange={e => setEditingTarefa({
            ...editingTarefa,
            titulo: e.target.value
          })} />
              <Textarea placeholder="Descrição da tarefa" value={editingTarefa.descricao} onChange={e => setEditingTarefa({
            ...editingTarefa,
            descricao: e.target.value
          })} />
              <Select value={editingTarefa.prioridade} onValueChange={value => setEditingTarefa({
            ...editingTarefa,
            prioridade: value
          })}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brasileirao">Brasileirão</SelectItem>
                  <SelectItem value="libertadores">Libertadores</SelectItem>
                  <SelectItem value="copa_mundo">Copa do Mundo</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="date" 
                value={editingTarefa.data_vencimento ? editingTarefa.data_vencimento.split('T')[0] : ''} 
                onChange={e => setEditingTarefa({
                  ...editingTarefa,
                  data_vencimento: e.target.value
                })} 
              />
              <div className="flex gap-2">
                <Button onClick={editarTarefa} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </Card>;
};