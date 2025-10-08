import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TarefaDetalhes } from "./TarefaDetalhes";
import type { Tarefa } from "@/types/tarefas";

interface TarefasListaProps {
  tipo: "ativas" | "concluidas";
  filtros: any;
}

export const TarefasLista = ({ tipo, filtros }: TarefasListaProps) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);

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
        responsavel:colaboradores!responsavel_id(nome, avatar_url),
        subtarefas(id, concluida)
      `)
      .order("data_vencimento", { ascending: true });

    if (tipo === "ativas") {
      query = query.in("status", ["pendente", "em_andamento", "adiada"]);
    } else {
      query = query.eq("status", "concluida");
    }

    if (filtros.responsavel && filtros.responsavel !== "todos") {
      query = query.eq("responsavel_id", filtros.responsavel);
    }

    if (filtros.cliente) {
      if (filtros.cliente === "bnoapp") {
        query = query.eq("eh_tarefa_bnoapp", true);
      } else if (filtros.cliente !== "todos") {
        query = query.eq("cliente_id", filtros.cliente);
      }
    }

    if (filtros.prioridade && filtros.prioridade !== "todos") {
      query = query.eq("prioridade", filtros.prioridade);
    }

    if (filtros.status && filtros.status !== "todos") {
      query = query.eq("status", filtros.status);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("Erro ao carregar tarefas:", error);
    } else if (data) {
      setTarefas(data as unknown as Tarefa[]);
    }
    setLoading(false);
  };

  const agruparPorData = () => {
    const atrasadas = tarefas.filter(t => isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento)));
    const hoje = tarefas.filter(t => isToday(new Date(t.data_vencimento)));
    const amanha = tarefas.filter(t => isTomorrow(new Date(t.data_vencimento)));
    const futuras = tarefas.filter(t => isFuture(new Date(t.data_vencimento)) && !isTomorrow(new Date(t.data_vencimento)));

    return [
      { label: "🔴 Atrasadas", tarefas: atrasadas, cor: "text-red-600" },
      { label: "📅 Hoje", tarefas: hoje, cor: "text-blue-600" },
      { label: "⏭️ Amanhã", tarefas: amanha, cor: "text-yellow-600" },
      { label: "📆 Futuras", tarefas: futuras, cor: "text-gray-600" },
    ].filter(grupo => grupo.tarefas.length > 0);
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case "copa_mundo": return "🔴";
      case "libertadores": return "🟠";
      case "brasileirao": return "🔵";
      default: return "";
    }
  };

  const concluirTarefa = async (tarefaId: string) => {
    await supabase
      .from("tarefas" as any)
      .update({ 
        status: "concluida", 
        concluida_em: new Date().toISOString() 
      })
      .eq("id", tarefaId);
    loadTarefas();
  };

  if (loading) return <div>Carregando tarefas...</div>;

  const grupos = tipo === "ativas" ? agruparPorData() : [{ label: "Concluídas", tarefas, cor: "text-green-600" }];

  return (
    <>
      <div className="space-y-6">
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            <h3 className={`text-lg font-semibold mb-3 ${grupo.cor}`}>
              {grupo.label} ({grupo.tarefas.length})
            </h3>
            <div className="space-y-2">
              {grupo.tarefas.map((tarefa) => (
                <Card 
                  key={tarefa.id} 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setTarefaSelecionada(tarefa)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={tarefa.status === "concluida"}
                      onCheckedChange={() => concluirTarefa(tarefa.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getPrioridadeIcon(tarefa.prioridade)}</span>
                        <h4 className="font-semibold">{tarefa.titulo}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {tarefa.cliente && (
                          <span>📁 {tarefa.cliente.nome}</span>
                        )}
                        {tarefa.eh_tarefa_bnoapp && (
                          <Badge variant="outline">BNOapp</Badge>
                        )}
                        {tarefa.responsavel && (
                          <span>👤 {tarefa.responsavel.nome}</span>
                        )}
                        <span>📅 {format(new Date(tarefa.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                        {tarefa.subtarefas && tarefa.subtarefas.length > 0 && (
                          <span>
                            ✓ {tarefa.subtarefas.filter((s: any) => s.concluida).length}/{tarefa.subtarefas.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <TarefaDetalhes
          tarefa={tarefaSelecionada}
          open={!!tarefaSelecionada}
          onOpenChange={(open) => !open && setTarefaSelecionada(null)}
          onUpdate={loadTarefas}
        />
      )}
    </>
  );
};
