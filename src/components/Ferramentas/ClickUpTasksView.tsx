import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle, 
  Calendar,
  MessageSquare,
  ExternalLink,
  Clock,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClickUpDebugPanel from "./ClickUpDebugPanel";
import ClickUpUserLink from "./ClickUpUserLink";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
  };
  due_date: string | null;
  date_created: string;
  tags: Array<{
    name: string;
    tag_fg: string;
    tag_bg: string;
  }>;
  assignees: Array<{
    username: string;
    email: string;
  }>;
  url: string;
  description?: string;
}

export default function ClickUpTasksView() {
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedTask, setSelectedTask] = useState<ClickUpTask | null>(null);
  const [commentText, setCommentText] = useState("");
  const [debugInfo, setDebugInfo] = useState<any | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { userData } = useCurrentUser();
  const [userLinked, setUserLinked] = useState(false);

  useEffect(() => {
    checkUserMapping();
  }, [userData?.email]);

  useEffect(() => {
    if (userLinked) {
      loadTasks();

      // Sincronização automática a cada 5 minutos
      const interval = setInterval(loadTasks, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [userLinked]);

  const checkUserMapping = async () => {
    if (!userData?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clickup_user_mappings')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking mapping:', error);
      }

      setUserLinked(!!data);
    } catch (error) {
      console.error('Error checking mapping:', error);
    } finally {
      // Garante que a tela não fique carregando indefinidamente
      setLoading(false);
    }
  };

  const loadTasks = async (retryAttempt: number = 0) => {
    if (!userLinked) return;

    try {
      setSyncing(true);
      setLastError(null);
      if (retryAttempt > 0) {
        setDebugInfo({ ...debugInfo, retryStatus: `Tentando novamente (${retryAttempt}/2)...` });
      }
      
      // Buscar mapeamento do usuário
      const { data: userAuth } = await supabase.auth.getUser();
      const { data: mapping } = await supabase
        .from('clickup_user_mappings')
        .select('*')
        .eq('user_id', userAuth.user?.id)
        .maybeSingle();

      if (!mapping) {
        setLastError('Usuário não vinculado ao ClickUp');
        setTasks([]);
        return;
      }

      console.log('ClickUp: Loading tasks for mapped user', mapping.clickup_email);

      // Timeout de 15s com AbortController conforme PRD
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Hard stop de 30s máximo conforme PRD
      const hardStopId = setTimeout(() => {
        setSyncing(false);
        setLoading(false);
        setLastError('❌ Falha ao carregar tarefas');
        toast.error('Tempo limite excedido');
      }, 30000);

      try {
        const invokePromise = supabase.functions.invoke('clickup-integration', {
          body: { 
            action: 'getTasks', 
            teamId: mapping.clickup_team_id,
            userId: mapping.clickup_user_id
          }
        });

        const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: { error: 'client_timeout' }, error: { name: 'TimeoutError', message: 'Timeout 15s' } }), 15000)
        );

        const { data, error } = await Promise.race<any>([invokePromise, timeoutPromise]);

        clearTimeout(timeoutId);
        clearTimeout(hardStopId);

        if (error) {
          console.error('ClickUp: Edge function error:', error);
          
          // Tratar timeout específico
          if (error.name === 'AbortError') {
            setLastError('❌ Tempo esgotado (15s). Tente novamente.');
            toast.error('Timeout na requisição');
            return;
          }
          
          // Retry automático para erros temporários (429/503) conforme PRD
          if ((error.status === 429 || error.status === 503) && retryAttempt < 2) {
            const delay = retryAttempt === 0 ? 1000 : 2000;
            setTimeout(() => {
              setRetryCount(retryAttempt + 1);
              loadTasks(retryAttempt + 1);
            }, delay);
            return;
          }
          
          // Mensagens de erro específicas conforme PRD
          let errorMessage = 'Erro na comunicação com ClickUp';
          if (error.message?.includes('CORS') || error.status === 403) {
            errorMessage = '❌ Domínio não autorizado (CORS)';
          } else if (error.status === 500) {
            errorMessage = '❌ Erro na Edge Function ou token ausente';
          } else if (error.message?.includes('timeout')) {
            errorMessage = '❌ Tempo esgotado (15s)';
          }
          
          setLastError(errorMessage);
          setDebugInfo({ 
            error: error.message, 
            status: error.status,
            timestamp: new Date().toISOString(),
            retryAttempt 
          });
          toast.error(errorMessage);
          return;
        }

        console.log('ClickUp: Response data:', data);
        
        // Verificar se há erro no payload da edge function
        if (data?.error) {
          let errorMessage = 'Erro do servidor ClickUp';
          
          switch (data.error) {
            case 'origin_not_allowed':
              errorMessage = '❌ Domínio não autorizado (CORS)';
              break;
            case 'missing_clickup_token':
              errorMessage = '❌ Erro na Edge Function ou token ausente';
              break;
            case 'upstream_timeout':
              errorMessage = '❌ Tempo esgotado (15s)';
              break;
            case 'edge_exception':
              errorMessage = '❌ Erro interno do servidor';
              break;
            default:
              errorMessage = `❌ ${data.detail || data.error}`;
          }
          
          setLastError(errorMessage);
          setDebugInfo({ 
            error: data.error, 
            detail: data.detail,
            timestamp: new Date().toISOString() 
          });
          toast.error(errorMessage);
          return;
        }
        
        if (data?.tasks && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          setDebugInfo({ 
            tasksCount: data.tasks.length, 
            teamId: data.teamId,
            userId: data.userId,
            duration: data.duration,
            timestamp: new Date().toISOString(),
            retryAttempt 
          });
          setRetryCount(0); // Reset retry count on success
          toast.success(`✅ Tarefas sincronizadas com sucesso (${data.tasks.length})`);
          
          if (data.tasks.length === 0) {
            setLastError('❌ Nenhuma tarefa encontrada');
            toast.info("Nenhuma tarefa encontrada para este usuário");
          }
        } else {
          setTasks([]);
          setLastError('Resposta inválida do servidor');
          setDebugInfo({ message: 'Invalid response format', data });
          console.warn('ClickUp: Invalid response:', data);
        }
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        clearTimeout(hardStopId);
        
        if (fetchError.name === 'AbortError') {
          setLastError('❌ Tempo esgotado (15s). Tente novamente.');
          toast.error('Timeout na requisição');
        } else {
          throw fetchError;
        }
      }
      
    } catch (error: any) {
      console.error('ClickUp: Error loading tasks:', error);
      setLastError(`❌ Erro inesperado: ${error.message || 'Falha na comunicação'}`);
      setDebugInfo({ 
        error: error.message, 
        stack: error.stack, 
        timestamp: new Date().toISOString() 
      });
      toast.error("❌ Erro ao conectar com ClickUp");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const syncTasks = async () => {
    await loadTasks();
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'updateTask',
          taskId,
          updates: { status: newStatus }
        }
      });

      if (error) throw error;

      await loadTasks();
      toast.success('Status atualizado no ClickUp');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status da tarefa');
    }
  };

  const updateDueDate = async (taskId: string, dueDate: string) => {
    try {
      const timestamp = new Date(dueDate).getTime();
      
      const { error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'updateTask',
          taskId,
          updates: { due_date: timestamp }
        }
      });

      if (error) throw error;

      await loadTasks();
      toast.success('Data de vencimento atualizada no ClickUp');
    } catch (error: any) {
      console.error('Erro ao atualizar data:', error);
      toast.error('Erro ao atualizar data de vencimento');
    }
  };

  const addComment = async (taskId: string) => {
    if (!commentText.trim()) return;

    try {
      const { error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'addComment',
          taskId,
          comment: commentText
        }
      });

      if (error) throw error;

      setCommentText("");
      setSelectedTask(null);
      toast.success('Comentário adicionado no ClickUp');
    } catch (error: any) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    }
  };

  const getTaskPriorityColor = (task: ClickUpTask) => {
    if (!task.due_date) return "bg-gray-100 text-gray-800";
    
    const dueDate = new Date(parseInt(task.due_date));
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    
    if (isToday(dueDate) || dueDate <= addDays(new Date(), 1)) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getTaskIcon = (task: ClickUpTask) => {
    if (!task.due_date) return <Clock className="h-4 w-4" />;
    
    const dueDate = new Date(parseInt(task.due_date));
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    
    return <Calendar className="h-4 w-4" />;
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status.status === statusFilter;
    
    let matchesPriority = true;
    if (priorityFilter !== "all") {
      if (priorityFilter === "overdue" && task.due_date) {
        const dueDate = new Date(parseInt(task.due_date));
        matchesPriority = isPast(dueDate) && !isToday(dueDate);
      } else if (priorityFilter === "today" && task.due_date) {
        const dueDate = new Date(parseInt(task.due_date));
        matchesPriority = isToday(dueDate);
      } else if (priorityFilter === "upcoming" && task.due_date) {
        const dueDate = new Date(parseInt(task.due_date));
        matchesPriority = dueDate > addDays(new Date(), 1);
      }
    }
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const renderTaskCard = (task: ClickUpTask) => (
    <Card key={task.id} className={`hover:shadow-md transition-shadow ${getTaskPriorityColor(task)} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getTaskIcon(task)}
              <h3 className="font-medium text-sm">{task.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(task.url, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map((tag, idx) => (
                <Badge 
                  key={idx}
                  className="text-xs px-1 py-0"
                  style={{ 
                    backgroundColor: tag.tag_bg, 
                    color: tag.tag_fg 
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span 
                className="px-2 py-1 rounded text-white text-xs"
                style={{ backgroundColor: task.status.color }}
              >
                {task.status.status}
              </span>
              
              {task.due_date && (
                <span>
                  Vence: {format(new Date(parseInt(task.due_date)), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={(value) => updateTaskStatus(task.id, value)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="to do">A Fazer</SelectItem>
              <SelectItem value="in progress">Em Progresso</SelectItem>
              <SelectItem value="review">Revisão</SelectItem>
              <SelectItem value="complete">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="w-36 h-8"
            onChange={(e) => updateDueDate(task.id, e.target.value)}
            defaultValue={task.due_date ? format(new Date(parseInt(task.due_date)), 'yyyy-MM-dd') : ''}
          />

          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedTask(task)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Comentar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Comentário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tarefa: {task.name}</Label>
                </div>
                <div>
                  <Label htmlFor="comment">Comentário</Label>
                  <Textarea
                    id="comment"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Digite seu comentário..."
                  />
                </div>
                <Button onClick={() => addComment(task.id)}>
                  Adicionar Comentário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando tarefas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarefas (ClickUp)</h1>
          <p className="text-muted-foreground">
            Gerencie suas tarefas do ClickUp diretamente no Lovable
          </p>
        </div>
        
        <Button onClick={syncTasks} disabled={syncing} aria-label="Sincronizar tarefas do ClickUp agora">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      <ClickUpUserLink onLinked={() => setUserLinked(true)} />

      {userLinked && (
        <>
          <ClickUpDebugPanel 
            debugInfo={debugInfo}
            lastError={lastError}
            onRefresh={syncTasks}
            refreshing={syncing}
          />

          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="to do">A Fazer</SelectItem>
                <SelectItem value="in progress">Em Progresso</SelectItem>
                <SelectItem value="review">Revisão</SelectItem>
                <SelectItem value="complete">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="upcoming">Futuras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma tarefa encontrada</h3>
                  <p className="text-muted-foreground">
                    {tasks.length === 0 
                      ? 'Conecte-se ao ClickUp ou verifique se há tarefas atribuídas a você.'
                      : 'Tente ajustar os filtros para encontrar suas tarefas.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredTasks.map(renderTaskCard)}
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            {filteredTasks.length} de {tasks.length} tarefas • 
            Última sincronização: {format(new Date(), 'HH:mm', { locale: ptBR })}
          </div>
        </>
      )}
    </div>
  );
}
