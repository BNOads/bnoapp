import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface NovoDesafioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NovoDesafioModal = ({ open, onOpenChange, onSuccess }: NovoDesafioModalProps) => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoMedicao, setTipoMedicao] = useState("pontuacao");
  const [criterioVitoria, setCriterioVitoria] = useState("maior_pontuacao");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar o desafio
      const { data: desafio, error } = await supabase
        .from('gamificacao_desafios')
        .insert([{
          titulo,
          descricao,
          tipo_medicao: tipoMedicao as any,
          criterio_vitoria: criterioVitoria as any,
          data_inicio: dataInicio,
          data_fim: dataFim,
          ativo: true,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Criar notificação para todos os colaboradores
      const { error: notifError } = await supabase
        .from('avisos')
        .insert({
          titulo: '🏆 Novo Desafio do Mês Ativo!',
          conteudo: `O desafio "${titulo}" começou! Acesse o painel de Gamificação para participar e subir no ranking. 🚀`,
          tipo: 'info',
          prioridade: 'alta',
          destinatarios: ['all'],
          ativo: true,
          created_by: user.id
        });

      if (notifError) console.error('Erro ao criar notificação:', notifError);

      toast({
        title: "Desafio criado com sucesso!",
        description: "Todos os colaboradores foram notificados.",
      });

      // Resetar form
      setTitulo("");
      setDescricao("");
      setDataInicio("");
      setDataFim("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar desafio:', error);
      toast({
        title: "Erro ao criar desafio",
        description: "Não foi possível criar o desafio.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Desafio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título do Desafio *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Desafio das Ideias Criativas"
              required
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição / Tema</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo do desafio..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataInicio">Data de Início *</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="dataFim">Data de Fim *</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tipoMedicao">Tipo de Medição *</Label>
            <Select value={tipoMedicao} onValueChange={setTipoMedicao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantidade_acoes">Quantidade de Ações</SelectItem>
                <SelectItem value="pontuacao">Pontuação</SelectItem>
                <SelectItem value="check_in_diario">Check-in Diário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="criterioVitoria">Critério de Vitória *</Label>
            <Select value={criterioVitoria} onValueChange={setCriterioVitoria}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maior_numero_acoes">Maior Número de Ações</SelectItem>
                <SelectItem value="maior_pontuacao">Maior Pontuação Acumulada</SelectItem>
                <SelectItem value="maior_consistencia">Maior Consistência (Check-ins)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Desafio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
