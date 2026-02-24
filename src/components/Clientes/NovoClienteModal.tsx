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
import { useAuth } from "@/components/Auth/AuthContext";
import { Loader2 } from "lucide-react";

interface NovoClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const INITIAL_FORM = {
  nome: "",
  descricao_breve: "",
  categoria: "negocio_local" as string,
  serie: "" as string,
  investimento_mensal: "",
  promessas_cliente: "",
  whatsapp_cliente: "",
  instagram_cliente: "",
  localizacao: "Brasil",
  prometeu_pagina: "" as string,
  etapa_atual: "prospecção",
  pasta_drive_url: "",
  link_painel: "",
};

export const NovoClienteModal = ({
  open,
  onOpenChange,
  onSuccess
}: NovoClienteModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const linkPainel = formData.link_painel ||
        `https://bnoapp.lovable.app/painel/${formData.nome.toLowerCase().replace(/\s+/g, '-')}`;

      const { data: novoCliente, error } = await supabase
        .from('clientes')
        .insert({
          nome: formData.nome,
          descricao_breve: formData.descricao_breve || null,
          categoria: formData.categoria,
          serie: formData.serie || null,
          investimento_mensal: formData.investimento_mensal || null,
          promessas_cliente: formData.promessas_cliente || null,
          whatsapp_cliente: formData.whatsapp_cliente || null,
          instagram_cliente: formData.instagram_cliente || null,
          localizacao: formData.localizacao || 'Brasil',
          prometeu_pagina: formData.prometeu_pagina || null,
          etapa_atual: formData.etapa_atual || null,
          pasta_drive_url: formData.pasta_drive_url || null,
          link_painel: linkPainel,
          created_by: user?.id,
        } as any)
        .select()
        .single();

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

      // Execute Automations
      try {
        await supabase.functions.invoke('evaluate-automations', {
          body: {
            trigger_type: 'new_client',
            data: { cliente: novoCliente, user_id: user?.id }
          }
        });
      } catch (autoErr) {
        console.error("Erro ao avaliar automações", autoErr);
      }

      // Disparar webhook após criação bem-sucedida
      try {
        const webhookData = {
          evento: 'cliente_criado',
          cliente: {
            nome: formData.nome,
            categoria: formData.categoria,
            serie: formData.serie,
            investimento_mensal: formData.investimento_mensal,
            promessas_cliente: formData.promessas_cliente,
            whatsapp_cliente: formData.whatsapp_cliente,
            instagram_cliente: formData.instagram_cliente,
            localizacao: formData.localizacao,
            prometeu_pagina: formData.prometeu_pagina,
            etapa_atual: formData.etapa_atual,
            link_painel: linkPainel,
          },
          timestamp: new Date().toISOString(),
          created_by: user?.id,
        };

        const response = await fetch('https://automacao.bnoads.com.br/webhook-test/1c055879-2702-4588-b8bf-b22d18d7511e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData),
        });

        if (!response.ok) {
          console.error('Webhook falhou:', response.status, response.statusText);
        }
      } catch (webhookError) {
        console.error('Erro ao disparar webhook:', webhookError);
      }

      toast({
        title: "Cliente criado com sucesso!",
        description: `${formData.nome} foi adicionado aos painéis.`,
      });

      setFormData(INITIAL_FORM);
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
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              BNO
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">BNOads | Formulário de novo cliente</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Olá, Closer! Tudo certo?</p>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Estamos imensamente felizes que você conseguiu fechar mais um projeto para nossa empresa. Para que possamos realizar o melhor onboarding para esse cliente, preciso que você preencha este formulário com <strong>MUITA ATENÇÃO</strong>, ok?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Row 1: Nome + Descrição breve */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="font-semibold text-sm">
                Nomenclatura do cliente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Inserir texto"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao_breve" className="font-semibold text-sm">
                Me dê mais detalhes sobre este cliente, de forma breve. <span className="text-red-500">*</span>
              </Label>
              <Input
                id="descricao_breve"
                value={formData.descricao_breve}
                onChange={(e) => handleInputChange("descricao_breve", e.target.value)}
                placeholder="Inserir texto"
                required
              />
            </div>
          </div>

          {/* Row 2: Tipo de cliente + Classificação de série */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoria" className="font-semibold text-sm">
                Tipo de cliente <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => handleInputChange("categoria", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar opção..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negocio_local">Negócio Local</SelectItem>
                  <SelectItem value="infoproduto">Infoproduto</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serie" className="font-semibold text-sm">
                Classificação de série <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.serie}
                onValueChange={(value) => handleInputChange("serie", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar opção..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Serie A">Serie A</SelectItem>
                  <SelectItem value="Serie B">Serie B</SelectItem>
                  <SelectItem value="Serie C">Serie C</SelectItem>
                  <SelectItem value="Serie D">Serie D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Investimento Mensal + Promessas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="investimento_mensal" className="font-semibold text-sm">
                Investimento Mensal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="investimento_mensal"
                value={formData.investimento_mensal}
                onChange={(e) => handleInputChange("investimento_mensal", e.target.value)}
                placeholder="Inserir moeda"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promessas_cliente" className="font-semibold text-sm">
                Promessas realizadas para o cliente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="promessas_cliente"
                value={formData.promessas_cliente}
                onChange={(e) => handleInputChange("promessas_cliente", e.target.value)}
                placeholder="Inserir texto"
                required
              />
            </div>
          </div>

          {/* Row 4: WhatsApp + Instagram */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp_cliente" className="font-semibold text-sm">
                Whatsapp do cliente <span className="text-red-500">*</span>
              </Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm select-none">
                  🇧🇷
                </div>
                <Input
                  id="whatsapp_cliente"
                  value={formData.whatsapp_cliente}
                  onChange={(e) => handleInputChange("whatsapp_cliente", e.target.value)}
                  placeholder="Inserir telefone"
                  className="rounded-l-none"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram_cliente" className="font-semibold text-sm">
                Instagram do cliente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="instagram_cliente"
                value={formData.instagram_cliente}
                onChange={(e) => handleInputChange("instagram_cliente", e.target.value)}
                placeholder="Inserir URL"
                required
              />
            </div>
          </div>

          {/* Row 5: Localização + Prometeu página */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="localizacao" className="font-semibold text-sm">
                Localização <span className="text-red-500">*</span>
              </Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) => handleInputChange("localizacao", e.target.value)}
                placeholder="Brasil"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prometeu_pagina" className="font-semibold text-sm">
                Prometeu página? <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.prometeu_pagina}
                onValueChange={(value) => handleInputChange("prometeu_pagina", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar opção..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
