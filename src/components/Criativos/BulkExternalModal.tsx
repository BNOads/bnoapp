import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";

interface BulkExternalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSuccess: () => void;
}

interface ExternalCreative {
  name: string;
  url: string;
  mimeType: string;
  observacao?: string;
}

export const BulkExternalModal = ({ open, onOpenChange, clienteId, onSuccess }: BulkExternalModalProps) => {
  const [creatives, setCreatives] = useState<ExternalCreative[]>([
    { name: "", url: "", mimeType: "video/external", observacao: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addCreative = () => {
    setCreatives([...creatives, { name: "", url: "", mimeType: "video/external", observacao: "" }]);
  };

  const removeCreative = (index: number) => {
    if (creatives.length > 1) {
      setCreatives(creatives.filter((_, i) => i !== index));
    }
  };

  const updateCreative = (index: number, field: keyof ExternalCreative, value: string) => {
    const updated = [...creatives];
    updated[index] = { ...updated[index], [field]: value };
    setCreatives(updated);
  };

  const handleSubmit = async () => {
    // Validar se todos os campos obrigatórios estão preenchidos
    const validCreatives = creatives.filter(creative => 
      creative.name.trim() && creative.url.trim()
    );

    if (validCreatives.length === 0) {
      toast({
        title: "Erro",
        description: "Pelo menos um criativo deve ter nome e URL preenchidos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const creativesToInsert = validCreatives.map(creative => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        
        return {
          client_id: clienteId,
          file_id: `external_${timestamp}_${randomId}`,
          name: creative.name,
          mime_type: creative.mimeType,
          link_web_view: creative.url,
          link_direct: creative.url,
          icon_link: null,
          thumbnail_link: null,
          file_size: null,
          modified_time: new Date().toISOString(),
          folder_name: "Externos",
          folder_path: "Externos",
          parent_folder_id: "external_folder",
          is_active: false,
          observacao_personalizada: creative.observacao || null
        };
      });

      const { error } = await supabase
        .from('creatives')
        .insert(creativesToInsert);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${validCreatives.length} criativos externos adicionados com sucesso!`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setCreatives([{ name: "", url: "", mimeType: "video/external", observacao: "" }]);
      
    } catch (error: any) {
      console.error('Erro ao adicionar criativos:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar criativos externos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Criativos Externos em Massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {creatives.map((creative, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Criativo {index + 1}</h4>
                {creatives.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCreative(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${index}`}>Nome do Criativo *</Label>
                  <Input
                    id={`name-${index}`}
                    value={creative.name}
                    onChange={(e) => updateCreative(index, 'name', e.target.value)}
                    placeholder="Ex: C1 - Video Principal"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`type-${index}`}>Tipo</Label>
                  <Select
                    value={creative.mimeType}
                    onValueChange={(value) => updateCreative(index, 'mimeType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video/external">Vídeo Externo</SelectItem>  
                      <SelectItem value="image/external">Imagem Externa</SelectItem>
                      <SelectItem value="application/external">Documento Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`url-${index}`}>URL *</Label>
                <Input
                  id={`url-${index}`}
                  value={creative.url}
                  onChange={(e) => updateCreative(index, 'url', e.target.value)}
                  placeholder="https://example.com/criativo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`observacao-${index}`}>Observação</Label>
                <Textarea
                  id={`observacao-${index}`}
                  value={creative.observacao}
                  onChange={(e) => updateCreative(index, 'observacao', e.target.value)}
                  placeholder="Observações sobre este criativo..."
                  rows={2}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addCreative}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Outro Criativo
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Adicionando..." : "Adicionar Criativos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};