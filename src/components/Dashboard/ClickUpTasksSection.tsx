import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Calendar,
  ExternalLink,
  Clock,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

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
  url: string;
}

export default function ClickUpTasksSection() {
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('clickup-integration', {
        body: { action: 'getTasks' }
      });

      if (error) throw error;

      // Ordenar por vencimento mais próximo e depois por criação
      const sortedTasks = (data.tasks || []).sort((a: ClickUpTask, b: ClickUpTask) => {
        // Tarefas vencidas primeiro
        if (a.due_date && b.due_date) {
          const dateA = new Date(parseInt(a.due_date));
          const dateB = new Date(parseInt(b.due_date));
          
          const aOverdue = isPast(dateA) && !isToday(dateA);
          const bOverdue = isPast(dateB) && !isToday(dateB);
          
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          
          return dateA.getTime() - dateB.getTime();
        }
        
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        
        // Por data de criação se não há due_date
        return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
      });

      // Pegar apenas as 5 primeiras
      setTasks(sortedTasks.slice(0, 5));
    } catch (error: any) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskPriorityInfo = (task: ClickUpTask) => {
    if (!task.due_date) {
      return {
        color: "bg-gray-100 text-gray-800",
        icon: <Clock className="h-3 w-3" />,
        priority: "Sem prazo"
      };
    }
    
    const dueDate = new Date(parseInt(task.due_date));
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return {
        color: "bg-red-100 text-red-800",
        icon: <AlertTriangle className="h-3 w-3" />,
        priority: "Atrasada"
      };
    }
    
    if (isToday(dueDate) || dueDate <= addDays(new Date(), 1)) {
      return {
        color: "bg-yellow-100 text-yellow-800",
        icon: <Calendar className="h-3 w-3" />,
        priority: "Urgente"
      };
    }
    
    return {
      color: "bg-green-100 text-green-800",
      icon: <Calendar className="h-3 w-3" />,
      priority: "No prazo"
    };
  };

  const markAsComplete = async (taskId: string) => {
    try {
      const { error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'updateTask',
          taskId,
          updates: { status: 'complete' }
        }
      });

      if (error) throw error;

      // Remover da lista local
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error: any) {
      console.error('Erro ao marcar como concluída:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Minhas Tarefas (ClickUp)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Carregando tarefas...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Minhas Tarefas (ClickUp)
          </CardTitle>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/ferramentas')}
            className="flex items-center gap-1"
          >
            Ver todas
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma tarefa pendente</h3>
            <p className="text-muted-foreground text-sm">
              Suas tarefas do ClickUp aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const priorityInfo = getTaskPriorityInfo(task);
              
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => markAsComplete(task.id)}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{task.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => window.open(task.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs px-2 py-0 ${priorityInfo.color}`}>
                        {priorityInfo.icon}
                        <span className="ml-1">{priorityInfo.priority}</span>
                      </Badge>
                      
                      <span 
                        className="text-xs px-2 py-0 rounded text-white"
                        style={{ backgroundColor: task.status.color }}
                      >
                        {task.status.status}
                      </span>
                      
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(parseInt(task.due_date)), 'dd/MM', { locale: ptBR })}
                        </span>
                      )}
                      
                      {task.tags.slice(0, 2).map((tag, idx) => (
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
                      
                      {task.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{task.tags.length - 2}
                        </span>
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
}