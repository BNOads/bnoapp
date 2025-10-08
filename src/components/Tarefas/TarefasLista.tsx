import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { TarefaDetalhes } from "./TarefaDetalhes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Tarefa } from "@/types/tarefas";

interface TarefasListaProps {
  tipo: "ativas" | "concluidas";
  filtros: any;
}

export const TarefasLista = ({ tipo, filtros }: TarefasListaProps) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);
  const { toast } = useToast();

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

  const atualizarData = async (tarefaId: string, novaData: Date) => {
    try {
      const { error } = await supabase
        .from("tarefas" as any)
        .update({ data_vencimento: novaData.toISOString().split('T')[0] })
        .eq("id", tarefaId);

      if (error) throw error;

      toast({
        title: "Data atualizada",
        description: "Data de vencimento alterada com sucesso",
      });

      loadTarefas();
    } catch (error) {
      console.error("Erro ao atualizar data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a data",
        variant: "destructive",
      });
    }
  };

  const atualizarPrioridade = async (tarefaId: string, novaPrioridade: string) => {
    try {
      const { error } = await supabase
        .from("tarefas" as any)
        .update({ prioridade: novaPrioridade })
        .eq("id", tarefaId);

      if (error) throw error;

      toast({
        title: "Prioridade atualizada",
        description: "Prioridade alterada com sucesso",
      });

      loadTarefas();
    } catch (error) {
      console.error("Erro ao atualizar prioridade:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a prioridade",
        variant: "destructive",
      });
    }
  };

  const getPrioridadeConfig = (prioridade: string) => {
    switch (prioridade) {
      case "copa_mundo":
        return { icon: "🔴", label: "Urgente", color: "text-red-600" };
      case "libertadores":
        return { icon: "🟠", label: "Alta", color: "text-orange-600" };
      case "brasileirao":
        return { icon: "🔵", label: "Normal", color: "text-blue-600" };
      default:
        return { icon: "", label: "Sem prioridade", color: "text-gray-600" };
    }
  };

  if (loading) return <div>Carregando tarefas...</div>;

  const grupos = tipo === "ativas" ? agruparPorData() : [{ label: "Concluídas", tarefas, cor: "text-green-600" }];

  return (
    <>
      <div className="space-y-6">
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${grupo.cor}`}>
              {grupo.label} <span className="text-sm">({grupo.tarefas.length})</span>
            </h3>
            
            {/* Header da tabela */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
              <div className="col-span-1"></div>
              <div className="col-span-4">Nome</div>
              <div className="col-span-2">Prioridade ↓↑</div>
              <div className="col-span-2">Data de vencimento ↓↑</div>
              <div className="col-span-2">Responsável</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-1">
              {grupo.tarefas.map((tarefa) => {
                const prioridadeConfig = getPrioridadeConfig(tarefa.prioridade);
                
                return (
                  <Card 
                    key={tarefa.id} 
                    className="p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="grid grid-cols-12 gap-3 items-center">
                      {/* Checkbox */}
                      <div className="col-span-1">
                        <Checkbox
                          checked={tarefa.status === "concluida"}
                          onCheckedChange={() => concluirTarefa(tarefa.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Nome */}
                      <div 
                        className="col-span-4 cursor-pointer"
                        onClick={() => setTarefaSelecionada(tarefa)}
                      >
                        <h4 className="font-medium">{tarefa.titulo}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {tarefa.cliente && <span>📁 {tarefa.cliente.nome}</span>}
                          {tarefa.eh_tarefa_bnoapp && <Badge variant="outline" className="text-xs">BNOapp</Badge>}
                          {tarefa.subtarefas && tarefa.subtarefas.length > 0 && (
                            <span>
                              ✓ {tarefa.subtarefas.filter((s: any) => s.concluida).length}/{tarefa.subtarefas.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Prioridade */}
                      <div className="col-span-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className={cn("w-full justify-start font-normal", prioridadeConfig.color)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="mr-2">{prioridadeConfig.icon}</span>
                              {prioridadeConfig.label}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-0" align="start">
                            <Select
                              value={tarefa.prioridade}
                              onValueChange={(value) => atualizarPrioridade(tarefa.id, value)}
                            >
                              <SelectTrigger className="border-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="copa_mundo">🔴 Urgente</SelectItem>
                                <SelectItem value="libertadores">🟠 Alta</SelectItem>
                                <SelectItem value="brasileirao">🔵 Normal</SelectItem>
                              </SelectContent>
                            </Select>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Data de vencimento */}
                      <div className="col-span-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-start font-normal"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {isToday(new Date(tarefa.data_vencimento))
                                ? "Hoje"
                                : isTomorrow(new Date(tarefa.data_vencimento))
                                ? "Amanhã"
                                : isPast(new Date(tarefa.data_vencimento)) && !isToday(new Date(tarefa.data_vencimento))
                                ? `${Math.abs(Math.floor((new Date().getTime() - new Date(tarefa.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)))} dias atrás`
                                : format(new Date(tarefa.data_vencimento), "dd/MM", { locale: ptBR })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={new Date(tarefa.data_vencimento)}
                              onSelect={(date) => date && atualizarData(tarefa.id, date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Responsável */}
                      <div className="col-span-2 text-sm text-muted-foreground">
                        {tarefa.responsavel && (
                          <div className="flex items-center gap-2">
                            {tarefa.responsavel.avatar_url ? (
                              <img 
                                src={tarefa.responsavel.avatar_url} 
                                alt={tarefa.responsavel.nome}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                {tarefa.responsavel.nome.charAt(0)}
                              </div>
                            )}
                            <span>{tarefa.responsavel.nome}</span>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="col-span-1"></div>
                    </div>
                  </Card>
                );
              })}
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
