import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FolderOpen, FileText, Upload } from "lucide-react";

interface ImportarGoogleDriveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportarGoogleDriveModal = ({ open, onOpenChange, onSuccess }: ImportarGoogleDriveModalProps) => {
  const [loading, setLoading] = useState(false);
  const [pastaUrl, setPastaUrl] = useState("");
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pastaUrl.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira a URL da pasta do Google Drive",
        variant: "destructive",
      });
      return;
    }

    // Validar se é uma URL válida do Google Drive
    const driveUrlPattern = /^https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/;
    if (!driveUrlPattern.test(pastaUrl)) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida de pasta do Google Drive",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setImportando(true);

    try {
      console.log('Iniciando importação de POPs do Google Drive:', pastaUrl);

      const { data, error } = await supabase.functions.invoke('importar-pops-drive', {
        body: {
          folder_url: pastaUrl,
        }
      });

      if (error) {
        console.error('Erro da função:', error);
        throw new Error(`Erro na importação: ${error.message || JSON.stringify(error)}`);
      }

      if (data && !data.success) {
        console.error('Erro retornado pela função:', data.error);
        throw new Error(data.error || 'Erro desconhecido na importação');
      }

      console.log('Importação concluída:', data);

      toast({
        title: "Importação concluída!",
        description: `${data.imported_count || 0} documentos foram importados como POPs com sucesso.`,
      });

      setPastaUrl("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao importar POPs:', error);
      toast({
        title: "Erro na importação",
        description: error.message || "Erro desconhecido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setImportando(false);
      setProgresso({ atual: 0, total: 0 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar POPs do Google Drive
          </DialogTitle>
          <DialogDescription>
            Importe documentos do Google Drive e transforme-os automaticamente em POPs (Procedimentos Operacionais Padrão).
          </DialogDescription>
        </DialogHeader>

        {!importando ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pasta_url">URL da Pasta do Google Drive *</Label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pasta_url"
                  type="url"
                  value={pastaUrl}
                  onChange={(e) => setPastaUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cole aqui o link da pasta do Google Drive que contém os documentos que deseja transformar em POPs.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Como funciona:</p>
                  <ul className="text-blue-700 mt-1 space-y-1 text-xs list-disc list-inside">
                    <li>Buscamos todos os Google Documents na pasta</li>
                    <li>Convertemos automaticamente para o formato POP</li>
                    <li>Organizamos por categorias baseadas no nome</li>
                    <li>Mantemos a formatação original sempre que possível</li>
                  </ul>
                </div>
              </div>
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
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar POPs
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <h3 className="font-medium mt-2">Importando documentos...</h3>
              <p className="text-sm text-muted-foreground">
                Estamos processando os documentos do Google Drive
              </p>
              {progresso.total > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {progresso.atual} de {progresso.total} documentos processados
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};