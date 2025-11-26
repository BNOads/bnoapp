import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Upload, Type, Settings, Wand2, Download } from "lucide-react";
import { UploadStep } from "./UploadStep";
import { TextsStep } from "./TextsStep";
import { ConfigStep } from "./ConfigStep";
import { GenerationStep } from "./GenerationStep";
import { ResultsStep } from "./ResultsStep";

export interface CreativeConfig {
  images: File[];
  headline: string;
  body: string;
  cta: string;
  notes: string;
  formats: {
    feed1080: boolean;
    story1920: boolean;
  };
  variations: number;
  useAI: boolean;
  protectFaces: boolean;
}

interface GeneratedCreative {
  id: string;
  imageUrl: string;
  format: string;
  variation: number;
  originalImage: string;
}

const STEPS = [
  { id: 1, title: "Upload", icon: Upload, description: "Envie suas imagens" },
  { id: 2, title: "Textos", icon: Type, description: "Chamada, corpo e CTA" },
  { id: 3, title: "Configurações", icon: Settings, description: "Formatos e variações" },
  { id: 4, title: "Geração", icon: Wand2, description: "Criando criativos" },
  { id: 5, title: "Resultados", icon: Download, description: "Download dos criativos" },
];

export const CriadorCriativosView = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<CreativeConfig>({
    images: [],
    headline: "",
    body: "",
    cta: "",
    notes: "",
    formats: {
      feed1080: true,
      story1920: true,
    },
    variations: 3,
    useAI: true,
    protectFaces: true,
  });
  const [generatedCreatives, setGeneratedCreatives] = useState<GeneratedCreative[]>([]);

  const updateConfig = (updates: Partial<CreativeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setConfig({
      images: [],
      headline: "",
      body: "",
      cta: "",
      notes: "",
      formats: {
        feed1080: true,
        story1920: true,
      },
      variations: 3,
      useAI: true,
      protectFaces: true,
    });
    setGeneratedCreatives([]);
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Criador de Criativos</h1>
          <p className="text-muted-foreground">
            Gere variações de criativos automaticamente com IA
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? "text-primary" : isCompleted ? "text-green-600" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="hidden sm:block text-xs font-medium">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 1 && (
            <UploadStep
              images={config.images}
              onImagesChange={(images) => updateConfig({ images })}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 2 && (
            <TextsStep
              headline={config.headline}
              body={config.body}
              cta={config.cta}
              notes={config.notes}
              onUpdate={updateConfig}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 3 && (
            <ConfigStep
              formats={config.formats}
              variations={config.variations}
              useAI={config.useAI}
              protectFaces={config.protectFaces}
              onUpdate={updateConfig}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 4 && (
            <GenerationStep
              config={config}
              onGenerationComplete={(creatives) => {
                setGeneratedCreatives(creatives);
                handleNext();
              }}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 5 && (
            <ResultsStep
              creatives={generatedCreatives}
              onReset={handleReset}
            />
          )}
        </CardContent>
      </Card>

      {/* Action Buttons - só mostrar nos steps que precisam */}
      {currentStep !== 4 && currentStep !== 5 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={currentStep === 1}
          >
            Limpar e Refazer
          </Button>
        </div>
      )}
    </div>
  );
};
