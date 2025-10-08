import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

interface NovoCriativoExternoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSuccess: () => void;
}

export const NovoCriativoExternoModal = ({ 
  open, 
  onOpenChange, 
  clienteId,
  onSuccess 
}: NovoCriativoExternoModalProps) => {
  const [formData, setFormData] = useState({
    nome: '',
    link_externo: '',
    tipo: '',
    nomenclatura: '',
    observacao: '',
    pagina_destino: '',
    pasta_externa: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateUrl = (url: string) => {
    const trimmedUrl = url.trim();
    return /^https?:\/\/.+/.test(trimmedUrl);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      link_externo: '',
      tipo: '',
      nomenclatura: '',
      observacao: '',
      pagina_destino: '',
      pasta_externa: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do criativo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!validateUrl(formData.link_externo)) {
      toast({
        title: "URL inválida",
        description: "O link externo deve começar com http:// ou https://",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tipo) {
      toast({
        title: "Campo obrigatório",
        description: "O tipo do criativo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Validar URL da página de destino se fornecida
    if (formData.pagina_destino && !validateUrl(formData.pagina_destino)) {
      toast({
        title: "URL inválida",
        description: "A página de destino deve começar com http:// ou https://",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Gerar um file_id único para criativos externos
      const externalFileId = `external_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('creatives')
        .insert({
          client_id: clienteId,
          file_id: externalFileId,
          name: formData.nome.trim(),
          mime_type: formData.tipo === 'video' ? 'video/external' : 
                    formData.tipo === 'imagem' ? 'image/external' : 'external/link',
          link_web_view: formData.link_externo,
          link_direct: formData.link_externo,
          icon_link: null,
          thumbnail_link: null,
          file_size: null,
          modified_time: new Date().toISOString(),
          folder_name: formData.pasta_externa || 'Externo',
          folder_path: formData.pasta_externa || 'Externo',
          parent_folder_id: 'external_folder',
          nomenclatura_trafego: formData.nomenclatura || null,
          observacao_personalizada: formData.observacao || null,
          pagina_destino: formData.pagina_destino || null,
          is_active: false,
          archived: false
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Criativo externo adicionado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao adicionar criativo externo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar criativo externo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Criativo Externo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Criativo *</Label>
            <Input
              id="nome"
              placeholder="Ex: Post Instagram - Campanha Verão"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Nome para identificar o criativo na plataforma
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_externo">Link Externo *</Label>
            <Input
              id="link_externo"
              type="url"
              placeholder="https://instagram.com/p/exemplo ou https://youtube.com/watch?v=exemplo"
              value={formData.link_externo}
              onChange={(e) => setFormData({ ...formData, link_externo: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              URL onde o criativo está hospedado (Instagram, YouTube, TikTok, etc.)
            </p>
            {formData.link_externo && validateUrl(formData.link_externo) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(formData.link_externo, '_blank')}
                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Testar link
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo do Criativo *</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="carousel">Carrossel</SelectItem>
                <SelectItem value="stories">Stories</SelectItem>
                <SelectItem value="reels">Reels</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pasta_externa">Pasta do Criativo</Label>
            <Select value={formData.pasta_externa} onValueChange={(value) => setFormData({ ...formData, pasta_externa: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>C1</span>
                  </div>
                </SelectItem>
                <SelectItem value="C2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>C2</span>
                  </div>
                </SelectItem>
                <SelectItem value="Lancamento">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>Lançamento</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha em qual pasta categorizar este criativo externo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomenclatura">Nomenclatura para Tráfego</Label>
            <Input
              id="nomenclatura"
              placeholder="Ex: Criativo A, Variação 1, Banner Principal..."
              value={formData.nomenclatura}
              onChange={(e) => setFormData({ ...formData, nomenclatura: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Nome usado pela equipe de tráfego para identificar o criativo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              placeholder="Observações sobre o criativo, contexto, variações, performance..."
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Informações adicionais sobre o criativo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pagina_destino">Página de Destino</Label>
            <Input
              id="pagina_destino"
              type="url"
              placeholder="https://example.com/landing-page"
              value={formData.pagina_destino}
              onChange={(e) => setFormData({ ...formData, pagina_destino: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              URL da landing page ou página para onde o criativo direciona
            </p>
            {formData.pagina_destino && validateUrl(formData.pagina_destino) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(formData.pagina_destino, '_blank')}
                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Testar link
              </Button>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar Criativo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};