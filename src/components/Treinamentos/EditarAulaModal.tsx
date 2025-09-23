import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditarAulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  aulaId: string | null;
  onSuccess: () => void;
}

interface AulaData {
  titulo: string;
  descricao: string;
  url_youtube: string;
  tipo_conteudo: string;
  duracao: number;
}

export function EditarAulaModal({ isOpen, onClose, aulaId, onSuccess }: EditarAulaModalProps) {
  const [formData, setFormData] = useState<AulaData>({
    titulo: "",
    descricao: "",
    url_youtube: "",
    tipo_conteudo: "video",
    duracao: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (aulaId && isOpen) {
      carregarAula();
    }
  }, [aulaId, isOpen]);

  const carregarAula = async () => {
    if (!aulaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aulas')
        .select('titulo, descricao, url_youtube, tipo_conteudo, duracao')
        .eq('id', aulaId)
        .single();

      if (error) throw error;

      setFormData({
        titulo: data.titulo || "",
        descricao: data.descricao || "",
        url_youtube: data.url_youtube || "",
        tipo_conteudo: data.tipo_conteudo || "video",
        duracao: data.duracao || 0,
      });
    } catch (error: any) {
      console.error('Erro ao carregar aula:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da aula.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!aulaId) return;

    // Validação adicional para vídeos
    if (formData.tipo_conteudo === "video" && !formData.url_youtube.trim()) {
      toast({
        title: "Erro de validação",
        description: "URL do YouTube é obrigatória para aulas em vídeo.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Preparar dados para atualização
      const aulaData: any = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao?.trim() || null,
        tipo_conteudo: formData.tipo_conteudo,
        duracao: formData.duracao || null,
      };

      // Só incluir url_youtube se for um vídeo
      if (formData.tipo_conteudo === "video" && formData.url_youtube.trim()) {
        aulaData.url_youtube = formData.url_youtube.trim();
      } else if (formData.tipo_conteudo !== "video") {
        aulaData.url_youtube = null;
      }

      const { error } = await supabase
        .from('aulas')
        .update(aulaData)
        .eq('id', aulaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aula atualizada com sucesso!",
      });

      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao atualizar aula:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar aula. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Aula</DialogTitle>
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
            <Label htmlFor="tipo_conteudo">Tipo de Conteúdo</Label>
            <Select
              value={formData.tipo_conteudo}
              onValueChange={(value) => setFormData({ ...formData, tipo_conteudo: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Aula em Vídeo</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="documento">Documento</SelectItem>
                <SelectItem value="apresentacao">Apresentação</SelectItem>
                <SelectItem value="exercicio">Exercício Prático</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_conteudo === "video" && (
            <div>
              <Label htmlFor="url_youtube">URL do YouTube</Label>
              <Input
                id="url_youtube"
                type="url"
                value={formData.url_youtube}
                onChange={(e) => setFormData({ ...formData, url_youtube: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          <div>
            <Label htmlFor="duracao">Duração (em minutos)</Label>
            <Input
              id="duracao"
              type="number"
              value={formData.duracao}
              onChange={(e) => setFormData({ ...formData, duracao: parseInt(e.target.value) || 0 })}
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
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}