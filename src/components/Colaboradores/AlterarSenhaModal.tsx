import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface AlterarSenhaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: any;
  onSuccess: () => void;
}

export const AlterarSenhaModal = ({ open, onOpenChange, colaborador, onSuccess }: AlterarSenhaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    nova_senha: "",
    confirmar_senha: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.nova_senha !== formData.confirmar_senha) {
      toast({
        title: "Erro",
        description: "As senhas não conferem",
        variant: "destructive",
      });
      return;
    }

    if (formData.nova_senha.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('alterar-senha-colaborador', {
        body: {
          user_id: colaborador.user_id,
          email: colaborador.email,
          nova_senha: formData.nova_senha,
        }
      });

      if (error) {
        console.error('Erro da função:', error);
        throw new Error(error.message || 'Erro ao comunicar com o servidor');
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Erro ao alterar senha');
      }

      toast({
        title: "Senha alterada!",
        description: `A senha de ${colaborador.nome} foi alterada com sucesso.`,
      });

      setFormData({ nova_senha: "", confirmar_senha: "" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Colaborador:</strong> {colaborador?.nome}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Email:</strong> {colaborador?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova_senha">Nova Senha *</Label>
            <div className="relative">
              <Input
                id="nova_senha"
                type={showPassword ? "text" : "password"}
                value={formData.nova_senha}
                onChange={(e) => handleInputChange("nova_senha", e.target.value)}
                placeholder="Digite a nova senha"
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar_senha">Confirmar Nova Senha *</Label>
            <div className="relative">
              <Input
                id="confirmar_senha"
                type={showPassword ? "text" : "password"}
                value={formData.confirmar_senha}
                onChange={(e) => handleInputChange("confirmar_senha", e.target.value)}
                placeholder="Confirme a nova senha"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};