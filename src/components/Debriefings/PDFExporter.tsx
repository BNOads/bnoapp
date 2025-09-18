import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface PDFExporterProps {
  debriefingId: string;
  debriefingName: string;
  availablePanels: Array<{
    id: string;
    title: string;
    isExcluded: boolean;
  }>;
}

export default function PDFExporter({ 
  debriefingId, 
  debriefingName, 
  availablePanels 
}: PDFExporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPanels, setSelectedPanels] = useState<string[]>(
    availablePanels.filter(p => !p.isExcluded).map(p => p.id)
  );

  const handlePanelToggle = (panelId: string) => {
    setSelectedPanels(prev => 
      prev.includes(panelId) 
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      // Criar um elemento temporário com o conteúdo a ser capturado
      const element = document.getElementById('debriefing-content');
      if (!element) {
        throw new Error('Conteúdo do debriefing não encontrado');
      }

      // Ocultar painéis não selecionados temporariamente
      const panelElements = element.querySelectorAll('[data-panel-id]');
      const hiddenPanels: { element: Element; originalDisplay: string }[] = [];
      
      panelElements.forEach((panelElement) => {
        const panelId = panelElement.getAttribute('data-panel-id');
        if (panelId && !selectedPanels.includes(panelId)) {
          const htmlElement = panelElement as HTMLElement;
          hiddenPanels.push({
            element: panelElement,
            originalDisplay: htmlElement.style.display
          });
          htmlElement.style.display = 'none';
        }
      });

      // Capturar o elemento como imagem
      const canvas = await html2canvas(element, {
        scale: 2, // Maior qualidade
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      // Restaurar painéis ocultados
      hiddenPanels.forEach(({ element, originalDisplay }) => {
        (element as HTMLElement).style.display = originalDisplay;
      });

      // Criar PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Adicionar primeira página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Adicionar páginas adicionais se necessário
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `${debriefingName.replace(/[^a-zA-Z0-9]/g, '_')}_debriefing.pdf`;
      pdf.save(fileName);

      toast.success('PDF gerado com sucesso!');
      setIsOpen(false);
      
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast.error(`Erro ao gerar PDF: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar PDF
          </DialogTitle>
          <DialogDescription>
            Selecione quais painéis incluir na exportação do PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            {availablePanels.map((panel) => (
              <div key={panel.id} className="flex items-center space-x-2">
                <Checkbox
                  id={panel.id}
                  checked={selectedPanels.includes(panel.id)}
                  onCheckedChange={() => handlePanelToggle(panel.id)}
                  disabled={panel.isExcluded}
                />
                <label 
                  htmlFor={panel.id} 
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                    panel.isExcluded ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {panel.title}
                  {panel.isExcluded && ' (Excluído)'}
                </label>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button 
              onClick={generatePDF} 
              disabled={isGenerating || selectedPanels.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}