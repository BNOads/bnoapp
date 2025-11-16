import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClickUpConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved: () => void;
}

export function ClickUpConfigModal({ open, onOpenChange, onConfigSaved }: ClickUpConfigModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!apiKey.trim() || !teamId.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha a API Key e o Team ID",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se já existe configuração
      const { data: existingConfig } = await supabase
        .from("clickup_config")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingConfig) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from("clickup_config")
          .update({
            clickup_api_key: apiKey.trim(),
            clickup_team_id: teamId.trim(),
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from("clickup_config")
          .insert({
            user_id: user.id,
            clickup_api_key: apiKey.trim(),
            clickup_team_id: teamId.trim(),
          });

        if (error) throw error;
      }

      toast({
        title: "Configuração salva!",
        description: "Sua integração com o ClickUp foi configurada com sucesso",
      });

      onConfigSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Integração ClickUp</DialogTitle>
          <DialogDescription>
            Configure sua API Key do ClickUp para visualizar suas tarefas no BNOapp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key do ClickUp *
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="pk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <a
                href="https://app.clickup.com/settings/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                Obter API Key no ClickUp <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamId">
              Team ID *
            </Label>
            <Input
              id="teamId"
              placeholder="90140307863"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Encontre o Team ID nas configurações do seu workspace ClickUp
            </p>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Como obter suas credenciais:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Acesse as configurações do ClickUp</li>
              <li>Vá em "Apps" → "API Token"</li>
              <li>Gere um novo token</li>
              <li>O Team ID está na URL do seu workspace</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
