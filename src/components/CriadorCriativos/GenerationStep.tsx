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
      const errors: string[] = [];

      for (const image of config.images) {
        setCurrentTask(`Processando ${image.name}...`);
        
        // Redimensionar e converter imagem para base64
        const base64Image = await resizeAndConvertToBase64(image);
        
        // Gerar para cada formato
        for (const format of Object.keys(config.formats)) {
          if (!config.formats[format as keyof typeof config.formats]) continue;
          
          const dimensions = format === "feed1080" ? "1080x1080" : "1080x1920";
          setCurrentTask(`Gerando ${dimensions} - ${image.name}...`);
          
          // Gerar variações
          for (let i = 0; i < config.variations; i++) {
            setCurrentTask(`Gerando variação ${i + 1}/${config.variations} - ${dimensions}...`);
            
            try {
              // Timeout de 60 segundos
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout - A geração está demorando muito')), 60000)
              );

              const generationPromise = supabase.functions.invoke('gerar-criativo', {
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

              const { data, error } = await Promise.race([generationPromise, timeoutPromise]) as any;

              if (error) {
                console.error('Erro na API:', error);
                errors.push(`${dimensions} variação ${i + 1}: ${error.message}`);
                throw error;
              }

              if (data?.imageUrl) {
                allCreatives.push({
                  id: `${image.name}-${format}-${i}`,
                  imageUrl: data.imageUrl,
                  format: dimensions,
                  variation: i + 1,
                  originalImage: image.name,
                });
              } else if (data?.error) {
                errors.push(`${dimensions} variação ${i + 1}: ${data.error}`);
              }
            } catch (err: any) {
              console.error('Erro ao gerar criativo:', err);
              const errorMsg = err.message || 'Erro desconhecido';
              errors.push(`${dimensions} variação ${i + 1}: ${errorMsg}`);
            }
            
            completedTasks++;
            setProgress((completedTasks / totalTasks) * 100);
          }
        }
      }

      if (allCreatives.length > 0) {
        setStatus("success");
        const errorInfo = errors.length > 0 ? ` (${errors.length} falharam)` : '';
        setCurrentTask(`${allCreatives.length} criativos gerados com sucesso${errorInfo}!`);
        
        if (errors.length > 0) {
          toast.error(`Alguns criativos falharam: ${errors.join(', ')}`);
        }
        
        setTimeout(() => {
          onGenerationComplete(allCreatives);
        }, 1500);
      } else {
        const errorDetails = errors.length > 0 ? `: ${errors.join(', ')}` : '';
        throw new Error(`Nenhum criativo foi gerado${errorDetails}`);
      }
    } catch (error: any) {
      console.error('Erro na geração:', error);
      setStatus("error");
      setErrorMessage(error.message || "Erro ao gerar criativos");
      toast.error("Erro ao gerar criativos: " + (error.message || "Erro desconhecido"));
    }
  };

  const resizeAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas não disponível'));
          return;
        }

        // Redimensionar AGRESSIVAMENTE para evitar timeout (max 600px)
        let width = img.width;
        let height = img.height;
        const maxSize = 600; // Reduzido de 1080 para 600

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para JPEG com qualidade MUITO baixa (0.4)
        let base64 = canvas.toDataURL('image/jpeg', 0.4);
        
        // Validar tamanho final (max 500KB em base64)
        const sizeInKB = (base64.length * 3) / 4 / 1024;
        console.log(`📊 Tamanho da imagem processada: ${sizeInKB.toFixed(2)}KB`);
        
        // Se ainda estiver muito grande, reduzir mais
        if (sizeInKB > 500) {
          console.warn('⚠️ Imagem ainda muito grande, reduzindo qualidade...');
          base64 = canvas.toDataURL('image/jpeg', 0.3);
        }
        
        const finalSizeInKB = (base64.length * 3) / 4 / 1024;
        console.log(`✅ Tamanho final: ${finalSizeInKB.toFixed(2)}KB`);
        
        if (finalSizeInKB > 800) {
          reject(new Error(`Imagem muito grande mesmo após otimização (${finalSizeInKB.toFixed(0)}KB). Use uma imagem menor.`));
          return;
        }
        
        resolve(base64);
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
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
