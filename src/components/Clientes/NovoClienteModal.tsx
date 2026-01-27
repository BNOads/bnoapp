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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { Loader2 } from "lucide-react";

interface NovoClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const NovoClienteModal = ({
  open,
  onOpenChange,
  onSuccess
}: NovoClienteModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "negocio_local" as const,
    nicho: "",
    etapa_atual: "prospecção",
    pasta_drive_url: "",
    link_painel: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Gerar link do painel automaticamente se não fornecido
      const linkPainel = formData.link_painel ||
        `https://bnoapp.lovable.app/painel/${formData.nome.toLowerCase().replace(/\s+/g, '-')}`;

      const { error } = await supabase
        .from('clientes')
        .insert({
          nome: formData.nome,
          categoria: formData.categoria,
          nicho: formData.nicho || null,
          etapa_atual: formData.etapa_atual || null,
          pasta_drive_url: formData.pasta_drive_url || null,
          link_painel: linkPainel,
          created_by: user?.id,
        });

      if (error) {
        throw error;
      }

      // Notify team
      await supabase.from('avisos').insert({
        titulo: "Novo Cliente! 🚀",
        conteudo: `Comemore time! 🚀 Novo cliente no painel: ${formData.nome}`,
        tipo: 'success',
        prioridade: 'normal',
        created_by: user?.id
      });

      // Disparar webhook após criação bem-sucedida
      console.log('Disparando webhook para cliente criado:', formData.nome);
      try {
        const webhookData = {
          evento: 'cliente_criado',
          cliente: {
            nome: formData.nome,
            categoria: formData.categoria,
            nicho: formData.nicho,
            etapa_atual: formData.etapa_atual,
            link_painel: linkPainel,
          },
          timestamp: new Date().toISOString(),
          created_by: user?.id,
        };

        console.log('Dados do webhook:', webhookData);

        const response = await fetch('https://automacao.bnoads.com.br/webhook-test/1c055879-2702-4588-b8bf-b22d18d7511e', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });

        console.log('Resposta do webhook:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`Webhook falhou: ${response.status} ${response.statusText}`);
        }

        console.log('Webhook enviado com sucesso!');
      } catch (webhookError) {
        console.error('Erro ao disparar webhook:', webhookError);
        // Não interrompe o fluxo se o webhook falhar
      }

      toast({
        title: "Cliente criado com sucesso!",
        description: `${formData.nome} foi adicionado aos painéis.`,
      });

      // Reset form
      setFormData({
        nome: "",
        categoria: "negocio_local",
        nicho: "",
        etapa_atual: "prospecção",
        pasta_drive_url: "",
        link_painel: "",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      toast({
        title: "Erro ao criar cliente",
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Painel Cliente</DialogTitle>
          <DialogDescription>
            Crie um novo painel personalizado para o cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Cliente *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Digite o nome do cliente"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => handleInputChange("categoria", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negocio_local">Negócio Local</SelectItem>
                  <SelectItem value="infoproduto">Infoproduto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nicho">Nicho/Segmento</Label>
              <Input
                id="nicho"
                value={formData.nicho}
                onChange={(e) => handleInputChange("nicho", e.target.value)}
                placeholder="Ex: Roupas femininas, Consultoria..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="etapa_atual">Etapa Atual</Label>
              <Select
                value={formData.etapa_atual}
                onValueChange={(value) => handleInputChange("etapa_atual", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecção">Prospecção</SelectItem>
                  <SelectItem value="apresentacao">Apresentação</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="implantacao">Implantação</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausa">Em Pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pasta_drive_url">Link da Pasta no Drive</Label>
            <Input
              id="pasta_drive_url"
              value={formData.pasta_drive_url}
              onChange={(e) => handleInputChange("pasta_drive_url", e.target.value)}
              placeholder="https://drive.google.com/..."
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_painel">Link do Painel (será gerado automaticamente)</Label>
            <Input
              id="link_painel"
              value={formData.link_painel}
              onChange={(e) => handleInputChange("link_painel", e.target.value)}
              placeholder="https://bnoapp.lovable.app/painel/..."
              type="url"
            />
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
                "Criar Painel"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};