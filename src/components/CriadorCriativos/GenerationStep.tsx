import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { CreativeConfig } from "./CriadorCriativosView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerationStepProps {
  config: CreativeConfig;
  headlines: string[];
  onGenerationComplete: (creatives: any[]) => void;
  onBack: () => void;
}

export const GenerationStep = ({
  config,
  headlines,
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
        let base64Image;
        try {
          base64Image = await resizeAndConvertToBase64(image);
        } catch (err: any) {
          console.error('Erro ao processar imagem:', err);
          errors.push(`${image.name}: ${err.message}`);
          toast.error(`Erro ao processar ${image.name}: ${err.message}`);
          continue; // Pular esta imagem
        }
        
        // Gerar para cada formato
        for (const format of Object.keys(config.formats)) {
          if (!config.formats[format as keyof typeof config.formats]) continue;
          
          const dimensions = format === "feed1080" ? "1080x1080" : "1080x1920";
          
          // Gerar variações SEQUENCIALMENTE (uma de cada vez)
          for (let i = 0; i < config.variations; i++) {
            const currentHeadline = headlines[i] || config.headline;
            const taskLabel = `${dimensions} - ${image.name} - Variação ${i + 1}/${config.variations}`;
            setCurrentTask(`Gerando ${taskLabel}...`);
            
            try {
              console.log(`🎨 Iniciando geração: ${taskLabel}`);
              const startTime = Date.now();

              const { data, error } = await supabase.functions.invoke('gerar-criativo', {
                body: {
                  imageBase64: base64Image,
                  headline: currentHeadline,
                  body: config.body,
                  cta: config.cta,
                  notes: config.notes,
                  dimensions,
                  protectFaces: config.protectFaces,
                  variationIndex: i,
                },
              });

              const duration = Date.now() - startTime;
              console.log(`✅ Gerado em ${duration}ms: ${taskLabel}`);

              if (error) {
                console.error('❌ Erro na API:', error);
                errors.push(`${taskLabel}: ${error.message}`);
              } else if (data?.imageUrl) {
                allCreatives.push({
                  id: `${image.name}-${format}-${i}`,
                  imageUrl: data.imageUrl,
                  format: dimensions,
                  variation: i + 1,
                  originalImage: image.name,
                  headline: currentHeadline,
                });
              } else if (data?.error) {
                console.error('❌ Erro retornado:', data.error);
                errors.push(`${taskLabel}: ${data.error}`);
              }

              // Delay de 1 segundo entre requisições para evitar sobrecarga
              if (completedTasks < totalTasks - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (err: any) {
              console.error('❌ Erro ao gerar criativo:', err);
              const errorMsg = err.message || 'Erro desconhecido';
              errors.push(`${taskLabel}: ${errorMsg}`);
              toast.error(`Falha: ${taskLabel}`);
            }
            
            completedTasks++;
            setProgress((completedTasks / totalTasks) * 100);
          }
        }
      }

      if (allCreatives.length > 0) {
        setStatus("success");
        const successCount = allCreatives.length;
        const totalAttempts = totalTasks;
        const errorInfo = errors.length > 0 ? ` (${errors.length}/${totalAttempts} falharam)` : '';
        setCurrentTask(`${successCount} criativos gerados com sucesso${errorInfo}!`);
        
        if (errors.length > 0) {
          console.warn('❌ Erros durante geração:', errors);
          toast.warning(`${successCount} criativos gerados. ${errors.length} falharam - verifique o console para detalhes.`);
        } else {
          toast.success(`Todos os ${successCount} criativos foram gerados com sucesso!`);
        }
        
        setTimeout(() => {
          onGenerationComplete(allCreatives);
        }, 1500);
      } else {
        const errorSummary = errors.length > 0 ? errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : '') : 'Erro desconhecido';
        const fullError = `Nenhum criativo foi gerado. Primeiros erros: ${errorSummary}`;
        console.error('❌ Falha completa na geração:', errors);
        throw new Error(fullError);
      }
    } catch (error: any) {
      console.error('❌ Erro crítico na geração:', error);
      setStatus("error");
      const errorMsg = error.message || "Erro desconhecido ao gerar criativos";
      setErrorMessage(errorMsg);
      toast.error("Falha na geração: " + errorMsg);
    }
  };

  const resizeAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log(`📥 Processando imagem: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
      
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

        // Redimensionar EXTREMAMENTE (max 250px para garantir tamanho mínimo)
        let width = img.width;
        let height = img.height;
        const maxSize = 250; // Reduzido para 250px para garantir payload pequeno

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

        // Converter para JPEG com qualidade MÍNIMA (0.2)
        let base64 = canvas.toDataURL('image/jpeg', 0.2);
        
        // Validar tamanho final (max 150KB em base64)
        const sizeInKB = (base64.length * 3) / 4 / 1024;
        console.log(`📊 Imagem redimensionada: ${width}x${height}, ${sizeInKB.toFixed(2)}KB`);
        
        // Se ainda estiver muito grande, reduzir qualidade ao mínimo absoluto
        if (sizeInKB > 150) {
          console.warn('⚠️ Imagem ainda grande, usando qualidade mínima (0.1)...');
          base64 = canvas.toDataURL('image/jpeg', 0.1);
        }
        
        const finalSizeInKB = (base64.length * 3) / 4 / 1024;
        console.log(`✅ Tamanho final da base64: ${finalSizeInKB.toFixed(2)}KB`);
        
        if (finalSizeInKB > 200) {
          const errorMsg = `Imagem muito grande (${finalSizeInKB.toFixed(0)}KB). Use uma imagem mais simples ou menor.`;
          console.error(`❌ ${errorMsg}`);
          reject(new Error(errorMsg));
          return;
        }
        
        console.log(`✅ Imagem "${file.name}" processada com sucesso`);
        resolve(base64);
      };

      img.onerror = () => {
        console.error(`❌ Erro ao carregar imagem: ${file.name}`);
        reject(new Error('Erro ao carregar imagem'));
      };
      
      reader.onerror = () => {
        console.error(`❌ Erro ao ler arquivo: ${file.name}`);
        reject(new Error('Erro ao ler arquivo'));
      };
      
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
