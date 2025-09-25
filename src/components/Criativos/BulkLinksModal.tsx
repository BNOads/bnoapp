import { useState } from "react";
import { ExternalLink, AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Creative {
  id: string;
  name: string;
  link_web_view: string;
}

interface BulkLinksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatives: Creative[];
  onOpenLinks: () => void;
}

export const BulkLinksModal = ({ 
  open, 
  onOpenChange, 
  creatives, 
  onOpenLinks 
}: BulkLinksModalProps) => {
  const [showFallbackLinks, setShowFallbackLinks] = useState(false);

  const handleOpenLinksWithFallback = async () => {
    const batchSize = 5;
    const delay = 300;
    let blockedCount = 0;

    for (let i = 0; i < creatives.length; i += batchSize) {
      const batch = creatives.slice(i, i + batchSize);
      
      for (const creative of batch) {
        try {
          const newWindow = window.open(creative.link_web_view, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
            blockedCount++;
          }
        } catch (error) {
          blockedCount++;
        }
        
        // Delay entre abas do mesmo lote
        if (batch.indexOf(creative) < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Delay entre lotes
      if (i + batchSize < creatives.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (blockedCount > 0) {
      setShowFallbackLinks(true);
    } else {
      onOpenChange(false);
    }
  };

  const copyAllLinks = () => {
    const allLinks = creatives.map(c => `${c.name}: ${c.link_web_view}`).join('\n');
    navigator.clipboard.writeText(allLinks);
  };

  if (showFallbackLinks) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Links Bloqueados pelo Navegador
            </DialogTitle>
          </DialogHeader>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O navegador bloqueou algumas abas. Você pode abrir os links manualmente ou copiar todos de uma vez.
            </AlertDescription>
          </Alert>

          <ScrollArea className="max-h-64 border rounded">
            <div className="space-y-2 p-4">
              {creatives.map((creative) => (
                <div key={creative.id} className="flex items-center justify-between gap-2 p-2 border rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{creative.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{creative.link_web_view}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(creative.link_web_view, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={copyAllLinks}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar Todos os Links
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir Links em Massa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está prestes a abrir <strong>{creatives.length}</strong> links em novas abas.
          </p>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Os links serão abertos em lotes de 5 com intervalos de 300ms para evitar bloqueios do navegador.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleOpenLinksWithFallback}>
            Abrir {creatives.length} Links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};