import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUploadButton } from "@/components/ui/ImageUploadButton";

interface RegistrarAcaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  desafioId: string;
  onSuccess: () => void;
}

export const RegistrarAcaoModal = ({ 
  open, 
  onOpenChange, 
  desafioId,
  onSuccess 
}: RegistrarAcaoModalProps) => {
  const [descricao, setDescricao] = useState("");
  const [comprovacao, setComprovacao] = useState("");
  const [pontos, setPontos] = useState("5");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('gamificacao_acoes')
        .insert({
          desafio_id: desafioId,
          colaborador_id: user.id,
          descricao,
          comprovacao: comprovacao || null,
          pontos: parseInt(pontos),
          aprovado: true
        });

      if (error) throw error;

      toast({
        title: "✅ Ação registrada com sucesso!",
        description: `+${pontos} pontos adicionados ao ranking!`,
      });

      // Resetar form
      setDescricao("");
      setComprovacao("");
      setPontos("5");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao registrar ação:', error);
      toast({
        title: "Erro ao registrar ação",
        description: "Não foi possível registrar sua ação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar Ação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="descricao">Descrição da Ação *</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Sugeri nova funcionalidade de funil para o painel de clientes."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="pontos">Pontos</Label>
            <Input
              id="pontos"
              type="number"
              value={pontos}
              onChange={(e) => setPontos(e.target.value)}
              min="1"
              max="100"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Valor padrão: 5 pontos por ação
            </p>
          </div>

          <div>
            <Label htmlFor="comprovacao">Comprovação (opcional)</Label>
            <Input
              id="comprovacao"
              value={comprovacao}
              onChange={(e) => setComprovacao(e.target.value)}
              placeholder="Link para imagem, print ou documento"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Adicione um link de comprovação (imagem, print, documento)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Ação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
