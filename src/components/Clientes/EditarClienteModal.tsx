import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFieldOptions } from "@/hooks/useFieldOptions";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { TeamAssignmentModal } from "./TeamAssignmentModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaAdAccountManager } from "@/components/MetaAds/MetaAdAccountManager";



interface EditarClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: any | null;
  onSuccess?: () => void;
}

export const EditarClienteModal = ({ open, onOpenChange, cliente, onSuccess }: EditarClienteModalProps) => {
  const [loading, setLoading] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const { toast } = useToast();
  const { isAdmin } = useUserPermissions();
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'negocio_local' as string,
    nicho: '',
    etapa_atual: '',
    pasta_drive_url: '',
    link_painel: '',
    observacoes: '',
    status_cliente: 'ativo',
    // Informações (onboarding form fields)
    descricao_breve: '',
    serie: '',
    investimento_mensal: '',
    promessas_cliente: '',
    whatsapp_cliente: '',
    instagram_cliente: '',
    localizacao: 'Brasil',
    prometeu_pagina: '',
  });
  const [categories, setCategories] = useState<any[]>([]);

  // Load field options
  const situacaoOptions = useFieldOptions('situacao_cliente');
  const etapaOnboardingOptions = useFieldOptions('etapa_onboarding');
  const etapaTrafegoOptions = useFieldOptions('etapa_trafego');

  useEffect(() => {
    if (cliente && open) {
      setFormData({
        nome: cliente.nome || '',
        categoria: cliente.categoria || 'negocio_local',
        nicho: cliente.nicho || '',
        etapa_atual: cliente.etapa_atual || '',
        pasta_drive_url: cliente.pasta_drive_url || '',
        link_painel: cliente.link_painel || '',
        observacoes: cliente.observacoes || '',
        status_cliente: cliente.status_cliente || 'ativo',
        // Informações
        descricao_breve: cliente.descricao_breve || '',
        serie: cliente.serie || '',
        investimento_mensal: cliente.investimento_mensal || '',
        promessas_cliente: cliente.promessas_cliente || '',
        whatsapp_cliente: cliente.whatsapp_cliente || '',
        instagram_cliente: cliente.instagram_cliente || '',
        localizacao: cliente.localizacao || 'Brasil',
        prometeu_pagina: cliente.prometeu_pagina || '',
      });
      loadTeamMembers();
    }
    if (open) loadCategories();
  }, [cliente, open]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from('client_categories').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erro carregando categorias:', err);
    }
  };

  const loadTeamMembers = async () => {
    if (!cliente?.id) return;

    try {
      const { data, error } = await supabase
        .from('client_roles')
        .select(`
          role,
          is_primary,
          colaboradores (
            user_id,
            nome,
            avatar_url
          )
        `)
        .eq('client_id', cliente.id);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clientes')
        .update(formData)
        .eq('id', cliente.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações do cliente foram atualizadas.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>


        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="informacoes">Informações</TabsTrigger>
              <TabsTrigger value="equipe">Equipe</TabsTrigger>
              <TabsTrigger value="integracoes">Integrações</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Cliente *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Digite o nome do cliente"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => handleInputChange('categoria', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories && categories.length > 0 ? (
                        categories.map(cat => (
                          <SelectItem key={cat.key} value={cat.key}>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 12, height: 12, background: cat.color }} className="rounded" />
                              <span>{cat.label}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="negocio_local">Negócio Local</SelectItem>
                          <SelectItem value="infoproduto">Infoproduto</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nicho">Nicho</Label>
                  <Input
                    id="nicho"
                    value={formData.nicho}
                    onChange={(e) => handleInputChange('nicho', e.target.value)}
                    placeholder="Ex: E-commerce, Saúde, Educação"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="etapa_atual">Etapa Atual</Label>
                  <Select
                    value={formData.etapa_atual}
                    onValueChange={(value) => handleInputChange('etapa_atual', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa" />
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
                <Label htmlFor="status_cliente">Status do Cliente</Label>
                <Select
                  value={formData.status_cliente}
                  onValueChange={(value) => handleInputChange('status_cliente', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pasta_drive_url">Link da Pasta do Google Drive</Label>
                <Input
                  id="pasta_drive_url"
                  value={formData.pasta_drive_url}
                  onChange={(e) => handleInputChange('pasta_drive_url', e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link_painel">Link do Painel</Label>
                <Input
                  id="link_painel"
                  value={formData.link_painel}
                  onChange={(e) => handleInputChange('link_painel', e.target.value)}
                  placeholder="URL do painel personalizado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Observações gerais sobre o cliente"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="informacoes" className="space-y-4 pt-4">
              {/* Row 1: Descrição breve + Série */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao_breve">Detalhes do cliente</Label>
                  <Input
                    id="descricao_breve"
                    value={formData.descricao_breve}
                    onChange={(e) => handleInputChange('descricao_breve', e.target.value)}
                    placeholder="Breve descrição do cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serie">Classificação de série</Label>
                  <Select
                    value={formData.serie}
                    onValueChange={(value) => handleInputChange('serie', value)}
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

              {/* Row 2: Investimento + Promessas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investimento_mensal">Investimento Mensal</Label>
                  <Input
                    id="investimento_mensal"
                    value={formData.investimento_mensal}
                    onChange={(e) => handleInputChange('investimento_mensal', e.target.value)}
                    placeholder="Ex: R$ 3.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promessas_cliente">Promessas realizadas</Label>
                  <Input
                    id="promessas_cliente"
                    value={formData.promessas_cliente}
                    onChange={(e) => handleInputChange('promessas_cliente', e.target.value)}
                    placeholder="Promessas ao cliente"
                  />
                </div>
              </div>

              {/* Row 3: WhatsApp + Instagram */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_cliente">WhatsApp do cliente</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm select-none">
                      🇧🇷
                    </div>
                    <Input
                      id="whatsapp_cliente"
                      value={formData.whatsapp_cliente}
                      onChange={(e) => handleInputChange('whatsapp_cliente', e.target.value)}
                      placeholder="Inserir telefone"
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram_cliente">Instagram do cliente</Label>
                  <Input
                    id="instagram_cliente"
                    value={formData.instagram_cliente}
                    onChange={(e) => handleInputChange('instagram_cliente', e.target.value)}
                    placeholder="URL do Instagram"
                  />
                </div>
              </div>

              {/* Row 4: Localização + Prometeu página */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    value={formData.localizacao}
                    onChange={(e) => handleInputChange('localizacao', e.target.value)}
                    placeholder="Brasil"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prometeu_pagina">Prometeu página?</Label>
                  <Select
                    value={formData.prometeu_pagina}
                    onValueChange={(value) => handleInputChange('prometeu_pagina', value)}
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
            </TabsContent>

            <TabsContent value="equipe" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base">Membros da Equipe</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTeamModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Gerenciar Equipe
                  </Button>
                </div>

                {teamMembers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teamMembers
                      .filter(member => member.role === 'gestor')
                      .map((member, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.colaboradores.avatar_url} />
                            <AvatarFallback>{member.colaboradores.nome.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{member.colaboradores.nome}</span>
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-[10px] h-5">Gestor</Badge>
                              {member.is_primary && (
                                <Badge variant="default" className="text-[10px] h-5">Principal</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                    {teamMembers
                      .filter(member => member.role === 'cs')
                      .map((member, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.colaboradores.avatar_url} />
                            <AvatarFallback>{member.colaboradores.nome.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{member.colaboradores.nome}</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-[10px] h-5">CS</Badge>
                              {member.is_primary && (
                                <Badge variant="default" className="text-[10px] h-5">Principal</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    <p>Nenhuma equipe atribuída a este cliente.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="integracoes" className="space-y-4 pt-4">
              {cliente?.id ? (
                <>
                  <MetaAdAccountManager clientId={cliente.id} />
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Salve o cliente primeiro para gerenciar integrações.
                </div>
              )}
            </TabsContent>


          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <TeamAssignmentModal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        clienteId={cliente?.id || ''}
        clienteNome={cliente?.nome || ''}
        onSuccess={() => {
          loadTeamMembers();
          onSuccess?.();
        }}
      />


    </Dialog>
  );
};
