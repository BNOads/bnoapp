import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { CreativeConfig } from "./CriadorCriativosView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerationStepProps {
  config: CreativeConfig;
  onGenerationComplete: (creatives: any[]) => void;
  onBack: () => void;
}

export const GenerationStep = ({
  config,
  onGenerationComplete,
  onBack,
}: GenerationStepProps) => {
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    generateCreatives();
  }, []);

  const generateCreatives = async () => {
    setStatus("generating");
    setProgress(0);
    
    try {
      const totalFormats = (config.formats.feed1080 ? 1 : 0) + (config.formats.story1920 ? 1 : 0);
      const totalTasks = config.images.length * totalFormats * config.variations;
      let completedTasks = 0;

      const allCreatives: any[] = [];

      for (const image of config.images) {
        setCurrentTask(`Processando ${image.name}...`);
        
        // Converter imagem para base64
        const base64Image = await fileToBase64(image);
        
        // Gerar para cada formato
        for (const format of Object.keys(config.formats)) {
          if (!config.formats[format as keyof typeof config.formats]) continue;
          
          const dimensions = format === "feed1080" ? "1080x1080" : "1080x1920";
          setCurrentTask(`Gerando ${dimensions} - ${image.name}...`);
          
          // Gerar variações
          for (let i = 0; i < config.variations; i++) {
            setCurrentTask(`Gerando variação ${i + 1}/${config.variations} - ${dimensions}...`);
            
            try {
              const { data, error } = await supabase.functions.invoke('gerar-criativo', {
                body: {
                  imageBase64: base64Image,
                  headline: config.headline,
                  body: config.body,
                  cta: config.cta,
                  notes: config.notes,
                  dimensions,
                  protectFaces: config.protectFaces,
                  variationIndex: i,
                },
              });

              if (error) throw error;

              if (data?.imageUrl) {
                allCreatives.push({
                  id: `${image.name}-${format}-${i}`,
                  imageUrl: data.imageUrl,
                  format: dimensions,
                  variation: i + 1,
                  originalImage: image.name,
                });
              }
            } catch (err) {
              console.error('Erro ao gerar criativo:', err);
            }
            
            completedTasks++;
            setProgress((completedTasks / totalTasks) * 100);
          }
        }
      }

      if (allCreatives.length > 0) {
        setStatus("success");
        setCurrentTask(`${allCreatives.length} criativos gerados com sucesso!`);
        setTimeout(() => {
          onGenerationComplete(allCreatives);
        }, 1500);
      } else {
        throw new Error("Nenhum criativo foi gerado");
      }
    } catch (error: any) {
      console.error('Erro na geração:', error);
      setStatus("error");
      setErrorMessage(error.message || "Erro ao gerar criativos");
      toast.error("Erro ao gerar criativos");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Gerando Criativos</h2>
        <p className="text-muted-foreground">
          Aguarde enquanto criamos seus criativos...
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {status === "generating" && (
            <div className="p-6 rounded-full bg-primary/10">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="p-6 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          )}
          {status === "error" && (
            <div className="p-6 rounded-full bg-destructive/10">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          )}
        </div>

        {/* Progress */}
        {status === "generating" && (
          <div className="space-y-3">
            <Progress value={progress} className="h-3" />
            <p className="text-center text-sm text-muted-foreground">
              {currentTask}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              {Math.round(progress)}% concluído
            </p>
          </div>
        )}

        {/* Success Message */}
        {status === "success" && (
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-green-600">
              Criativos gerados com sucesso!
            </p>
            <p className="text-sm text-muted-foreground">
              {currentTask}
            </p>
          </div>
        )}

        {/* Error Message */}
        {status === "error" && (
          <div className="text-center space-y-4">
            <p className="text-lg font-medium text-destructive">
              Erro na geração
            </p>
            <p className="text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <Button onClick={generateCreatives} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>

      {/* Back Button */}
      {(status === "error" || status === "idle") && (
        <div className="flex justify-start">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
};
