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
  Globe,
  Upload,
  Download,
  FileText,
  X
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<AcessoFormData[]>([]);
  const [importing, setImporting] = useState(false);
  
  const [formData, setFormData] = useState<AcessoFormData>({
    nome_acesso: '',
    categoria: 'outros',
    login_usuario: '',
    senha: '',
    link_acesso: '',
    notas_adicionais: ''
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(
    acessos.filter(acesso => selectedCategory === 'all' || acesso.categoria === selectedCategory),
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
        ativo: true,
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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: `${type} copiado para a área de transferência`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar para a área de transferência",
        variant: "destructive"
      });
    }
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

  const parseCSV = (text: string): any[] => {
    // Normalize line endings and remove BOM if present
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error('O arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados.');
    }

    // Try to detect the delimiter automatically: ",", ";", "\t", "|"
    const headerRaw = lines[0].replace(/^\uFEFF/, '');
    const candidates = [',', ';', '\t', '|'] as const;

    const parseCSVLine = (line: string, delimiter: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result.map(v => v.trim());
    };

    // Pick delimiter that yields the highest column count on header
    let chosen = ',';
    let maxCols = 1;
    for (const d of candidates) {
      const cols = parseCSVLine(headerRaw, d).length;
      if (cols > maxCols) {
        maxCols = cols;
        chosen = d;
      }
    }

    const headersRaw = parseCSVLine(headerRaw, chosen).map(h => h.replace(/^["']|["']$/g, ''));
    // Normalize headers to a consistent snake_case lowercase form
    const headers = headersRaw.map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_'));
    console.log('CSV Headers detectados:', headers, 'Delimitador:', JSON.stringify(chosen));

    const data = lines.slice(1).map((line, index) => {
      try {
        const valuesRaw = parseCSVLine(line, chosen);
        const obj: any = {};
        headers.forEach((header, idx) => {
          let value = (valuesRaw[idx] ?? '').trim();
          value = value.replace(/^["']|["']$/g, '');
          obj[header] = value;
        });
        return obj;
      } catch (error) {
        console.error(`Erro na linha ${index + 2}:`, error);
        throw new Error(`Erro ao processar linha ${index + 2}: ${error}`);
      }
    });

    return data;
  };

  const processImportFile = async (file: File) => {
    try {
      const text = await file.text();
      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV with better handling
        data = parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        // Parse JSON
        data = JSON.parse(text);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou JSON.');
      }

      // Convert to our format with better field mapping
      const converted: AcessoFormData[] = data.map((item: any, index: number) => {
        try {
          const normalizeKey = (s: string) => s
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '_');

          const getNormalizedValue = (possibleNames: string[]) => {
            for (const name of possibleNames) {
              const key = normalizeKey(name);
              if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
                return String(item[key]).trim();
              }
            }
            return '';
          };

          const normalizeCategory = (raw: string): string => {
            const v = raw.toLowerCase().trim();
            const valid = Object.keys(CATEGORIAS);
            if (valid.includes(v)) return v;
            if (!v) return 'outros';
            
            // Mapeamento específico para categorias do arquivo
            const categoryMap: Record<string, string> = {
              'cursos': 'plataforma_cursos',
              'email': 'emails',
              'ferramentas_ai': 'ferramentas_ads',
              'navegador': 'outros',
              'automacoes': 'ferramentas_ads',
              'crm': 'ferramentas_ads',
              'design': 'outros',
              'analytics': 'ferramentas_ads',
              'wordpress': 'outros',
              'hospedagem': 'outros'
            };
            
            if (categoryMap[v]) return categoryMap[v];
            
            // Fallback para detecção automática
            if (v.includes('rede') && v.includes('soc')) return 'redes_sociais';
            if (v.includes('ads') || v.includes('anúncio') || v.includes('anuncio') || v.includes('tráfego') || v.includes('trafego') || v.includes('google') || v.includes('meta')) return 'ferramentas_ads';
            if (v.includes('curso') || v.includes('aula') || v.includes('treinamento') || v.includes('elearning') || v.includes('e-learning') || v.includes('plataforma')) return 'plataforma_cursos';
            if (v.includes('email') || v.includes('e-mail') || v.includes('gmail') || v.includes('outlook')) return 'emails';
            return 'outros';
          };

          const result = {
            nome_acesso: getNormalizedValue(['nome_acesso', 'nome do acesso', 'nome_do_acesso', 'nome', 'name', 'titulo', 'title', 'servico', 'service']),
            categoria: normalizeCategory(getNormalizedValue(['categoria', 'category', 'tipo', 'type', 'categoria_acesso', 'categoria do acesso'])),
            login_usuario: getNormalizedValue(['login_usuario', 'login', 'usuario', 'user', 'username', 'user_name', 'email', 'e-mail', 'usuario_email', 'user_email']),
            senha: getNormalizedValue(['senha', 'password', 'pass', 'pwd', 'senha_acesso']),
            link_acesso: getNormalizedValue(['link_acesso', 'link', 'url', 'site', 'website', 'endereco', 'endereço']),
            notas_adicionais: getNormalizedValue(['notas_adicionais', 'notas', 'notes', 'observacoes', 'observações', 'description', 'descricao', 'descrição'])
          };

          // Garantir categoria válida
          const validCategories = Object.keys(CATEGORIAS);
          if (!validCategories.includes(result.categoria)) {
            result.categoria = 'outros';
          }

          console.log(`Item ${index + 1} processado:`, result);
          return result;
        } catch (error) {
          console.error(`Erro ao converter item ${index + 1}:`, error);
          throw new Error(`Erro ao processar item ${index + 1}`);
        }
      });

      console.log('Dados convertidos:', converted);
      setImportPreview(converted);
      
      toast({
        title: "Arquivo processado",
        description: `${converted.length} itens encontrados no arquivo`
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido. Verifique o formato do arquivo.",
        variant: "destructive"
      });
      setImportFile(null);
      setImportPreview([]);
    }
  };

  const processImportFromUrl = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Não foi possível acessar o arquivo de importação.');
      const text = await res.text();
      // Criar um File para reutilizar o mesmo fluxo de parsing
      const file = new File([text], 'import.csv', { type: 'text/csv' });
      setImportFile(file);
      await processImportFile(file);
      toast({ title: 'Arquivo carregado', description: 'Arquivo de importação carregado do servidor' });
    } catch (e: any) {
      console.error('Erro ao carregar arquivo de importação:', e);
      toast({ title: 'Erro', description: e?.message || 'Falha ao carregar arquivo de importação.', variant: 'destructive' });
    }
  };
  const handleImport = async () => {
    if (!importPreview.length) return;

    try {
      setImporting(true);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of importPreview) {
        if (!item.nome_acesso.trim()) {
          console.log('Pulando item sem nome:', item);
          continue; // Skip empty names
        }
        
        try {
          const dataToSave = {
            nome_acesso: item.nome_acesso,
            categoria: item.categoria,
            login_usuario: item.login_usuario || null,
            senha_criptografada: item.senha ? encryptPassword(item.senha) : null,
            link_acesso: item.link_acesso || null,
            notas_adicionais: item.notas_adicionais || null,
            ativo: true,
            created_by: user?.id
          };

          const { error } = await supabase
            .from('acessos_logins')
            .insert(dataToSave);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error('Erro ao inserir item:', item, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Sucesso",
          description: `${successCount} acessos importados com sucesso${errorCount > 0 ? `, ${errorCount} falharam` : ''}`
        });
      } else {
        throw new Error('Nenhum item foi importado com sucesso');
      }

      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      loadAcessos();
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: "Erro",
        description: "Erro ao importar acessos",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'nome_acesso,categoria,login_usuario,senha,link_acesso,notas_adicionais',
      '"Exemplo Meta Ads","ferramentas_ads","usuario@exemplo.com","senha123","https://business.facebook.com","Conta principal do cliente"',
      '"Instagram Cliente X","redes_sociais","@clientex","","https://instagram.com/clientex","Perfil verificado"',
      '"Google Ads - Cliente Y","ferramentas_ads","gestorY@agencia.com","minhasenha","https://ads.google.com","Conta de teste"'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_acessos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template baixado",
      description: "Use o arquivo template_acessos.csv como exemplo"
    });
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
          <div className="flex gap-2">
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Acesso
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
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
                <SelectItem value="all">Todas as categorias</SelectItem>
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
                        {CATEGORIAS[acesso.categoria as keyof typeof CATEGORIAS] || 'Outros'}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {acesso.login_usuario ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {acesso.login_usuario}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(acesso.login_usuario!, 'Login')}
                          title="Copiar login"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {acesso.senha_criptografada ? (
                      <div className="flex items-center gap-2">
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
                          title="Mostrar/ocultar senha"
                        >
                          {visiblePasswords.has(acesso.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        {visiblePasswords.has(acesso.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(decryptPassword(acesso.senha_criptografada!), 'Senha')}
                            title="Copiar senha"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
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

      {/* Modal de Importação */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Acessos</DialogTitle>
            <DialogDescription>
              Importe vários acessos de uma vez usando um arquivo CSV ou JSON
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!importFile ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione um arquivo</h3>
                  <p className="text-muted-foreground mb-4">
                    Arraste e solte ou clique para selecionar um arquivo CSV ou JSON
                  </p>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        processImportFile(file);
                      }
                    }}
                    className="hidden"
                    id="import-file"
                  />
                  <label htmlFor="import-file">
                    <Button variant="outline" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                  </label>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <Button variant="ghost" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Template CSV
                  </Button>
                  <Button variant="outline" onClick={() => processImportFromUrl('/logins_bnoads.csv')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Usar arquivo copiado
                  </Button>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Formato esperado:</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>CSV:</strong> Colunas aceitas: nome_acesso, categoria, login_usuario, senha, link_acesso, notas_adicionais
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Categorias válidas:</strong> redes_sociais, ferramentas_ads, plataforma_cursos, emails, outros
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>JSON:</strong> Array de objetos com as mesmas propriedades
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Arquivo: {importFile.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {importPreview.length} itens encontrados
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {importPreview.length > 0 && (
                  <div className="max-h-64 overflow-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.slice(0, 5).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.nome_acesso}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {CATEGORIAS[item.categoria as keyof typeof CATEGORIAS] || 'Outros'}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.login_usuario}</TableCell>
                            <TableCell>{item.link_acesso}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {importPreview.length > 5 && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        ... e mais {importPreview.length - 5} itens
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
              }}
            >
              Cancelar
            </Button>
            {importPreview.length > 0 && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importando...' : `Importar ${importPreview.length} itens`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};