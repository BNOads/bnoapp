import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useClientMetaSettings, DEFAULT_METRICS } from "@/hooks/useClientMetaSettings";
import { useToast } from "@/hooks/use-toast";

interface ClienteMetricsConfigSectionProps {
  clienteId: string;
  isAdmin: boolean;
}

export const ClienteMetricsConfigSection = ({ clienteId, isAdmin }: ClienteMetricsConfigSectionProps) => {
  const {
    settings,
    isLoading,
    isMetricVisible,
    customMetrics,
    toggleMetric,
    addCustomMetric,
    removeCustomMetric,
    isSaving,
  } = useClientMetaSettings(clienteId);
  const { toast } = useToast();

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customEvent, setCustomEvent] = useState("");
  const [customType, setCustomType] = useState("number");

  const handleToggle = async (metricName: string, checked: boolean) => {
    if (!isAdmin) return;
    try {
      await toggleMetric({ metricName, isVisible: checked });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleAddCustom = async () => {
    if (!customLabel.trim() || !customEvent.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome e evento.", variant: "destructive" });
      return;
    }

    try {
      await addCustomMetric({
        metricLabel: customLabel,
        metricEvent: customEvent,
        metricType: customType,
      });
      toast({ title: "Métrica adicionada!", description: `"${customLabel}" foi adicionada ao painel.` });
      setCustomLabel("");
      setCustomEvent("");
      setCustomType("number");
      setShowAddCustom(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveCustom = async (settingId: string) => {
    try {
      await removeCustomMetric(settingId);
      toast({ title: "Métrica removida" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Configuração do Painel de Métricas</Label>
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Configuração do Painel de Métricas</Label>
      <p className="text-xs text-muted-foreground">
        Selecione as métricas que serão exibidas no painel do cliente.
        {settings.length === 0 && " (Todas visíveis por padrão)"}
      </p>

      <div className="border rounded-lg p-3 space-y-3">
        {/* Default metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEFAULT_METRICS.map((metric) => (
            <label
              key={metric.name}
              className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={isMetricVisible(metric.name)}
                onCheckedChange={(checked) => handleToggle(metric.name, checked as boolean)}
                disabled={!isAdmin || isSaving}
              />
              <span>{metric.label}</span>
            </label>
          ))}
        </div>

        {/* Custom metrics */}
        {customMetrics.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Métricas Personalizadas</p>
            {customMetrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={metric.is_visible}
                    onCheckedChange={(checked) => handleToggle(metric.metric_name, checked as boolean)}
                    disabled={!isAdmin || isSaving}
                  />
                  <div>
                    <span className="font-medium">{metric.metric_label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({metric.metric_event})</span>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500"
                    onClick={() => handleRemoveCustom(metric.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add custom metric */}
        {isAdmin && (
          <div className="border-t pt-3">
            {showAddCustom ? (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome exibido</Label>
                    <Input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Ex: Livros vendidos"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Evento da API</Label>
                    <Input
                      value={customEvent}
                      onChange={(e) => setCustomEvent(e.target.value)}
                      placeholder="Ex: purchase_book"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={customType} onValueChange={setCustomType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Quantidade</SelectItem>
                      <SelectItem value="currency">Valor monetário</SelectItem>
                      <SelectItem value="percentage">Percentual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddCustom} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Salvar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCustom(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCustom(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Métrica Personalizada
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
