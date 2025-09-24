import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

interface Creative {
  id: string;
  name: string;
  observacao_personalizada?: string | null;
  nomenclatura_trafego?: string | null;
  pagina_destino?: string | null;
  link_web_view: string;
  thumbnail_link?: string;
}

interface EditarCriativoGoogleDriveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creative: Creative | null;
  onSuccess: (updatedCreative?: any) => void;
}

export const EditarCriativoGoogleDriveModal = ({ 
  open, 
  onOpenChange, 
  creative, 
  onSuccess 
}: EditarCriativoGoogleDriveModalProps) => {
  const [formData, setFormData] = useState({
    nomenclatura: '',
    observacao: '',
    pagina_destino: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (creative) {
      setFormData({
        nomenclatura: creative.nomenclatura_trafego || '',
        observacao: creative.observacao_personalizada || '',
        pagina_destino: creative.pagina_destino || ''
      });
    }
  }, [creative]);

  const validateUrl = (url: string) => {
    if (!url) return true; // URL is optional
    return /^https?:\/\/.+/.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!creative) return;

    // Validar URL se fornecida
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
      const { data, error } = await supabase
        .from('creatives')
        .update({
          nomenclatura_trafego: formData.nomenclatura?.trim() || null,
          observacao_personalizada: formData.observacao?.trim() || null,
          pagina_destino: formData.pagina_destino?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', creative.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✔️ Alteração salva",
        description: "Informações do criativo atualizadas com sucesso!",
      });

      // Passar os dados atualizados para o callback
      onSuccess(data);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar criativo:', error);
      toast({
        title: "Falha ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!creative) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Informações do Criativo</DialogTitle>
        </DialogHeader>
        
        {/* Visualização do Criativo */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
          {creative.thumbnail_link && (
            <img 
              src={creative.thumbnail_link} 
              alt={creative.name}
              className="w-12 h-12 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1">
            <h4 className="font-medium text-sm truncate" title={creative.name}>
              {creative.name}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(creative.link_web_view, '_blank')}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver no Google Drive
            </Button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};