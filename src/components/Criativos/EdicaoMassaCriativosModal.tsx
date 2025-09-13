import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

interface EdicaoMassaCriativosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  selectedCount: number;
  onSuccess: () => void;
}

export const EdicaoMassaCriativosModal = ({ 
  open, 
  onOpenChange, 
  selectedIds, 
  selectedCount,
  onSuccess 
}: EdicaoMassaCriativosModalProps) => {
  const [paginaDestino, setPaginaDestino] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateUrl = (url: string) => {
    if (!url) return true; // URL is optional
    return /^https?:\/\/.+/.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedIds.length === 0) return;

    // Validar URL se fornecida
    if (paginaDestino && !validateUrl(paginaDestino)) {
      toast({
        title: "URL inválida",
        description: "A página de destino deve começar com http:// ou https://",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('creatives')
        .update({
          pagina_destino: paginaDestino || null
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Página de destino atualizada para ${selectedCount} criativos`,
      });

      onSuccess();
      onOpenChange(false);
      setPaginaDestino('');
    } catch (error: any) {
      console.error('Erro ao atualizar criativos:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar criativos",
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
          <DialogTitle>Editar em Massa - Página de Destino</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{selectedCount} criativos</strong> selecionados para edição
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pagina_destino">Página de Destino</Label>
              <Input
                id="pagina_destino"
                type="url"
                placeholder="https://example.com/landing-page"
                value={paginaDestino}
                onChange={(e) => setPaginaDestino(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL da landing page ou página para onde os criativos direcionam. Este valor será aplicado a todos os criativos selecionados.
              </p>
              {paginaDestino && validateUrl(paginaDestino) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(paginaDestino, '_blank')}
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
                {loading ? "Salvando..." : `Atualizar ${selectedCount} Criativos`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};