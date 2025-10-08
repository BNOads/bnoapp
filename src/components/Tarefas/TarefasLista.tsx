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
import { CalendarIcon, Check } from "lucide-react";
import { TarefaDetalhes } from "./TarefaDetalhes";
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
  const [colaboradores, setColaboradores] = useState<any[]>([]);

  useEffect(() => {
    loadTarefas();
    loadColaboradores();
  }, [tipo, filtros]);

  const loadColaboradores = async () => {
    const { data } = await supabase
      .from("colaboradores" as any)
      .select("id, nome, avatar_url")
      .eq("ativo", true)
      .order("nome");
    
    if (data) setColaboradores(data);
  };

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

      if (error) {
        console.error("Erro ao atualizar data:", error);
        return;
      }

      await loadTarefas();
    } catch (error) {
      console.error("Erro ao atualizar data:", error);
    }
  };

  const atualizarPrioridade = async (tarefaId: string, novaPrioridade: string) => {
    try {
      const { error } = await supabase
        .from("tarefas" as any)
        .update({ prioridade: novaPrioridade })
        .eq("id", tarefaId);

      if (error) {
        console.error("Erro ao atualizar prioridade:", error);
        return;
      }

      await loadTarefas();
    } catch (error) {
      console.error("Erro ao atualizar prioridade:", error);
    }
  };

  const atualizarResponsavel = async (tarefaId: string, novoResponsavelId: string | null) => {
    try {
      const { error } = await supabase
        .from("tarefas" as any)
        .update({ responsavel_id: novoResponsavelId })
        .eq("id", tarefaId);

      if (error) {
        console.error("Erro ao atualizar responsável:", error);
        return;
      }

      await loadTarefas();
    } catch (error) {
      console.error("Erro ao atualizar responsável:", error);
    }
  };

  const getPrioridadeConfig = (prioridade: string) => {
    switch (prioridade) {
      case "copa_mundo":
        return { 
          label: "copa do mundo", 
          className: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200" 
        };
      case "libertadores":
        return { 
          label: "libertadores", 
          className: "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200" 
        };
      case "brasileirao":
        return { 
          label: "brasileirão", 
          className: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200" 
        };
      default:
        return { 
          label: "sem prioridade", 
          className: "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200" 
        };
    }
  };

  const handlePrioridadeClick = async (tarefaId: string, prioridadeAtual: string) => {
    // Ciclar entre as prioridades: copa_mundo -> libertadores -> brasileirao -> copa_mundo
    const proximaPrioridade = 
      prioridadeAtual === "copa_mundo" ? "libertadores" :
      prioridadeAtual === "libertadores" ? "brasileirao" : "copa_mundo";
    
    await atualizarPrioridade(tarefaId, proximaPrioridade);
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
              <div className="col-span-3">Nome</div>
              <div className="col-span-2">Prioridade ↓↑</div>
              <div className="col-span-2">Data de vencimento ↓↑</div>
              <div className="col-span-2">Responsável</div>
              <div className="col-span-2"></div>
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
                        className="col-span-3 cursor-pointer"
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
                        <Badge
                          variant="outline"
                          className={cn(
                            "cursor-pointer px-3 py-1 rounded-md",
                            prioridadeConfig.className
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrioridadeClick(tarefa.id, tarefa.prioridade);
                          }}
                        >
                          {prioridadeConfig.label}
                        </Badge>
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
                      <div className="col-span-2">
                        <Select
                          value={tarefa.responsavel_id || "sem_responsavel"}
                          onValueChange={(value) => 
                            atualizarResponsavel(tarefa.id, value === "sem_responsavel" ? null : value)
                          }
                        >
                          <SelectTrigger 
                            className="h-9 border-0 hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue>
                              {tarefa.responsavel ? (
                                <div className="flex items-center gap-2">
                                  {tarefa.responsavel.avatar_url ? (
                                    <img 
                                      src={tarefa.responsavel.avatar_url} 
                                      alt={tarefa.responsavel.nome}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                      {tarefa.responsavel.nome.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-sm">{tarefa.responsavel.nome}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Sem responsável</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem_responsavel">Sem responsável</SelectItem>
                            {colaboradores.map((colab) => (
                              <SelectItem key={colab.id} value={colab.id}>
                                <div className="flex items-center gap-2">
                                  {colab.avatar_url ? (
                                    <img 
                                      src={colab.avatar_url} 
                                      alt={colab.nome}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                      {colab.nome.charAt(0)}
                                    </div>
                                  )}
                                  <span>{colab.nome}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Botão Concluir */}
                      <div className="col-span-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={tarefa.status === "concluida" ? "secondary" : "default"}
                          onClick={(e) => {
                            e.stopPropagation();
                            concluirTarefa(tarefa.id);
                          }}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          {tarefa.status === "concluida" ? "Concluída" : "Concluir"}
                        </Button>
                      </div>
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
