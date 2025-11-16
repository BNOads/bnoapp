import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TarefaCard } from "./TarefaCard";
import { NovaTarefaModal } from "./NovaTarefaModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday, isTomorrow, isThisWeek, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
  };
  due_date?: string;
  description?: string;
  date_created?: string;
}

interface TaskGroup {
  label: string;
  tasks: ClickUpTask[];
}

export function MinhasTarefasView() {
  const [tarefas, setTarefas] = useState<ClickUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtro, setFiltro] = useState<"ativas" | "todas">("ativas");
  const { toast } = useToast();

  const carregarTarefas = async (showRefreshToast = false) => {
    try {
      const isRefresh = showRefreshToast;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase.functions.invoke("clickup-integration", {
        body: { action: "getTasks" },
      });

      if (error) throw error;

      if (data?.success && data?.tasks) {
        setTarefas(data.tasks);
        if (isRefresh) {
          toast({
            title: "Tarefas atualizadas",
            description: `${data.tasks.length} tarefa(s) carregada(s)`,
          });
        }
      } else {
        throw new Error(data?.error || "Erro ao carregar tarefas");
      }
    } catch (error: any) {
      console.error("Erro ao carregar tarefas:", error);
      toast({
        title: "Erro ao carregar tarefas",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarTarefas();
  }, []);

  const handleTarefaConcluida = async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("clickup-integration", {
        body: {
          action: "updateTask",
          taskId,
          updates: {
            status: "complete"
          }
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Tarefa concluída!",
          description: "A tarefa foi marcada como concluída no ClickUp",
        });
        await carregarTarefas();
      } else {
        throw new Error(data?.error || "Erro ao concluir tarefa");
      }
    } catch (error: any) {
      console.error("Erro ao concluir tarefa:", error);
      toast({
        title: "Erro ao concluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const agruparTarefasPorData = (tasks: ClickUpTask[]): TaskGroup[] => {
    const hoje: ClickUpTask[] = [];
    const amanha: ClickUpTask[] = [];
    const estaSemana: ClickUpTask[] = [];
    const proximas: ClickUpTask[] = [];
    const semData: ClickUpTask[] = [];

    tasks.forEach((task) => {
      if (!task.due_date) {
        semData.push(task);
        return;
      }

      const dueDate = parseISO(task.due_date);

      if (isToday(dueDate)) {
        hoje.push(task);
      } else if (isTomorrow(dueDate)) {
        amanha.push(task);
      } else if (isThisWeek(dueDate)) {
        estaSemana.push(task);
      } else if (isFuture(dueDate)) {
        proximas.push(task);
      } else {
        semData.push(task);
      }
    });

    const grupos: TaskGroup[] = [];
    
    if (hoje.length > 0) grupos.push({ label: "Hoje", tasks: hoje });
    if (amanha.length > 0) grupos.push({ label: "Amanhã", tasks: amanha });
    if (estaSemana.length > 0) grupos.push({ label: "Esta Semana", tasks: estaSemana });
    if (proximas.length > 0) grupos.push({ label: "Próximas", tasks: proximas });
    if (semData.length > 0) grupos.push({ label: "Sem Data", tasks: semData });

    return grupos;
  };

  const tarefasFiltradas = filtro === "ativas" 
    ? tarefas.filter(t => t.status.status.toLowerCase() !== "complete" && t.status.status.toLowerCase() !== "closed")
    : tarefas;

  const gruposTarefas = agruparTarefasPorData(tarefasFiltradas);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Minhas Tarefas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas tarefas do ClickUp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarTarefas(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Atualizar</span>
          </Button>
          
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as "ativas" | "todas")}>
        <TabsList>
          <TabsTrigger value="ativas">Ativas ({tarefasFiltradas.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({tarefas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filtro} className="mt-6">
          {gruposTarefas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  {filtro === "ativas" 
                    ? "Nenhuma tarefa ativa. Você está em dia! 🎉"
                    : "Nenhuma tarefa encontrada."
                  }
                </p>
                <Button onClick={() => setModalOpen(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira tarefa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {gruposTarefas.map((grupo) => (
                <div key={grupo.label} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {grupo.label}
                  </h3>
                  <div className="space-y-3">
                    {grupo.tasks.map((tarefa) => (
                      <TarefaCard
                        key={tarefa.id}
                        tarefa={tarefa}
                        onConcluir={handleTarefaConcluida}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NovaTarefaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTarefaCriada={() => carregarTarefas()}
      />
    </div>
  );
}
