import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Type, Link } from "lucide-react";

interface EdicaoMassaCriativosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  selectedCount: number;
  onSuccess: (updatedCreatives?: any[]) => void;
}

export const EdicaoMassaCriativosModal = ({ 
  open, 
  onOpenChange, 
  selectedIds, 
  selectedCount,
  onSuccess 
}: EdicaoMassaCriativosModalProps) => {
  const [paginaDestino, setPaginaDestino] = useState('');
  const [legenda, setLegenda] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'legenda' | 'pagina_destino'>('legenda');
  const { toast } = useToast();

  const validateUrl = (url: string) => {
    if (!url) return true;
    return /^https?:\/\/.+/.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedIds.length === 0) return;

    // Validar URL se fornecida
    if (activeTab === 'pagina_destino' && paginaDestino && !validateUrl(paginaDestino)) {
      toast({
        title: "URL inválida",
        description: "A página de destino deve começar com http:// ou https://",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (activeTab === 'legenda') {
        updateData.legenda = legenda?.trim() || null;
      } else {
        updateData.pagina_destino = paginaDestino?.trim() || null;
      }

      const { data, error } = await supabase
        .from('creatives')
        .update(updateData)
        .in('id', selectedIds)
        .select();

      if (error) throw error;

      const fieldName = activeTab === 'legenda' ? 'Legenda' : 'Página de destino';
      toast({
        title: "✔️ Alteração salva",
        description: `${fieldName} atualizada para ${selectedCount} criativos`,
      });

      onSuccess(data);
      onOpenChange(false);
      setPaginaDestino('');
      setLegenda('');
    } catch (error: any) {
      console.error('Erro ao atualizar criativos:', error);
      toast({
        title: "Falha ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{selectedCount} criativos</strong> selecionados para edição
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'legenda' | 'pagina_destino')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="legenda" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Legenda
              </TabsTrigger>
              <TabsTrigger value="pagina_destino" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Página de Destino
              </TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <TabsContent value="legenda" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="legenda">Legenda do Anúncio</Label>
                  <Textarea
                    id="legenda"
                    placeholder="Digite a legenda para os criativos selecionados..."
                    value={legenda}
                    onChange={(e) => setLegenda(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto de legenda que será usado nos anúncios. Este valor será aplicado a todos os criativos selecionados.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="pagina_destino" className="space-y-4 mt-0">
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
              </TabsContent>

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
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};