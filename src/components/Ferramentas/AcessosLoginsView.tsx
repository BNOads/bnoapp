import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Lock,
  User,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/components/Auth/AuthContext';
import { useSearch } from '@/hooks/useSearch';

interface AcessoLogin {
  id: string;
  nome_acesso: string;
  categoria: string;
  login_usuario: string | null;
  senha_criptografada: string | null;
  link_acesso: string | null;
  notas_adicionais: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  ativo: boolean;
}

interface AcessoFormData {
  nome_acesso: string;
  categoria: string;
  login_usuario: string;
  senha: string;
  link_acesso: string;
  notas_adicionais: string;
}

const CATEGORIAS = {
  redes_sociais: 'Redes Sociais',
  ferramentas_ads: 'Ferramentas Ads',
  plataforma_cursos: 'Plataforma de Cursos',
  emails: 'E-mails',
  outros: 'Outros'
};

// Simple XOR encryption for demo purposes - in production use proper encryption
const encryptPassword = (password: string): string => {
  const key = 'lovable-key-2024';
  let result = '';
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(password.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
};

const decryptPassword = (encrypted: string): string => {
  try {
    const key = 'lovable-key-2024';
    const decoded = atob(encrypted);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
};

export const AcessosLoginsView = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserPermissions();
  
  const [acessos, setAcessos] = useState<AcessoLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAcesso, setEditingAcesso] = useState<AcessoLogin | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<AcessoFormData>({
    nome_acesso: '',
    categoria: 'outros',
    login_usuario: '',
    senha: '',
    link_acesso: '',
    notas_adicionais: ''
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(
    acessos.filter(acesso => !selectedCategory || acesso.categoria === selectedCategory),
    ['nome_acesso', 'login_usuario', 'notas_adicionais']
  );

  useEffect(() => {
    loadAcessos();
  }, []);

  const loadAcessos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('acessos_logins')
        .select('*')
        .eq('ativo', true)
        .order('nome_acesso');

      if (error) throw error;
      setAcessos(data || []);
    } catch (error) {
      console.error('Error loading acessos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar acessos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome_acesso.trim()) {
      toast({
        title: "Erro",
        description: "Nome do acesso é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const dataToSave = {
        nome_acesso: formData.nome_acesso,
        categoria: formData.categoria,
        login_usuario: formData.login_usuario || null,
        senha_criptografada: formData.senha ? encryptPassword(formData.senha) : null,
        link_acesso: formData.link_acesso || null,
        notas_adicionais: formData.notas_adicionais || null,
        created_by: user?.id
      };

      if (editingAcesso) {
        const { error } = await supabase
          .from('acessos_logins')
          .update(dataToSave)
          .eq('id', editingAcesso.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Acesso atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('acessos_logins')
          .insert(dataToSave);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Acesso criado com sucesso"
        });
      }

      setShowModal(false);
      setEditingAcesso(null);
      resetForm();
      loadAcessos();
    } catch (error) {
      console.error('Error saving acesso:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar acesso",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (acesso: AcessoLogin) => {
    setEditingAcesso(acesso);
    setFormData({
      nome_acesso: acesso.nome_acesso,
      categoria: acesso.categoria,
      login_usuario: acesso.login_usuario || '',
      senha: acesso.senha_criptografada ? decryptPassword(acesso.senha_criptografada) : '',
      link_acesso: acesso.link_acesso || '',
      notas_adicionais: acesso.notas_adicionais || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('acessos_logins')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Acesso excluído com sucesso"
      });
      
      loadAcessos();
    } catch (error) {
      console.error('Error deleting acesso:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir acesso",
        variant: "destructive"
      });
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_acesso: '',
      categoria: 'outros',
      login_usuario: '',
      senha: '',
      link_acesso: '',
      notas_adicionais: ''
    });
  };

  const togglePasswordVisibility = (id: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisiblePasswords(newVisible);
  };

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'redes_sociais': return <Globe className="h-4 w-4" />;
      case 'ferramentas_ads': return <User className="h-4 w-4" />;
      case 'emails': return <User className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case 'redes_sociais': return 'bg-blue-100 text-blue-800';
      case 'ferramentas_ads': return 'bg-green-100 text-green-800';
      case 'plataforma_cursos': return 'bg-purple-100 text-purple-800';
      case 'emails': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Acessos & Logins</h1>
          <p className="text-muted-foreground">
            Gerencie credenciais e acessos da equipe
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Acesso
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Pesquisar acessos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {Object.entries(CATEGORIAS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Senha</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((acesso) => (
                <TableRow key={acesso.id}>
                  <TableCell className="font-medium">
                    {acesso.nome_acesso}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCategoryColor(acesso.categoria)}>
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(acesso.categoria)}
                        {CATEGORIAS[acesso.categoria as keyof typeof CATEGORIAS]}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>{acesso.login_usuario || '-'}</TableCell>
                  <TableCell>
                    {acesso.senha_criptografada ? (
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <>
                            <span className="font-mono text-sm">
                              {visiblePasswords.has(acesso.id) 
                                ? decryptPassword(acesso.senha_criptografada)
                                : '••••••••'
                              }
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePasswordVisibility(acesso.id)}
                            >
                              {visiblePasswords.has(acesso.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground">••••••••</span>
                        )}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {acesso.link_acesso ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(acesso.link_acesso!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(acesso)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(acesso.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum acesso encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Novo/Editar Acesso */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAcesso ? 'Editar Acesso' : 'Novo Acesso'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do acesso/login
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do acesso *</label>
              <Input
                value={formData.nome_acesso}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_acesso: e.target.value }))}
                placeholder="Ex: Conta Meta Ads Cliente X"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={formData.categoria} onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIAS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Login/Usuário</label>
              <Input
                value={formData.login_usuario}
                onChange={(e) => setFormData(prev => ({ ...prev, login_usuario: e.target.value }))}
                placeholder="usuario@exemplo.com"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Senha</label>
              <div className="relative mt-1">
                <Input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Link de acesso</label>
              <Input
                value={formData.link_acesso}
                onChange={(e) => setFormData(prev => ({ ...prev, link_acesso: e.target.value }))}
                placeholder="https://exemplo.com"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Notas adicionais</label>
              <Textarea
                value={formData.notas_adicionais}
                onChange={(e) => setFormData(prev => ({ ...prev, notas_adicionais: e.target.value }))}
                placeholder="Informações extras..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowModal(false);
                setEditingAcesso(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingAcesso ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Acesso</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este acesso? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};