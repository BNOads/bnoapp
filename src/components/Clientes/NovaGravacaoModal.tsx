import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Video, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NovaGravacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSuccess: () => void;
}

export const NovaGravacaoModal = ({ 
  open, 
  onOpenChange, 
  clienteId,
  onSuccess 
}: NovaGravacaoModalProps) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    url_gravacao: '',
    duracao: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      url_gravacao: '',
      duracao: '',
      tags: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.url_gravacao.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha pelo menos o título e URL da gravação.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Processar tags (separadas por vírgula)
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const gravacaoData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim() || null,
        url_gravacao: formData.url_gravacao.trim(),
        duracao: formData.duracao ? parseInt(formData.duracao) : null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        cliente_id: clienteId,
        created_by: user.id,
        visualizacoes: 0
      };

      const { error } = await supabase
        .from('gravacoes')
        .insert([gravacaoData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Gravação adicionada",
        description: "A gravação foi adicionada com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao adicionar gravação:', error);
      toast({
        title: "Erro ao adicionar gravação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-primary" />
            <DialogTitle>Nova Gravação</DialogTitle>
          </div>
          <DialogDescription>
            Adicione uma nova gravação de reunião para este cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Ex: Reunião de Kickoff - Janeiro 2025"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_gravacao">URL da Gravação *</Label>
            <Input
              id="url_gravacao"
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={formData.url_gravacao}
              onChange={(e) => setFormData(prev => ({ ...prev, url_gravacao: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Breve descrição do que foi discutido na reunião..."
              rows={3}
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracao">Duração (minutos)</Label>
              <Input
                id="duracao"
                type="number"
                placeholder="60"
                min="1"
                value={formData.duracao}
                onChange={(e) => setFormData(prev => ({ ...prev, duracao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="kickoff, estratégia"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Salvando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Gravação</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};