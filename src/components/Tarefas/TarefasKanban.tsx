import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/hooks/use-toast";
import type { Tarefa } from "@/types/tarefas";

interface TarefasKanbanProps {
  tipo: "ativas" | "concluidas";
  filtros: any;
}

const TarefaCard = ({ tarefa }: { tarefa: Tarefa }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: tarefa.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case "copa_mundo": return "🔴";
      case "libertadores": return "🟠";
      case "brasileirao": return "🔵";
      default: return "";
    }
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span>{getPrioridadeIcon(tarefa.prioridade)}</span>
          <h4 className="font-medium text-sm line-clamp-2">{tarefa.titulo}</h4>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          {tarefa.cliente && <div>📁 {tarefa.cliente.nome}</div>}
          {tarefa.responsavel && <div>👤 {tarefa.responsavel.nome}</div>}
          <div>📅 {format(new Date(tarefa.data_vencimento), "dd/MM", { locale: ptBR })}</div>
        </div>
      </div>
    </Card>
  );
};

export const TarefasKanban = ({ tipo, filtros }: TarefasKanbanProps) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<Tarefa | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadTarefas();
  }, [tipo, filtros]);

  const loadTarefas = async () => {
    setLoading(true);
    let query = supabase
      .from("tarefas" as any)
      .select(`
        *,
        cliente:clientes(nome),
        responsavel:colaboradores!responsavel_id(nome, avatar_url)
      `)
      .order("data_vencimento", { ascending: true });

    if (tipo === "ativas") {
      query = query.in("status", ["pendente", "em_andamento", "adiada"]);
    } else {
      query = query.eq("status", "concluida");
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao carregar tarefas:", error);
    } else if (data) {
      setTarefas(data as unknown as Tarefa[]);
    }
    setLoading(false);
  };

  const colunas = [
    { id: "pendente", titulo: "📝 Pendente", status: "pendente" },
    { id: "em_andamento", titulo: "🔄 Em Andamento", status: "em_andamento" },
    { id: "adiada", titulo: "⏸️ Adiada", status: "adiada" },
    { id: "concluida", titulo: "✅ Concluída", status: "concluida" },
  ];

  const getTarefasPorStatus = (status: string) => {
    return tarefas.filter(t => t.status === status);
  };

  const handleDragStart = (event: any) => {
    const tarefa = tarefas.find(t => t.id === event.active.id);
    setActiveCard(tarefa || null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const tarefaId = active.id;
    const novoStatus = over.id;

    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa || tarefa.status === novoStatus) return;

    try {
      const { error } = await supabase
        .from("tarefas" as any)
        .update({ status: novoStatus })
        .eq("id", tarefaId);

      if (error) throw error;

      await loadTarefas();

      toast({
        title: "Status atualizado",
        description: `Tarefa movida para ${colunas.find(c => c.status === novoStatus)?.titulo}`,
      });
    } catch (error) {
      console.error("Erro ao mover tarefa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível mover a tarefa",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {colunas.map((coluna) => (
          <div key={coluna.id} className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <h3 className="font-semibold">{coluna.titulo}</h3>
              <Badge variant="secondary">{getTarefasPorStatus(coluna.status).length}</Badge>
            </div>
            <SortableContext
              id={coluna.status}
              items={getTarefasPorStatus(coluna.status).map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 min-h-[200px]">
                {getTarefasPorStatus(coluna.status).map((tarefa) => (
                  <TarefaCard key={tarefa.id} tarefa={tarefa} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeCard ? <TarefaCard tarefa={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
};
