import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreativeConfig } from "./CriadorCriativosView";

interface TextsStepProps {
  headline: string;
  body: string;
  cta: string;
  notes: string;
  onUpdate: (updates: Partial<CreativeConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const TextsStep = ({
  headline,
  body,
  cta,
  notes,
  onUpdate,
  onNext,
  onBack,
}: TextsStepProps) => {
  const canProceed = headline.trim() !== "" && body.trim() !== "" && cta.trim() !== "";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Textos do Criativo</h2>
        <p className="text-muted-foreground">
          Defina a chamada, corpo e CTA dos seus criativos
        </p>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Headline */}
        <div className="space-y-2">
          <Label htmlFor="headline">
            Chamada (Headline) *
            <span className="text-xs text-muted-foreground ml-2">
              {headline.length}/120
            </span>
          </Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => {
              if (e.target.value.length <= 120) {
                onUpdate({ headline: e.target.value });
              }
            }}
            placeholder="Ex: Transforme seus resultados em 30 dias"
            maxLength={120}
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label htmlFor="body">
            Corpo (Body) *
            <span className="text-xs text-muted-foreground ml-2">
              {body.length}/200
            </span>
          </Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => {
              if (e.target.value.length <= 200) {
                onUpdate({ body: e.target.value });
              }
            }}
            placeholder="Ex: Descubra o método comprovado que já ajudou mais de 1000 pessoas"
            maxLength={200}
            rows={3}
          />
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <Label htmlFor="cta">
            CTA (Chamada para Ação) *
            <span className="text-xs text-muted-foreground ml-2">
              {cta.length}/30
            </span>
          </Label>
          <Input
            id="cta"
            value={cta}
            onChange={(e) => {
              if (e.target.value.length <= 30) {
                onUpdate({ cta: e.target.value });
              }
            }}
            placeholder="Ex: Começar Agora"
            maxLength={30}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">
            Observações para o Gerador (Opcional)
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Ex: Usar tons quentes, evitar fundo branco, estilo moderno..."
            rows={2}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Próximo
        </Button>
      </div>
    </div>
  );
};
