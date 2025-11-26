import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Check, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeadlinesStepProps {
  originalHeadline: string;
  variations: number;
  varyHeadlines: boolean;
  onHeadlinesReady: (headlines: string[]) => void;
  onBack: () => void;
}

export const HeadlinesStep = ({
  originalHeadline,
  variations,
  varyHeadlines,
  onHeadlinesReady,
  onBack,
}: HeadlinesStepProps) => {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">("idle");
  const [headlines, setHeadlines] = useState<string[]>([originalHeadline]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    generateHeadlines();
  }, []);

  const generateHeadlines = async () => {
    // Se não for para variar headlines ou só tem 1 variação, usar apenas a original
    if (!varyHeadlines || variations === 1) {
      setHeadlines([originalHeadline]);
      setStatus("ready");
      return;
    }

    setStatus("generating");

    try {
      const { data, error } = await supabase.functions.invoke('gerar-variacoes-headline', {
        body: {
          headline: originalHeadline,
          quantidade: variations - 1, // -1 porque já temos a original
        },
      });

      if (error) {
        console.error('Erro ao gerar variações de headline:', error);
        toast.error('Não foi possível gerar variações. Usando headline original.');
        setHeadlines([originalHeadline]);
      } else if (data?.variacoes) {
        const allHeadlines = [originalHeadline, ...data.variacoes];
        setHeadlines(allHeadlines);
        toast.success(`${allHeadlines.length} headlines geradas com sucesso!`);
      } else {
        setHeadlines([originalHeadline]);
      }

      setStatus("ready");
    } catch (err) {
      console.error('Erro ao gerar variações de headline:', err);
      toast.error('Erro ao gerar variações. Usando headline original.');
      setHeadlines([originalHeadline]);
      setStatus("ready");
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(headlines[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const newHeadlines = [...headlines];
      newHeadlines[editingIndex] = editValue;
      setHeadlines(newHeadlines);
      setEditingIndex(null);
      toast.success("Headline atualizada!");
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleProceed = () => {
    onHeadlinesReady(headlines);
  };

  if (status === "generating") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Gerando Headlines</h2>
          <p className="text-muted-foreground">
            Criando variações criativas da sua headline...
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="p-6 rounded-full bg-primary/10">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Isso pode levar alguns segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Revise as Headlines</h2>
        </div>
        <p className="text-muted-foreground">
          {varyHeadlines && variations > 1
            ? "Revise e edite as variações geradas pela IA antes de continuar"
            : "Confirme a headline antes de continuar"}
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {headlines.map((headline, index) => (
          <Card key={index} className="relative">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold">
                      {index === 0 ? "Original" : `Variação ${index}`}
                    </Label>
                    {index === 0 && (
                      <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
                        Sua headline
                      </span>
                    )}
                  </div>
                  
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Digite a headline..."
                        maxLength={120}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 mr-1" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{headline}</p>
                  )}
                </div>

                {editingIndex !== index && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(index)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Cada headline será usada para gerar criativos diferentes. 
              Edite-as para garantir que estão perfeitas antes de continuar.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={handleProceed} disabled={editingIndex !== null}>
          {editingIndex !== null ? "Salve a edição primeiro" : "Continuar para Geração"}
        </Button>
      </div>
    </div>
  );
};