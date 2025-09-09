import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, User, ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { PasswordChangeModal } from "@/components/Auth/PasswordChangeModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ColaboradorData {
  id: string;
  nome: string;
  email: string;
  data_nascimento?: string;
  tamanho_camisa?: string;
  estado_civil?: string;
  avatar_url?: string;
}

export const PerfilColaborador = () => {
  const [colaborador, setColaborador] = useState<ColaboradorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    data_nascimento: '',
    tamanho_camisa: '',
    estado_civil: ''
  });

  useEffect(() => {
    carregarDadosColaborador();
  }, []);

  const carregarDadosColaborador = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      setColaborador(data);
      setFormData({
        nome: data.nome || '',
        email: data.email || '',
        data_nascimento: data.data_nascimento || '',
        tamanho_camisa: data.tamanho_camisa || '',
        estado_civil: data.estado_civil || ''
      });
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Remover avatar anterior se existir
      if (colaborador?.avatar_url) {
        const oldPath = colaborador.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload do novo arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualizar no banco de dados
      const { error: updateError } = await supabase
        .from('colaboradores')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      setColaborador(prev => prev ? { ...prev, avatar_url: publicUrl } : null);

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro ao atualizar foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

        const { error } = await supabase
          .from('colaboradores')
          .update({
            nome: formData.nome,
            email: formData.email,
            data_nascimento: formData.data_nascimento || null,
            tamanho_camisa: formData.tamanho_camisa || null,
            estado_civil: (formData.estado_civil as any) || null
          })
          .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Perfil atualizado!",
        description: "Seus dados foram salvos com sucesso.",
      });

      // Recarregar dados
      await carregarDadosColaborador();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            const from = location.state?.from || '/';
            navigate(from);
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais e foto de perfil
        </p>
      </div>

      {/* Avatar Section */}
      <Card className="p-6 text-center">
        <div className="relative inline-block">
          <Avatar className="w-24 h-24 mx-auto">
            <AvatarImage src={colaborador?.avatar_url} />
            <AvatarFallback className="text-2xl">
              <User className="w-12 h-12" />
            </AvatarFallback>
          </Avatar>
          
          <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
            <Camera className="w-4 h-4" />
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        
        <p className="text-sm text-muted-foreground mt-3">
          {uploading ? 'Uploading...' : 'Clique na câmera para alterar sua foto'}
        </p>
      </Card>

      {/* Personal Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Informações Pessoais
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tamanho_camisa">Tamanho da Camisa</Label>
              <Select 
                value={formData.tamanho_camisa} 
                onValueChange={(value) => handleInputChange('tamanho_camisa', value)}
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

            <div className="space-y-2">
              <Label htmlFor="estado_civil">Estado Civil</Label>
              <Select 
                value={formData.estado_civil} 
                onValueChange={(value) => handleInputChange('estado_civil', value)}
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
          </div>

          <div className="flex justify-between pt-4">
            <Button 
              variant="outline"
              onClick={() => setPasswordModalOpen(true)}
              className="px-6"
            >
              <Lock className="w-4 h-4 mr-2" />
              Alterar Senha
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="px-8"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Alteração de Senha */}
      <PasswordChangeModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        onSuccess={() => {
          setPasswordModalOpen(false);
          toast({
            title: "Senha alterada!",
            description: "Sua senha foi alterada com sucesso.",
          });
        }}
      />
    </div>
  );
};