import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EditarTreinamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinamentoId: string | null;
  onSuccess?: () => void;
}

interface FormData {
  titulo: string;
  descricao: string;
  tipo: string;
  categoria: string;
  nivel: string;
  duracao: string;
  url_conteudo: string;
}

export const EditarTreinamentoModal = ({ 
  open, 
  onOpenChange, 
  treinamentoId,
  onSuccess 
}: EditarTreinamentoModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    titulo: "",
    descricao: "",
    tipo: "video",
    categoria: "facebook_ads",
    nivel: "iniciante",
    duracao: "",
    url_conteudo: "",
  });

  // Carregar dados do treinamento quando o modal abrir
  useEffect(() => {
    if (open && treinamentoId) {
      carregarTreinamento();
    }
  }, [open, treinamentoId]);

  const carregarTreinamento = async () => {
    if (!treinamentoId) return;
    
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('treinamentos')
        .select('*')
        .eq('id', treinamentoId)
        .single();

      if (error) throw error;

      setFormData({
        titulo: data.titulo || "",
        descricao: data.descricao || "",
        tipo: data.tipo || "video",
        categoria: data.categoria || "facebook_ads",
        nivel: data.nivel || "iniciante",
        duracao: data.duracao ? data.duracao.toString() : "",
        url_conteudo: data.url_conteudo || "",
      });
    } catch (error: any) {
      console.error('Erro ao carregar treinamento:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Não foi possível carregar os dados do treinamento.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treinamentoId) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('treinamentos')
        .update({
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          tipo: formData.tipo,
          categoria: formData.categoria,
          nivel: formData.nivel,
          duracao: formData.duracao ? parseInt(formData.duracao) : null,
          url_conteudo: formData.url_conteudo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', treinamentoId);

      if (error) throw error;
      
      toast({
        title: "Treinamento atualizado com sucesso!",
        description: `${formData.titulo} foi atualizado.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao atualizar treinamento:', error);
      toast({
        title: "Erro ao atualizar treinamento",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Treinamento</DialogTitle>
          <DialogDescription>
            Atualize as informações do treinamento
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Treinamento *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => handleInputChange("titulo", e.target.value)}
                placeholder="Digite o título do treinamento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange("descricao", e.target.value)}
                placeholder="Descreva o conteúdo e objetivos do treinamento"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Conteúdo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleInputChange("tipo", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="documento">Documento</SelectItem>
                    <SelectItem value="apresentacao">Apresentação</SelectItem>
                    <SelectItem value="quiz">Quiz/Avaliação</SelectItem>
                    <SelectItem value="curso">Curso Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => handleInputChange("categoria", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="criativos">Criativos</SelectItem>
                    <SelectItem value="copywriting">Copywriting</SelectItem>
                    <SelectItem value="estrategia">Estratégia</SelectItem>
                    <SelectItem value="ferramentas">Ferramentas</SelectItem>
                    <SelectItem value="processos">Processos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">Nível</Label>
                <Select
                  value={formData.nivel}
                  onValueChange={(value) => handleInputChange("nivel", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duracao">Duração (minutos)</Label>
                <Input
                  id="duracao"
                  type="number"
                  min="0"
                  value={formData.duracao}
                  onChange={(e) => handleInputChange("duracao", e.target.value)}
                  placeholder="Ex: 45"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url_conteudo">URL do Conteúdo</Label>
                <Input
                  id="url_conteudo"
                  type="url"
                  value={formData.url_conteudo}
                  onChange={(e) => handleInputChange("url_conteudo", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};