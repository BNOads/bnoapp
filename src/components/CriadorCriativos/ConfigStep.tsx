import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Square, Wand2, Shield, Sparkles } from "lucide-react";
import { CreativeConfig } from "./CriadorCriativosView";

interface ConfigStepProps {
  formats: CreativeConfig["formats"];
  variations: number;
  useAI: boolean;
  protectFaces: boolean;
  varyHeadlines: boolean;
  onUpdate: (updates: Partial<CreativeConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ConfigStep = ({
  formats,
  variations,
  useAI,
  protectFaces,
  varyHeadlines,
  onUpdate,
  onNext,
  onBack,
}: ConfigStepProps) => {
  const canProceed = formats.feed1080 || formats.story1920;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Configurações de Saída</h2>
        <p className="text-muted-foreground">
          Escolha os formatos e opções de geração
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Formatos */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold mb-4">Formatos de Saída</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Square className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor="feed1080" className="font-medium">
                    Feed 1080x1080
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Formato quadrado para feed
                  </p>
                </div>
              </div>
              <Switch
                id="feed1080"
                checked={formats.feed1080}
                onCheckedChange={(checked) =>
                  onUpdate({ formats: { ...formats, feed1080: checked } })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <Label htmlFor="story1920" className="font-medium">
                    Story 1080x1920
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Formato vertical para stories
                  </p>
                </div>
              </div>
              <Switch
                id="story1920"
                checked={formats.story1920}
                onCheckedChange={(checked) =>
                  onUpdate({ formats: { ...formats, story1920: checked } })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* IA Options */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold mb-4">Opções de IA</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <Label htmlFor="useAI" className="font-medium">
                    Criar variações com IA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Gera múltiplas variações automaticamente
                  </p>
                </div>
              </div>
              <Switch
                id="useAI"
                checked={useAI}
                onCheckedChange={(checked) => onUpdate({ useAI: checked })}
              />
            </div>

            {useAI && (
              <div className="space-y-2 pl-11">
                <Label>
                  Quantidade de variações: {variations}
                </Label>
                <Slider
                  value={[variations]}
                  onValueChange={([value]) => onUpdate({ variations: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Serão gerados {variations} {variations === 1 ? 'criativo' : 'criativos'} por imagem e formato
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <Label htmlFor="protectFaces" className="font-medium">
                    Proteger rostos
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Evita cobrir rostos com texto
                  </p>
                </div>
              </div>
              <Switch
                id="protectFaces"
                checked={protectFaces}
                onCheckedChange={(checked) => onUpdate({ protectFaces: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Sparkles className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <Label htmlFor="varyHeadlines" className="font-medium">
                    Variar headlines com IA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Gera variações criativas da headline original
                  </p>
                </div>
              </div>
              <Switch
                id="varyHeadlines"
                checked={varyHeadlines}
                onCheckedChange={(checked) => onUpdate({ varyHeadlines: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Resumo da Geração</h3>
            <div className="space-y-2 text-sm">
              <p>
                • <strong>Formatos:</strong>{" "}
                {[formats.feed1080 && "Feed 1080x1080", formats.story1920 && "Story 1080x1920"]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>
                • <strong>Variações:</strong> {variations} por formato
              </p>
              <p>
                • <strong>IA:</strong> {useAI ? "Ativada" : "Desativada"}
              </p>
              <p>
                • <strong>Proteção de rostos:</strong> {protectFaces ? "Sim" : "Não"}
              </p>
              <p>
                • <strong>Variar headlines:</strong> {varyHeadlines ? "Sim" : "Não"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Gerar Criativos
        </Button>
      </div>
    </div>
  );
};
