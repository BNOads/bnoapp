import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EditarDesafioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  desafioId: string;
  onSuccess: () => void;
}

type TipoMedicao = "check_in_diario" | "pontuacao" | "quantidade_acoes";
type CriterioVitoria = "maior_consistencia" | "maior_numero_acoes" | "maior_pontuacao";

interface Desafio {
  titulo: string;
  descricao: string;
  tipo_medicao: TipoMedicao;
  criterio_vitoria: CriterioVitoria;
  data_inicio: string;
  data_fim: string;
}

export const EditarDesafioModal = ({ open, onOpenChange, desafioId, onSuccess }: EditarDesafioModalProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [desafio, setDesafio] = useState<Desafio>({
    titulo: "",
    descricao: "",
    tipo_medicao: "pontuacao",
    criterio_vitoria: "maior_pontuacao",
    data_inicio: "",
    data_fim: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && desafioId) {
      loadDesafio();
    }
  }, [open, desafioId]);

  const loadDesafio = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('gamificacao_desafios')
        .select('*')
        .eq('id', desafioId)
        .single();

      if (error) throw error;

      setDesafio({
        titulo: data.titulo,
        descricao: data.descricao || "",
        tipo_medicao: data.tipo_medicao as TipoMedicao,
        criterio_vitoria: data.criterio_vitoria as CriterioVitoria,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
      });
    } catch (error) {
      console.error('Erro ao carregar desafio:', error);
      toast({
        title: "Erro ao carregar desafio",
        description: "Não foi possível carregar os dados do desafio.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!desafio.titulo || !desafio.data_inicio || !desafio.data_fim) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('gamificacao_desafios')
        .update({
          titulo: desafio.titulo,
          descricao: desafio.descricao,
          tipo_medicao: desafio.tipo_medicao,
          criterio_vitoria: desafio.criterio_vitoria,
          data_inicio: desafio.data_inicio,
          data_fim: desafio.data_fim,
        })
        .eq('id', desafioId);

      if (error) throw error;

      toast({
        title: "Desafio atualizado!",
        description: "O desafio foi atualizado com sucesso.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar desafio:', error);
      toast({
        title: "Erro ao atualizar desafio",
        description: "Não foi possível atualizar o desafio. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Desafio</DialogTitle>
          <DialogDescription className="sr-only">Atualize título, datas e critérios do desafio.</DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={desafio.titulo}
                onChange={(e) => setDesafio({ ...desafio, titulo: e.target.value })}
                placeholder="Ex: Desafio de Outubro 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={desafio.descricao}
                onChange={(e) => setDesafio({ ...desafio, descricao: e.target.value })}
                placeholder="Descreva o desafio..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_inicio">Data Início *</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={desafio.data_inicio}
                  onChange={(e) => setDesafio({ ...desafio, data_inicio: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="data_fim">Data Fim *</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={desafio.data_fim}
                  onChange={(e) => setDesafio({ ...desafio, data_fim: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tipo_medicao">Tipo de Medição</Label>
              <Select
                value={desafio.tipo_medicao}
                onValueChange={(value) => setDesafio({ ...desafio, tipo_medicao: value as TipoMedicao })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pontuacao">Pontuação</SelectItem>
                  <SelectItem value="quantidade_acoes">Quantidade de Ações</SelectItem>
                  <SelectItem value="check_in_diario">Check-in Diário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="criterio_vitoria">Critério de Vitória</Label>
              <Select
                value={desafio.criterio_vitoria}
                onValueChange={(value) => setDesafio({ ...desafio, criterio_vitoria: value as CriterioVitoria })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maior_pontuacao">Maior Pontuação</SelectItem>
                  <SelectItem value="maior_numero_acoes">Maior Número de Ações</SelectItem>
                  <SelectItem value="maior_consistencia">Maior Consistência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
