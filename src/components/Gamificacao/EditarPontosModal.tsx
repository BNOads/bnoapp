import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditarPontosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acaoId: string;
  pontosAtuais: number;
  onSuccess: () => void;
}

export const EditarPontosModal = ({
  open,
  onOpenChange,
  acaoId,
  pontosAtuais,
  onSuccess
}: EditarPontosModalProps) => {
  const [pontos, setPontos] = useState(pontosAtuais);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPontos(pontosAtuais);
  }, [pontosAtuais, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Editando pontos:', { acaoId, pontosAtuais, novoPontos: pontos });
    
    if (pontos < 0) {
      toast({
        title: "Valor inválido",
        description: "Os pontos devem ser um valor positivo.",
        variant: "destructive",
      });
      return;
    }

    if (!acaoId) {
      toast({
        title: "Erro",
        description: "ID da ação não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Atualizando no banco:', { pontos, acaoId });
      
      const { data, error } = await supabase
        .from('gamificacao_acoes')
        .update({ pontos })
        .eq('id', acaoId)
        .select();

      console.log('Resposta do banco:', { data, error });

      if (error) throw error;

      toast({
        title: "Pontos atualizados",
        description: "Os pontos foram atualizados com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar pontos:', error);
      toast({
        title: "Erro ao atualizar pontos",
        description: error.message || "Não foi possível atualizar os pontos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Pontos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pontos">Pontos</Label>
            <Input
              id="pontos"
              type="number"
              min="0"
              value={pontos}
              onChange={(e) => setPontos(Number(e.target.value))}
              placeholder="Digite os pontos"
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
