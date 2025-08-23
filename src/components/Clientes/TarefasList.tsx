import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Clock, AlertCircle, Plus, Users, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  tipo: string;
  data_vencimento: string;
  created_at: string;
}

interface TarefasListProps {
  clienteId: string;
  tipo: 'equipe' | 'cliente';
}

export const TarefasList = ({ clienteId, tipo }: TarefasListProps) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    data_vencimento: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
    loadTarefas();
  }, [clienteId, tipo]);

  const loadTarefas = async () => {
    try {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('tipo', tipo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tarefas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const criarTarefa = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('tarefas')
        .insert({
          ...novaTarefa,
          cliente_id: clienteId,
          tipo,
          created_by: user.data.user.id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso",
      });

      setShowModal(false);
      setNovaTarefa({
        titulo: '',
        descricao: '',
        prioridade: 'media',
        data_vencimento: '',
      });
      loadTarefas();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa",
        variant: "destructive",
      });
    }
  };

  const atualizarStatus = async (tarefaId: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('tarefas')
        .update({ status: novoStatus })
        .eq('id', tarefaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da tarefa atualizado",
      });

      loadTarefas();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tarefa",
        variant: "destructive",
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluida':
        return { icon: CheckCircle, variant: 'default' as const, color: 'text-green-600' };
      case 'em_andamento':
        return { icon: Clock, variant: 'secondary' as const, color: 'text-blue-600' };
      case 'pendente':
        return { icon: AlertCircle, variant: 'outline' as const, color: 'text-yellow-600' };
      default:
        return { icon: AlertCircle, variant: 'outline' as const, color: 'text-gray-600' };
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'border-l-red-500';
      case 'media': return 'border-l-yellow-500';
      case 'baixa': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando tarefas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {tipo === 'equipe' ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
            {tipo === 'equipe' ? 'Tarefas da Equipe' : 'Tarefas do Cliente'}
          </CardTitle>
          {isAuthenticated && (
            <Dialog open={showModal} onOpenChange={setShowModal}>
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
                  <Input
                    placeholder="Título da tarefa"
                    value={novaTarefa.titulo}
                    onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })}
                  />
                  <Textarea
                    placeholder="Descrição da tarefa"
                    value={novaTarefa.descricao}
                    onChange={(e) => setNovaTarefa({ ...novaTarefa, descricao: e.target.value })}
                  />
                  <Select
                    value={novaTarefa.prioridade}
                    onValueChange={(value) => setNovaTarefa({ ...novaTarefa, prioridade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={novaTarefa.data_vencimento}
                    onChange={(e) => setNovaTarefa({ ...novaTarefa, data_vencimento: e.target.value })}
                  />
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
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tarefas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tarefa encontrada</p>
            <p className="text-sm">
              {tipo === 'equipe' ? 'Crie tarefas para organizar o trabalho da equipe' : 'Crie tarefas para o cliente acompanhar'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tarefas.map((tarefa) => {
              const statusConfig = getStatusConfig(tarefa.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={tarefa.id} className={`border-l-4 ${getPrioridadeColor(tarefa.prioridade)} bg-muted/30 rounded-lg p-4`}>
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
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Criada: {new Date(tarefa.created_at).toLocaleDateString('pt-BR')}</span>
                        {tarefa.data_vencimento && (
                          <span>Vencimento: {new Date(tarefa.data_vencimento).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isAuthenticated && tarefa.status !== 'concluida' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => atualizarStatus(tarefa.id, 'concluida')}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};