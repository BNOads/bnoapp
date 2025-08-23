import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NovaAulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  treinamentoId: string;
  onSuccess: () => void;
}

export function NovaAulaModal({ isOpen, onClose, treinamentoId, onSuccess }: NovaAulaModalProps) {
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    url_youtube: "",
    ordem: 1,
    duracao: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar a próxima ordem disponível
      const { data: ultimaAula } = await supabase
        .from('aulas')
        .select('ordem')
        .eq('treinamento_id', treinamentoId)
        .order('ordem', { ascending: false })
        .limit(1)
        .maybeSingle();

      const proximaOrdem = ultimaAula ? ultimaAula.ordem + 1 : 1;

      const { error } = await supabase
        .from('aulas')
        .insert([
          {
            ...formData,
            treinamento_id: treinamentoId,
            ordem: proximaOrdem,
            created_by: user.data.user.id,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aula criada com sucesso!",
      });

      setFormData({
        titulo: "",
        descricao: "",
        url_youtube: "",
        ordem: 1,
        duracao: 0,
      });

      onSuccess();
    } catch (error) {
      console.error('Erro ao criar aula:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar aula. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Aula</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título da Aula</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="url_youtube">URL do YouTube</Label>
            <Input
              id="url_youtube"
              type="url"
              value={formData.url_youtube}
              onChange={(e) => setFormData({ ...formData, url_youtube: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>

          <div>
            <Label htmlFor="duracao">Duração (em minutos)</Label>
            <Input
              id="duracao"
              type="number"
              value={formData.duracao}
              onChange={(e) => setFormData({ ...formData, duracao: parseInt(e.target.value) * 60 })}
              min="0"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Informe a duração em minutos (será convertida automaticamente)
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Aula"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}