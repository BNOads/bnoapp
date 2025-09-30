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
import { Users, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TeamAssignmentModal } from "./TeamAssignmentModal";
import { BrandingConfigModal } from "./BrandingConfigModal";

interface EditarClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: any | null;
  onSuccess?: () => void;
}

export const EditarClienteModal = ({ open, onOpenChange, cliente, onSuccess }: EditarClienteModalProps) => {
  const [loading, setLoading] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'negocio_local' as 'negocio_local' | 'infoproduto',
    nicho: '',
    etapa_atual: '',
    pasta_drive_url: '',
    link_painel: '',
    observacoes: '',
    progresso_etapa: 0,
    status_cliente: 'ativo'
  });

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
        progresso_etapa: cliente.progresso_etapa || 0,
        status_cliente: cliente.status_cliente || 'ativo'
      });
      loadTeamMembers();
    }
  }, [cliente, open]);

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
                  <SelectItem value="negocio_local">Negócio Local</SelectItem>
                  <SelectItem value="infoproduto">Infoproduto</SelectItem>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="progresso_etapa">Progresso (%)</Label>
              <Input
                id="progresso_etapa"
                type="number"
                min="0"
                max="100"
                value={formData.progresso_etapa}
                onChange={(e) => handleInputChange('progresso_etapa', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
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

          {/* Seção de Branding */}
          <div className="space-y-2">
            <Label>Identidade Visual</Label>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Configurar Branding</span>
                  <p className="text-xs text-muted-foreground">Personalize logo, cores e descritivo</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBrandingModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Palette className="h-4 w-4" />
                  Configurar
                </Button>
              </div>
            </div>
          </div>

          {/* Seção de Equipe */}
          <div className="space-y-2">
            <Label>Equipe Atribuída</Label>
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gestores e CS</span>
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
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.colaboradores.avatar_url} />
                          <AvatarFallback>{member.colaboradores.nome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.colaboradores.nome}</span>
                        <Badge variant="secondary" className="text-xs">Gestor</Badge>
                        {member.is_primary && (
                          <Badge variant="default" className="text-xs">Principal</Badge>
                        )}
                      </div>
                    ))}
                  
                  {teamMembers
                    .filter(member => member.role === 'cs')
                    .map((member, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.colaboradores.avatar_url} />
                          <AvatarFallback>{member.colaboradores.nome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.colaboradores.nome}</span>
                        <Badge variant="outline" className="text-xs">CS</Badge>
                        {member.is_primary && (
                          <Badge variant="default" className="text-xs">Principal</Badge>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma equipe atribuída</p>
              )}
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

      <BrandingConfigModal
        open={brandingModalOpen}
        onOpenChange={setBrandingModalOpen}
        cliente={cliente}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
};