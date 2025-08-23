import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface NovoColaboradorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const NovoColaboradorModal = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: NovoColaboradorModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    nivel_acesso: "cs" as const,
    data_nascimento: "",
    estado_civil: "",
    tamanho_camisa: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Primeiro, criar conta de usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: "temp123456", // Senha temporária
        options: {
          data: {
            nome: formData.nome
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Criar registro na tabela colaboradores
        const colaboradorData: any = {
          user_id: authData.user.id,
          nome: formData.nome,
          email: formData.email,
          nivel_acesso: formData.nivel_acesso,
        };

        if (formData.data_nascimento) {
          colaboradorData.data_nascimento = formData.data_nascimento;
        }
        if (formData.estado_civil) {
          colaboradorData.estado_civil = formData.estado_civil;
        }
        if (formData.tamanho_camisa) {
          colaboradorData.tamanho_camisa = formData.tamanho_camisa;
        }

        const { error: colaboradorError } = await supabase
          .from('colaboradores')
          .insert(colaboradorData);

        if (colaboradorError) {
          throw colaboradorError;
        }

        toast({
          title: "Colaborador criado com sucesso!",
          description: `${formData.nome} foi adicionado à equipe.`,
        });

        // Reset form
        setFormData({
          nome: "",
          email: "",
          nivel_acesso: "cs",
          data_nascimento: "",
          estado_civil: "",
          tamanho_camisa: "",
        });

        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Erro ao criar colaborador:', error);
      toast({
        title: "Erro ao criar colaborador",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Colaborador</DialogTitle>
          <DialogDescription>
            Adicione um novo membro à equipe BNOads
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Digite o nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nivel_acesso">Nível de Acesso</Label>
              <Select
                value={formData.nivel_acesso}
                onValueChange={(value) => handleInputChange("nivel_acesso", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs">CS (Customer Success)</SelectItem>
                  <SelectItem value="gestor_trafego">Gestor de Tráfego</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleInputChange("data_nascimento", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado_civil">Estado Civil</Label>
              <Select
                value={formData.estado_civil}
                onValueChange={(value) => handleInputChange("estado_civil", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                  <SelectItem value="casado">Casado(a)</SelectItem>
                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  <SelectItem value="uniao_estavel">União Estável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tamanho_camisa">Tamanho da Camisa</Label>
              <Select
                value={formData.tamanho_camisa}
                onValueChange={(value) => handleInputChange("tamanho_camisa", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PP">PP</SelectItem>
                  <SelectItem value="P">P</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                  <SelectItem value="GG">GG</SelectItem>
                  <SelectItem value="XG">XG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
                  Criando...
                </>
              ) : (
                "Criar Colaborador"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};