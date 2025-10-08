import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export const MinhasTarefasWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMinhasTarefas();
  }, [user]);

  const loadMinhasTarefas = async () => {
    if (!user) return;

    const { data: colaborador } = await supabase
      .from("colaboradores")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!colaborador) return;

    const { data } = await supabase
      .from("tarefas")
      .select(`
        *,
        cliente:clientes(nome),
        subtarefas(id, concluida)
      `)
      .eq("responsavel_id", colaborador.id)
      .in("status", ["pendente", "em_andamento"])
      .order("data_vencimento", { ascending: true })
      .limit(10);

    if (data) setTarefas(data);
    setLoading(false);
  };

  const concluirTarefa = async (tarefaId: string) => {
    await supabase
      .from("tarefas")
      .update({ status: "concluida", concluida_em: new Date().toISOString() })
      .eq("id", tarefaId);
    loadMinhasTarefas();
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case "copa_mundo": return "🔴";
      case "libertadores": return "🟠";
      case "brasileirao": return "🔵";
      default: return "";
    }
  };

  const getDataLabel = (data: string) => {
    const d = new Date(data);
    if (isPast(d) && !isToday(d)) return { label: "Atrasada", cor: "text-red-600" };
    if (isToday(d)) return { label: "Hoje", cor: "text-blue-600" };
    if (isTomorrow(d)) return { label: "Amanhã", cor: "text-yellow-600" };
    return { label: format(d, "dd/MM", { locale: ptBR }), cor: "text-gray-600" };
  };

  const atrasadas = tarefas.filter(t => isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento)));
  const hoje = tarefas.filter(t => isToday(new Date(t.data_vencimento)));
  const amanha = tarefas.filter(t => isTomorrow(new Date(t.data_vencimento)));
  const futuras = tarefas.filter(t => !isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento)) && !isTomorrow(new Date(t.data_vencimento)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">📋 Minhas Tarefas</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/tarefas")}>
            Ver todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : tarefas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente 🎉</p>
        ) : (
          <div className="space-y-4">
            {atrasadas.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2">🔴 Atrasadas ({atrasadas.length})</h4>
                <div className="space-y-2">
                  {atrasadas.slice(0, 3).map((tarefa) => (
                    <TarefaItem key={tarefa.id} tarefa={tarefa} onConcluir={concluirTarefa} getPrioridadeIcon={getPrioridadeIcon} />
                  ))}
                </div>
              </div>
            )}
            
            {hoje.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-600 mb-2">📅 Hoje ({hoje.length})</h4>
                <div className="space-y-2">
                  {hoje.slice(0, 3).map((tarefa) => (
                    <TarefaItem key={tarefa.id} tarefa={tarefa} onConcluir={concluirTarefa} getPrioridadeIcon={getPrioridadeIcon} />
                  ))}
                </div>
              </div>
            )}

            {amanha.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-600 mb-2">⏭️ Amanhã ({amanha.length})</h4>
                <div className="space-y-2">
                  {amanha.slice(0, 2).map((tarefa) => (
                    <TarefaItem key={tarefa.id} tarefa={tarefa} onConcluir={concluirTarefa} getPrioridadeIcon={getPrioridadeIcon} />
                  ))}
                </div>
              </div>
            )}

            {futuras.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">📆 Futuras ({futuras.length})</h4>
                <div className="space-y-2">
                  {futuras.slice(0, 2).map((tarefa) => (
                    <TarefaItem key={tarefa.id} tarefa={tarefa} onConcluir={concluirTarefa} getPrioridadeIcon={getPrioridadeIcon} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TarefaItem = ({ tarefa, onConcluir, getPrioridadeIcon }: any) => (
  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent transition-colors">
    <Checkbox
      checked={false}
      onCheckedChange={() => onConcluir(tarefa.id)}
    />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <span>{getPrioridadeIcon(tarefa.prioridade)}</span>
        <span className="text-sm font-medium truncate">{tarefa.titulo}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {tarefa.cliente && <span>📁 {tarefa.cliente.nome}</span>}
        {tarefa.subtarefas && tarefa.subtarefas.length > 0 && (
          <span>✓ {tarefa.subtarefas.filter((s: any) => s.concluida).length}/{tarefa.subtarefas.length}</span>
        )}
      </div>
    </div>
  </div>
);
