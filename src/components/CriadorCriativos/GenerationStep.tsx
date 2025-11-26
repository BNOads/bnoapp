import { useEffect, useState, useRef } from "react";
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

interface ProcessedImage {
  file: File;
  base64: string;
  name: string;
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
  const hasStarted = useRef(false);
  const isGenerating = useRef(false);

  useEffect(() => {
    // Prevenir execução dupla (React StrictMode em desenvolvimento)
    if (hasStarted.current) {
      console.log('⏭️ Geração já iniciada, ignorando execução duplicada');
      return;
    }
    
    hasStarted.current = true;
    generateCreatives();
  }, []);

  const generateCreatives = async () => {
    // Prevenir execução múltipla simultânea
    if (isGenerating.current) {
      console.log('⏭️ Geração já em andamento, ignorando chamada duplicada');
      return;
    }
    
    isGenerating.current = true;
    setStatus("generating");
    setProgress(0);
    
    try {
      // ETAPA 1: PRÉ-PROCESSAR TODAS AS IMAGENS
      console.log('📸 ETAPA 1: Pré-processando todas as imagens...');
      setCurrentTask('Preparando imagens...');
      
      const processedImages: ProcessedImage[] = [];
      
      for (const image of config.images) {
        setCurrentTask(`Processando ${image.name}...`);
        try {
          const base64 = await resizeAndConvertToBase64(image);
          processedImages.push({
            file: image,
            base64,
            name: image.name,
          });
          console.log(`✅ Imagem processada: ${image.name}`);
        } catch (err: any) {
          console.error(`❌ Erro ao processar ${image.name}:`, err);
          toast.error(`Erro ao processar ${image.name}: ${err.message}`);
          // Continuar com as outras imagens
        }
      }
      
      if (processedImages.length === 0) {
        throw new Error('Nenhuma imagem pôde ser processada');
      }
      
      console.log(`✅ ${processedImages.length}/${config.images.length} imagens processadas`);
      
      // ETAPA 2: CALCULAR TAREFAS E GERAR CRIATIVOS SEQUENCIALMENTE
      console.log('🎨 ETAPA 2: Iniciando geração de criativos...');
      
      const totalFormats = (config.formats.feed1080 ? 1 : 0) + (config.formats.story1920 ? 1 : 0);
      const totalTasks = processedImages.length * totalFormats * config.variations;
      let completedTasks = 0;

      const allCreatives: any[] = [];
      const errors: string[] = [];

      // Gerar criativos de forma COMPLETAMENTE SEQUENCIAL
      for (const processedImage of processedImages) {
        for (const format of Object.keys(config.formats)) {
          if (!config.formats[format as keyof typeof config.formats]) continue;
          
          const dimensions = format === "feed1080" ? "1080x1080" : "1080x1920";
          
          for (let i = 0; i < config.variations; i++) {
            const currentHeadline = headlines[i] || config.headline;
            const taskLabel = `${dimensions} - ${processedImage.name} - Variação ${i + 1}/${config.variations}`;
            setCurrentTask(`Gerando ${taskLabel}...`);
            
            let retries = 0;
            const maxRetries = 2;
            let success = false;
            
            // Tentar gerar com retry
            while (retries <= maxRetries && !success) {
              try {
                const attemptLabel = retries > 0 ? ` (tentativa ${retries + 1}/${maxRetries + 1})` : '';
                console.log(`🎨 Gerando: ${taskLabel}${attemptLabel}`);
                const startTime = Date.now();

                // Timeout de 60 segundos para cada requisição
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Timeout ao gerar criativo (60s)')), 60000);
                });

                const generationPromise = supabase.functions.invoke('gerar-criativo', {
                  body: {
                    imageBase64: processedImage.base64,
                    headline: currentHeadline,
                    body: config.body,
                    cta: config.cta,
                    notes: config.notes,
                    dimensions,
                    protectFaces: config.protectFaces,
                    variationIndex: i,
                  },
                });

                const { data, error } = await Promise.race([
                  generationPromise,
                  timeoutPromise,
                ]) as any;

                const duration = Date.now() - startTime;
                console.log(`⏱️ Requisição levou ${duration}ms`);

                if (error) {
                  throw new Error(error.message || 'Erro na API');
                }
                
                if (data?.imageUrl) {
                  allCreatives.push({
                    id: `${processedImage.name}-${format}-${i}`,
                    imageUrl: data.imageUrl,
                    format: dimensions,
                    variation: i + 1,
                    originalImage: processedImage.name,
                    headline: currentHeadline,
                  });
                  console.log(`✅ Criativo gerado com sucesso em ${duration}ms`);
                  success = true;
                } else if (data?.error) {
                  throw new Error(data.error);
                } else {
                  throw new Error('API não retornou imagem');
                }

              } catch (err: any) {
                retries++;
                const errorMsg = err.message || 'Erro desconhecido';
                console.error(`❌ Erro na geração (tentativa ${retries}/${maxRetries + 1}):`, errorMsg);
                
                if (retries > maxRetries) {
                  errors.push(`${taskLabel}: ${errorMsg}`);
                  toast.error(`Falha após ${maxRetries + 1} tentativas: ${taskLabel}`);
                } else {
                  console.log(`⏳ Aguardando 3s antes de retry ${retries}...`);
                  await new Promise(resolve => setTimeout(resolve, 3000));
                }
              }
            }
            
            completedTasks++;
            setProgress((completedTasks / totalTasks) * 100);
            
            // Delay de 2 segundos entre cada criativo para evitar sobrecarga
            if (completedTasks < totalTasks) {
              console.log('⏸️ Aguardando 2s antes do próximo criativo...');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      }

      // ETAPA 3: FINALIZAR
      if (allCreatives.length > 0) {
        setStatus("success");
        const successCount = allCreatives.length;
        const errorInfo = errors.length > 0 ? ` (${errors.length} falharam)` : '';
        setCurrentTask(`${successCount} criativos gerados${errorInfo}!`);
        
        if (errors.length > 0) {
          console.warn(`⚠️ Geração finalizada com ${errors.length} erros:`, errors);
          toast.warning(`${successCount} criativos gerados. ${errors.length} falharam.`);
        } else {
          console.log(`🎉 Sucesso total: ${successCount} criativos gerados!`);
          toast.success(`Todos os ${successCount} criativos foram gerados!`);
        }
        
        setTimeout(() => {
          onGenerationComplete(allCreatives);
        }, 1500);
      } else {
        const errorSummary = errors.slice(0, 3).join('; ');
        throw new Error(`Nenhum criativo gerado. Erros: ${errorSummary}`);
      }
      
    } catch (error: any) {
      console.error('❌ Erro crítico:', error);
      setStatus("error");
      setErrorMessage(error.message || "Erro ao gerar criativos");
      toast.error(error.message || "Erro ao gerar criativos");
    } finally {
      isGenerating.current = false;
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

        // Otimização agressiva: max 300px
        let width = img.width;
        let height = img.height;
        const maxSize = 300;

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

        // JPEG com qualidade 0.3
        let base64 = canvas.toDataURL('image/jpeg', 0.3);
        let sizeInKB = (base64.length * 3) / 4 / 1024;
        
        // Se > 150KB, reduzir para 0.15
        if (sizeInKB > 150) {
          base64 = canvas.toDataURL('image/jpeg', 0.15);
          sizeInKB = (base64.length * 3) / 4 / 1024;
        }
        
        // Validação final
        if (sizeInKB > 200) {
          reject(new Error(`Imagem muito grande (${sizeInKB.toFixed(0)}KB). Use uma imagem menor.`));
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
