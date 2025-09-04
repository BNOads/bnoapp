import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditarColaboradorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: any;
  onSuccess: () => void;
}

export const EditarColaboradorModal = ({ open, onOpenChange, colaborador, onSuccess }: EditarColaboradorModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    data_nascimento: "",
    estado_civil: "",
    tamanho_camisa: "",
    nivel_acesso: "cs",
    data_admissao: "",
  });

  useEffect(() => {
    if (colaborador) {
      setFormData({
        nome: colaborador.nome || "",
        email: colaborador.email || "",
        data_nascimento: colaborador.data_nascimento || "",
        estado_civil: colaborador.estado_civil || "",
        tamanho_camisa: colaborador.tamanho_camisa || "",
        nivel_acesso: colaborador.nivel_acesso || "cs",
        data_admissao: colaborador.data_admissao || "",
      });
    }
  }, [colaborador]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({
          nome: formData.nome,
          email: formData.email,
          data_nascimento: formData.data_nascimento || null,
          estado_civil: (formData.estado_civil as any) || null,
          tamanho_camisa: formData.tamanho_camisa || null,
          nivel_acesso: (formData.nivel_acesso as any),
          data_admissao: formData.data_admissao || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', colaborador.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Colaborador atualizado!",
        description: `${formData.nome} foi atualizado com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar colaborador:', error);
      toast({
        title: "Erro ao atualizar colaborador",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Colaborador</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Nome completo"
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

            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleInputChange("data_nascimento", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_admissao">Data de Admissão</Label>
              <Input
                id="data_admissao"
                type="date"
                value={formData.data_admissao}
                onChange={(e) => handleInputChange("data_admissao", e.target.value)}
              />
            </div>

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
                  <SelectItem value="XGG">XGG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nivel_acesso">Nível de Acesso</Label>
              <Select 
                value={formData.nivel_acesso} 
                onValueChange={(value) => handleInputChange("nivel_acesso", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível de acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs">Customer Success</SelectItem>
                  <SelectItem value="gestor_trafego">Gestor de Tráfego</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
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
              {loading ? "Atualizando..." : "Atualizar Colaborador"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};