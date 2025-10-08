import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NovaTarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NovaTarefaModal = ({ open, onOpenChange }: NovaTarefaModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    cliente_id: "",
    responsavel_id: "",
    data_vencimento: new Date(),
    prioridade: "brasileirao",
    recorrencia: "nenhuma",
    eh_tarefa_bnoapp: false,
  });

  useEffect(() => {
    if (open) {
      loadColaboradores();
      loadClientes();
    }
  }, [open]);

  const loadColaboradores = async () => {
    const { data } = await supabase
      .from("colaboradores")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    if (data) setColaboradores(data);
  };

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    if (data) setClientes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tarefaData: any = {
      titulo: formData.titulo,
      descricao: formData.descricao,
      responsavel_id: formData.responsavel_id,
      data_vencimento: formData.data_vencimento.toISOString().split('T')[0],
      prioridade: formData.prioridade,
      recorrencia: formData.recorrencia,
      eh_tarefa_bnoapp: formData.eh_tarefa_bnoapp,
      status: "pendente",
    };

    if (!formData.eh_tarefa_bnoapp && formData.cliente_id) {
      tarefaData.cliente_id = formData.cliente_id;
    }

    const { error } = await supabase.from("tarefas" as any).insert(tarefaData);

    if (error) {
      toast.error("Erro ao criar tarefa");
      console.error(error);
    } else {
      toast.success("Tarefa criada com sucesso!");
      onOpenChange(false);
      setFormData({
        titulo: "",
        descricao: "",
        cliente_id: "",
        responsavel_id: "",
        data_vencimento: new Date(),
        prioridade: "brasileirao",
        recorrencia: "nenhuma",
        eh_tarefa_bnoapp: false,
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✨ Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Nome da tarefa"
              required
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes da tarefa"
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.eh_tarefa_bnoapp}
              onCheckedChange={(checked) => setFormData({ ...formData, eh_tarefa_bnoapp: checked })}
            />
            <Label>Tarefa do BNOapp (não relacionada a cliente)</Label>
          </div>

          {!formData.eh_tarefa_bnoapp && (
            <div>
              <Label>Cliente</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cli) => (
                    <SelectItem key={cli.id} value={cli.id}>{cli.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Responsável *</Label>
            <Select
              value={formData.responsavel_id}
              onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data de Vencimento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.data_vencimento, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.data_vencimento}
                  onSelect={(date) => date && setFormData({ ...formData, data_vencimento: date })}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select
              value={formData.prioridade}
              onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="copa_mundo">🔴 Copa do Mundo</SelectItem>
                <SelectItem value="libertadores">🟠 Libertadores</SelectItem>
                <SelectItem value="brasileirao">🔵 Brasileirão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Recorrência</Label>
            <Select
              value={formData.recorrencia}
              onValueChange={(value) => setFormData({ ...formData, recorrencia: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem recorrência</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
