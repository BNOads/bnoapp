import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, RotateCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface Creative {
  id: string;
  imageUrl: string;
  format: string;
  variation: number;
  originalImage: string;
}

interface ResultsStepProps {
  creatives: Creative[];
  onReset: () => void;
}

export const ResultsStep = ({ creatives, onReset }: ResultsStepProps) => {
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedCreatives);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCreatives(newSelected);
  };

  const selectAll = () => {
    setSelectedCreatives(new Set(creatives.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedCreatives(new Set());
  };

  const downloadSingle = async (creative: Creative) => {
    try {
      const response = await fetch(creative.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `criativo-${creative.format}-${creative.variation}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch (error) {
      toast.error("Erro ao fazer download");
    }
  };

  const downloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      const creativesToDownload = creatives.filter(c => selectedCreatives.has(c.id));

      for (const creative of creativesToDownload) {
        const response = await fetch(creative.imageUrl);
        const blob = await response.blob();
        zip.file(`criativo-${creative.format}-v${creative.variation}.png`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `criativos-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Download do pacote iniciado");
    } catch (error) {
      toast.error("Erro ao criar pacote zip");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Criativos Gerados</h2>
          <p className="text-muted-foreground">
            {creatives.length} {creatives.length === 1 ? 'criativo gerado' : 'criativos gerados'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedCreatives.size > 0 ? (
            <>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Desmarcar Todos
              </Button>
              <Button
                size="sm"
                onClick={downloadZip}
                disabled={downloading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar {selectedCreatives.size} {selectedCreatives.size === 1 ? 'Selecionado' : 'Selecionados'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar Todos
            </Button>
          )}
        </div>
      </div>

      {/* Grid de Criativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {creatives.map((creative) => {
          const isSelected = selectedCreatives.has(creative.id);
          
          return (
            <Card
              key={creative.id}
              className={`relative cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => toggleSelect(creative.id)}
            >
              <CardContent className="p-3">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                  <img
                    src={creative.imageUrl}
                    alt={`Criativo ${creative.variation}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {isSelected && (
                  <div className="absolute top-5 right-5 p-1 rounded-full bg-primary">
                    <CheckCircle className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-sm font-medium truncate">
                    Variação {creative.variation}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {creative.format}
                  </p>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSingle(creative);
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reset Button */}
      <div className="flex justify-center pt-6">
        <Button onClick={onReset} variant="outline" size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          Criar Novos Criativos
        </Button>
      </div>
    </div>
  );
};
