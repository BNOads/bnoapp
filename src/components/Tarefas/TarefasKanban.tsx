import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TarefasKanbanProps {
  tipo: "ativas" | "concluidas";
  filtros: any;
}

export const TarefasKanban = ({ tipo, filtros }: TarefasKanbanProps) => {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTarefas();
  }, [tipo, filtros]);

  const loadTarefas = async () => {
    setLoading(true);
    let query = supabase
      .from("tarefas")
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

    // Aplicar filtros...
    const { data } = await query;
    if (data) setTarefas(data);
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

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case "copa_mundo": return "🔴";
      case "libertadores": return "🟠";
      case "brasileirao": return "🔵";
      default: return "";
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {colunas.map((coluna) => (
        <div key={coluna.id} className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">{coluna.titulo}</h3>
            <Badge variant="secondary">{getTarefasPorStatus(coluna.status).length}</Badge>
          </div>
          <div className="space-y-2">
            {getTarefasPorStatus(coluna.status).map((tarefa) => (
              <Card key={tarefa.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
