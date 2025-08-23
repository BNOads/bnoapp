import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    tipo_conteudo: "video" as string,
    ordem: 1,
    duracao: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      // Preparar dados para inserção
      const aulaData: any = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao?.trim() || null,
        tipo_conteudo: formData.tipo_conteudo,
        treinamento_id: treinamentoId,
        ordem: proximaOrdem,
        created_by: user.data.user.id,
        duracao: formData.duracao || null,
        ativo: true
      };

      // Só incluir url_youtube se for um vídeo e tiver valor
      if (formData.tipo_conteudo === "video" && formData.url_youtube.trim()) {
        aulaData.url_youtube = formData.url_youtube.trim();
      } else if (formData.tipo_conteudo === "video") {
        aulaData.url_youtube = null;
      }

      console.log('Dados para inserir:', aulaData);

      const { error } = await supabase
        .from('aulas')
        .insert([aulaData]);

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Aula criada com sucesso!",
      });

      setFormData({
        titulo: "",
        descricao: "",
        url_youtube: "",
        tipo_conteudo: "video",
        ordem: 1,
        duracao: 0,
      });

      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao criar aula:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar aula. Tente novamente.",
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
              {isSubmitting ? "Criando..." : "Criar Aula"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}