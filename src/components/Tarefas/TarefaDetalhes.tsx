import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, Trash2, Send } from "lucide-react";
import type { Tarefa, Subtarefa, ComentarioTarefa } from "@/types/tarefas";

interface TarefaDetalhesProps {
  tarefa: Tarefa;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const TarefaDetalhes = ({ tarefa, open, onOpenChange, onUpdate }: TarefaDetalhesProps) => {
  const { user } = useAuth();
  const [subtarefas, setSubtarefas] = useState<Subtarefa[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioTarefa[]>([]);
  const [novaSubtarefa, setNovaSubtarefa] = useState("");
  const [novoComentario, setNovoComentario] = useState("");

  useEffect(() => {
    if (open) {
      loadSubtarefas();
      loadComentarios();
    }
  }, [open, tarefa]);

  const loadSubtarefas = async () => {
    const { data } = await supabase
      .from("subtarefas" as any)
      .select("*")
      .eq("tarefa_id", tarefa.id)
      .order("ordem");
    if (data) setSubtarefas(data as unknown as Subtarefa[]);
  };

  const loadComentarios = async () => {
    const { data } = await supabase
      .from("comentarios_tarefas" as any)
      .select(`
        *,
        autor:colaboradores!comentarios_tarefas_autor_id_fkey(nome, avatar_url)
      `)
      .eq("tarefa_id", tarefa.id)
      .order("created_at", { ascending: false });
    if (data) setComentarios(data as unknown as ComentarioTarefa[]);
  };

  const adicionarSubtarefa = async () => {
    if (!novaSubtarefa.trim()) return;

    const { error } = await supabase.from("subtarefas" as any).insert({
      tarefa_id: tarefa.id,
      titulo: novaSubtarefa,
      ordem: subtarefas.length,
    });

    if (!error) {
      setNovaSubtarefa("");
      loadSubtarefas();
      toast.success("Subtarefa adicionada");
    }
  };

  const toggleSubtarefa = async (id: string, concluida: boolean) => {
    await supabase
      .from("subtarefas" as any)
      .update({ concluida: !concluida })
      .eq("id", id);
    loadSubtarefas();
  };

  const deletarSubtarefa = async (id: string) => {
    await supabase.from("subtarefas" as any).delete().eq("id", id);
    loadSubtarefas();
  };

  const adicionarComentario = async () => {
    if (!novoComentario.trim()) return;

    const { error } = await supabase.from("comentarios_tarefas" as any).insert({
      tarefa_id: tarefa.id,
      autor_id: user?.id,
      conteudo: novoComentario,
    });

    if (!error) {
      setNovoComentario("");
      loadComentarios();
      toast.success("Comentário adicionado");
    }
  };

  const getPrioridadeNome = (prioridade: string) => {
    switch (prioridade) {
      case "copa_mundo": return "🔴 Copa do Mundo";
      case "libertadores": return "🟠 Libertadores";
      case "brasileirao": return "🔵 Brasileirão";
      default: return prioridade;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarefa.titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações principais */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Badge>{getPrioridadeNome(tarefa.prioridade)}</Badge>
              <Badge variant="outline">{tarefa.status}</Badge>
              {tarefa.cliente && <Badge variant="secondary">📁 {tarefa.cliente.nome}</Badge>}
              {tarefa.eh_tarefa_bnoapp && <Badge>BNOapp</Badge>}
            </div>
            
            {tarefa.descricao && (
              <p className="text-sm text-muted-foreground">{tarefa.descricao}</p>
            )}

            <div className="flex gap-4 text-sm">
              {tarefa.responsavel && (
                <span>👤 {tarefa.responsavel.nome}</span>
              )}
              <span>📅 {format(new Date(tarefa.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          <Separator />

          {/* Subtarefas */}
          <div className="space-y-3">
            <h3 className="font-semibold">✓ Subtarefas</h3>
            <div className="space-y-2">
              {subtarefas.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={sub.concluida}
                    onCheckedChange={() => toggleSubtarefa(sub.id, sub.concluida)}
                  />
                  <span className={sub.concluida ? "line-through text-muted-foreground" : ""}>
                    {sub.titulo}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => deletarSubtarefa(sub.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nova subtarefa..."
                value={novaSubtarefa}
                onChange={(e) => setNovaSubtarefa(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && adicionarSubtarefa()}
              />
              <Button onClick={adicionarSubtarefa} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Comentários */}
          <div className="space-y-3">
            <h3 className="font-semibold">💬 Comentários</h3>
            <div className="space-y-3">
              {comentarios.map((com) => (
                <div key={com.id} className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{com.autor?.nome || "Usuário"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(com.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm">{com.conteudo}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar comentário..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                rows={2}
              />
              <Button onClick={adicionarComentario} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
