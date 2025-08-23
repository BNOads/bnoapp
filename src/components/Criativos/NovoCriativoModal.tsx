import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NovoCriativoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSuccess: () => void;
}

export const NovoCriativoModal = ({ open, onOpenChange, clienteId, onSuccess }: NovoCriativoModalProps) => {
  const [formData, setFormData] = useState({
    nome: '',
    link_externo: '',
    tipo_criativo: '',
    descricao: ''
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      nome: '',
      link_externo: '',
      tipo_criativo: '',
      descricao: ''
    });
    setTags([]);
    setNewTag('');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.link_externo || !formData.tipo_criativo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, link e tipo do criativo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('criativos')
        .insert({
          cliente_id: clienteId,
          nome: formData.nome,
          link_externo: formData.link_externo,
          tipo_criativo: formData.tipo_criativo,
          tags: tags,
          descricao: formData.descricao || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Criativo cadastrado!",
        description: "O criativo foi adicionado com sucesso.",
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao cadastrar criativo:', error);
      toast({
        title: "Erro ao cadastrar criativo",
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
          <DialogTitle>Novo Criativo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Criativo *</Label>
            <Input
              id="nome"
              placeholder="Ex: Banner Facebook - Promoção Verão"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_externo">Link Externo *</Label>
            <Input
              id="link_externo"
              type="url"
              placeholder="https://drive.google.com/..."
              value={formData.link_externo}
              onChange={(e) => setFormData({ ...formData, link_externo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_criativo">Tipo de Criativo *</Label>
            <Select value={formData.tipo_criativo} onValueChange={(value) => setFormData({ ...formData, tipo_criativo: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Digite uma tag e pressione Enter"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Adicionar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descrição do criativo..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar Criativo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};