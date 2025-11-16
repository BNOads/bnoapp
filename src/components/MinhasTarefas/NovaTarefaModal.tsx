import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface NovaTarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTarefaCriada: () => void;
}

export function NovaTarefaModal({
  open,
  onOpenChange,
  onTarefaCriada,
}: NovaTarefaModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para a tarefa",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const taskData: any = {
        name: titulo,
      };

      if (descricao.trim()) {
        taskData.description = descricao;
      }

      if (dataVencimento) {
        // Converter para timestamp Unix em milissegundos
        const date = new Date(dataVencimento);
        taskData.due_date = date.getTime();
      }

      const { data, error } = await supabase.functions.invoke("clickup-integration", {
        body: {
          action: "createTask",
          taskData,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Tarefa criada!",
          description: "Sua tarefa foi criada com sucesso no ClickUp",
        });
        
        setTitulo("");
        setDescricao("");
        setDataVencimento("");
        onOpenChange(false);
        onTarefaCriada();
      } else {
        throw new Error(data?.error || "Erro ao criar tarefa");
      }
    } catch (error: any) {
      console.error("Erro ao criar tarefa:", error);
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa no ClickUp
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Revisar relatório mensal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Adicione detalhes sobre a tarefa..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataVencimento">Data de Vencimento</Label>
            <Input
              id="dataVencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Tarefa"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
