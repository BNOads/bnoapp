import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileText, Image, Video, Link2, Copy, Eye, Edit2, Plus, Calendar, ExternalLink, FileCode, Share2, Search, Trash2, Upload, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReferencesEditor } from "@/components/References/ReferencesEditor";
interface ConteudoBloco {
  id: string;
  tipo: 'texto' | 'imagem' | 'video' | 'link';
  conteudo: string;
  titulo?: string;
  descricao?: string;
  url?: string;
}
interface ReferenciaCreativo {
  id: string;
  titulo: string;
  conteudo: any;
  link_publico: string;
  categoria: 'infoproduto' | 'negocio_local' | 'pagina';
  created_at: string;  
  updated_at: string;
  is_template: boolean;
  links_externos: any;
  is_public?: boolean;
  public_slug?: string;
  public_token?: string;
}
interface ReferenciaCriativosProps {
  clienteId: string;
}
export const ReferenciaCreativos = ({
  clienteId
}: ReferenciaCriativosProps) => {
  const [referencias, setReferencias] = useState<ReferenciaCreativo[]>([]);
  const [referenciasFiltradas, setReferenciasFiltradas] = useState<ReferenciaCreativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVisualizacao, setShowVisualizacao] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotionEditor, setShowNotionEditor] = useState(false);
  const [selectedReferencia, setSelectedReferencia] = useState<ReferenciaCreativo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | 'infoproduto' | 'negocio_local' | 'pagina'>('todas');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "infoproduto" as "infoproduto" | "negocio_local" | "pagina",
    is_template: false,
    is_public: false,
    public_slug: ""
  });
  const [blocos, setBlocos] = useState<ConteudoBloco[]>([]);
  const [linksExternos, setLinksExternos] = useState<{
    url: string;
    titulo: string;
  }[]>([]);
  const {
    toast
  } = useToast();
  const {
    canCreateContent
  } = useUserPermissions();
  useEffect(() => {
    carregarReferencias();
  }, [clienteId]);
  useEffect(() => {
    filtrarReferencias();
  }, [searchTerm, filtroCategoria, referencias]);
  const filtrarReferencias = () => {
    let filtered = referencias;

    // Filtrar por categoria
    if (filtroCategoria !== 'todas') {
      filtered = filtered.filter(ref => ref.categoria === filtroCategoria);
    }

    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(ref => ref.titulo.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setReferenciasFiltradas(filtered);
  };
  const carregarReferencias = async () => {
    try {
      let query = supabase.from('referencias_criativos')
        .select('*, is_public, public_slug, public_token')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      // Se clienteId for "geral", buscar referências gerais (cliente_id null)
      // Senão, filtrar por cliente específico
      if (clienteId === "geral") {
        query = query.is('cliente_id', null);
      } else {
        query = query.eq('cliente_id', clienteId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setReferencias((data || []) as ReferenciaCreativo[]);
      setReferenciasFiltradas((data || []) as ReferenciaCreativo[]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar referências: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const adicionarBloco = (tipo: ConteudoBloco['tipo']) => {
    const novoBloco: ConteudoBloco = {
      id: Date.now().toString(),
      tipo,
      conteudo: "",
      titulo: "",
      descricao: ""
    };
    setBlocos([...blocos, novoBloco]);
  };
  const atualizarBloco = (id: string, campo: string, valor: string) => {
    setBlocos(blocos.map(bloco => bloco.id === id ? {
      ...bloco,
      [campo]: valor
    } : bloco));
  };
  const removerBloco = (id: string) => {
    setBlocos(blocos.filter(bloco => bloco.id !== id));
  };
  const salvarReferencia = async () => {
    try {
      if (!formData.titulo.trim()) {
        toast({
          title: "Erro",
          description: "Título é obrigatório",
          variant: "destructive"
        });
        return;
      }

      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }

      if (editingId) {
        // Editar existente
        const { error } = await supabase
          .from('referencias_criativos')
          .update({
            titulo: formData.titulo.trim(),
            categoria: formData.categoria,
            conteudo: blocos.length > 0 ? JSON.stringify(blocos) : '[]',
            is_template: formData.is_template,
            links_externos: linksExternos || []
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Referência atualizada com sucesso!"
        });
      } else {
        // Criar nova
        const { error } = await supabase
          .from('referencias_criativos')
          .insert({
            cliente_id: clienteId === "geral" ? null : clienteId,
            titulo: formData.titulo.trim(),
            categoria: formData.categoria,
            conteudo: blocos.length > 0 ? JSON.stringify(blocos) : '[]',
            is_template: formData.is_template,
            links_externos: linksExternos || [],
            created_by: user.id,
            ativo: true
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Referência criada com sucesso!"
        });
      }

      resetarForm();
      setShowModal(false);
      carregarReferencias();
    } catch (error: any) {
      console.error('Erro ao salvar referência:', error);
      toast({
        title: "Erro",
        description: `Erro ao salvar referência: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };
  const resetarForm = () => {
    setFormData({
      titulo: "",
      categoria: "infoproduto",
      is_template: false,
      is_public: false,
      public_slug: ""
    });
    setBlocos([]);
    setLinksExternos([]);
    setEditingId(null);
  };
  const abrirEdicao = (referencia: ReferenciaCreativo) => {
    setEditingId(referencia.id);
    setFormData({
      titulo: referencia.titulo,
      categoria: referencia.categoria || "infoproduto",
      is_template: referencia.is_template,
      is_public: (referencia as any).is_public || false,
      public_slug: (referencia as any).public_slug || ""
    });
    setBlocos(typeof referencia.conteudo === 'string' ? JSON.parse(referencia.conteudo) : referencia.conteudo || []);
    setLinksExternos(referencia.links_externos || []);
    setShowModal(true);
  };
  const abrirVisualizacao = (referencia: ReferenciaCreativo) => {
    // Parse do conteúdo JSON para array
    const conteudoParsed = typeof referencia.conteudo === 'string' ? JSON.parse(referencia.conteudo) : referencia.conteudo || [];
    setSelectedReferencia({
      ...referencia,
      conteudo: conteudoParsed
    });
    setShowVisualizacao(true);
  };
  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência"
    });
  };
  const duplicarTemplate = async (referencia: ReferenciaCreativo) => {
    try {
      const {
        error
      } = await supabase.from('referencias_criativos').insert({
        cliente_id: clienteId === "geral" ? null : clienteId,
        titulo: `${referencia.titulo} (Cópia)`,
        categoria: referencia.categoria,
        conteudo: referencia.conteudo,
        is_template: false,
        links_externos: referencia.links_externos,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Template duplicado com sucesso!"
      });
      carregarReferencias();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao duplicar template: " + error.message,
        variant: "destructive"
      });
    }
  };
  const adicionarLinkExterno = () => {
    setLinksExternos([...linksExternos, {
      url: "",
      titulo: ""
    }]);
  };
  const atualizarLinkExterno = (index: number, campo: string, valor: string) => {
    const novosLinks = [...linksExternos];
    novosLinks[index] = {
      ...novosLinks[index],
      [campo]: valor
    };
    setLinksExternos(novosLinks);
  };
  const excluirReferencia = async (referencia: ReferenciaCreativo) => {
    if (!confirm('Tem certeza que deseja excluir esta referência? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const {
        error
      } = await supabase.from('referencias_criativos').update({
        ativo: false
      }).eq('id', referencia.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Referência excluída com sucesso!"
      });
      carregarReferencias();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao excluir referência: " + error.message,
        variant: "destructive"
      });
    }
  };
  const processarImportacaoCSV = async () => {
    if (!csvFile) return;
    setImportLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      // Esperado: titulo,categoria,is_template,links_externos
      const referencesData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        let linksExternos = [];
        if (values[3]) {
          try {
            // Tenta parsear como JSON primeiro
            linksExternos = JSON.parse(values[3]);
          } catch {
            // Se falhar, trata como URL simples
            linksExternos = [{
              titulo: values[3],
              url: values[3]
            }];
          }
        }
        return {
          titulo: values[0] || '',
          categoria: (['negocio_local', 'pagina'].includes(values[1]) ? values[1] : 'infoproduto') as 'infoproduto' | 'negocio_local' | 'pagina',
          is_template: values[2] === 'true' || values[2] === 'TRUE',
          links_externos: linksExternos
        };
      });
      for (const refData of referencesData) {
        if (refData.titulo) {
          await supabase.from('referencias_criativos').insert({
            cliente_id: clienteId === "geral" ? null : clienteId,
            titulo: refData.titulo,
            categoria: refData.categoria,
            conteudo: JSON.stringify([]),
            is_template: refData.is_template,
            links_externos: refData.links_externos,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });
        }
      }
      toast({
        title: "Sucesso",
        description: `${referencesData.filter(r => r.titulo).length} referências importadas com sucesso!`
      });
      setShowImportModal(false);
      setCsvFile(null);
      carregarReferencias();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao processar arquivo CSV: " + error.message,
        variant: "destructive"
      });
    } finally {
      setImportLoading(false);
    }
  };
  const downloadTemplateCSV = () => {
    const template = `titulo,categoria,is_template,links_externos
"Exemplo Referência","infoproduto","false","[]"
"Template Negócio Local","negocio_local","true","[{""url"":""https://example.com"",""titulo"":""Link Exemplo""}]"
"Exemplo Página","pagina","false","https://example.com/pagina"`;
    const blob = new Blob([template], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_referencias.csv';
    link.click();
  };
  const removerLinkExterno = (index: number) => {
    setLinksExternos(linksExternos.filter((_, i) => i !== index));
  };
  const renderizarBloco = (bloco: ConteudoBloco) => {
    switch (bloco.tipo) {
      case 'texto':
        return <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <p className="whitespace-pre-wrap">{bloco.conteudo}</p>
          </div>;
      case 'imagem':
        return <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <img src={bloco.conteudo} alt={bloco.descricao || ""} className="max-w-full h-auto rounded-lg" />
            {bloco.descricao && <p className="text-sm text-muted-foreground mt-2">{bloco.descricao}</p>}
          </div>;
      case 'video':
        return <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <video src={bloco.conteudo} controls className="max-w-full h-auto rounded-lg" />
            {bloco.descricao && <p className="text-sm text-muted-foreground mt-2">{bloco.descricao}</p>}
          </div>;
      case 'link':
        return <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <a href={bloco.conteudo} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {bloco.descricao || bloco.conteudo}
            </a>
          </div>;
      default:
        return null;
    }
  };
  if (loading) {
    return <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Referência de Criativos</h2>
          <p className="text-muted-foreground">
            Crie documentos multimídia para referência e compartilhamento
          </p>
        </div>
        <div className="flex gap-2">
          {canCreateContent && <>
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
              <Button onClick={() => setShowNotionEditor(true)} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Referência
              </Button>
              
            </>}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Pesquisar referências..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="w-48">
              <Label>Categoria</Label>
              <Select value={filtroCategoria} onValueChange={(value: 'todas' | 'infoproduto' | 'negocio_local' | 'pagina') => setFiltroCategoria(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="infoproduto">Infoproduto</SelectItem>
                  <SelectItem value="negocio_local">Negócio Local</SelectItem>
                  <SelectItem value="pagina">Página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Referências */}
      <Card>
        <CardContent className="p-0">
          {referenciasFiltradas.length > 0 ? <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Blocos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referenciasFiltradas.map(referencia => <TableRow key={referencia.id}>
                    <TableCell className="font-medium">
                      {referencia.titulo}
                    </TableCell>
                     <TableCell>
                       <Badge variant="outline">
                         {referencia.categoria === 'infoproduto' ? 'Infoproduto' : referencia.categoria === 'negocio_local' ? 'Negócio Local' : 'Página'}
                       </Badge>
                     </TableCell>
                    <TableCell>
                      {referencia.is_template ? <Badge variant="secondary">
                          <FileCode className="h-3 w-3 mr-1" />
                          Template
                        </Badge> : <Badge variant="outline">Referência</Badge>}
                    </TableCell>
                     <TableCell>
                       {(() => {
                   const conteudoParsed = typeof referencia.conteudo === 'string' ? JSON.parse(referencia.conteudo) : referencia.conteudo || [];
                   const arrayBlocks = Array.isArray(conteudoParsed) ? conteudoParsed.length : 0;
                   const hasMarkdown = (referencia as any).conteudo_markdown && (referencia as any).conteudo_markdown.trim().length > 0;
                   
                   if (hasMarkdown && arrayBlocks === 0) {
                     return "Conteúdo Markdown";
                   }
                   return `${arrayBlocks} bloco(s)`;
                 })()}
                     </TableCell>
                    <TableCell>
                      {format(new Date(referencia.created_at), "dd/MM/yyyy", {
                  locale: ptBR
                })}
                    </TableCell>
                     <TableCell className="text-right">
                       <div className="flex gap-1 justify-end">
                         {/* Botão de abrir link externo - só aparece se houver links externos */}
                         {referencia.links_externos && referencia.links_externos.length > 0 && <Button variant="ghost" size="sm" onClick={() => {
                    const firstLink = referencia.links_externos[0];
                    const url = typeof firstLink === 'string' ? firstLink : firstLink.url;
                    window.open(url, '_blank');
                  }} title="Abrir primeiro link externo">
                             <ExternalLink className="h-4 w-4" />
                           </Button>}
                           {/* Verificar se há conteúdo (array ou markdown) */}
                           {(() => {
                     const conteudoParsed = typeof referencia.conteudo === 'string' ? JSON.parse(referencia.conteudo) : referencia.conteudo || [];
                     const hasArrayContent = Array.isArray(conteudoParsed) && conteudoParsed.length > 0;
                     const hasMarkdownContent = (referencia as any).conteudo_markdown && (referencia as any).conteudo_markdown.trim().length > 0;
                     const hasContent = hasArrayContent || hasMarkdownContent;
                     
                     return hasContent && <Button variant="ghost" size="sm" onClick={() => window.open(`/referencia/${referencia.id}`, '_blank')} title="Visualizar em nova aba">
                                 <Eye className="h-4 w-4" />
                               </Button>;
                   })()}
                          <Button variant="ghost" size="sm" onClick={() => {
                     // Generate the correct public link based on public_slug or link_publico
                     let fullLink = '';
                     
                     if (referencia.public_slug) {
                       fullLink = `${window.location.origin}/referencia/publica/${referencia.public_slug}`;
                     } else if (referencia.link_publico) {
                       fullLink = referencia.link_publico.startsWith('http') 
                         ? referencia.link_publico 
                         : `${window.location.origin}${referencia.link_publico}`;
                     } else {
                       fullLink = `${window.location.origin}/referencia/${referencia.id}`;
                     }
                     
                     copiarLink(fullLink);
                   }} title="Copiar link público">
                            <Copy className="h-4 w-4" />
                          </Button>
                        {canCreateContent && <>
                             <Button variant="ghost" size="sm" onClick={() => {
                      setEditingId(referencia.id);
                      setShowNotionEditor(true);
                    }} title="Editar com Editor Notion">
                               <Edit2 className="h-4 w-4" />
                             </Button>
                            {referencia.is_template && <Button variant="ghost" size="sm" onClick={() => duplicarTemplate(referencia)}>
                                <FileCode className="h-4 w-4" />
                              </Button>}
                             <Button variant="ghost" size="sm" onClick={() => excluirReferencia(referencia)} className="text-destructive hover:text-destructive" title="Excluir referência">
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </>}
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table> : <div className="py-8 text-center">
              {searchTerm ? <>
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma referência encontrada</h3>
                  <p className="text-muted-foreground">
                    Tente pesquisar com outros termos ou limpe o filtro.
                  </p>
                </> : <>
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma referência criada</h3>
                  <p className="text-muted-foreground">
                    {canCreateContent ? "Clique em 'Nova Referência' para criar a primeira." : "As referências serão exibidas aqui quando criadas."}
                  </p>
                </>}
            </div>}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={showModal} onOpenChange={open => {
      if (!open) resetarForm();
      setShowModal(open);
    }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Referência" : "Nova Referência"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" value={formData.titulo} onChange={e => setFormData({
                ...formData,
                titulo: e.target.value
              })} placeholder="Título da referência" />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(value: "infoproduto" | "negocio_local" | "pagina") => setFormData({
                ...formData,
                categoria: value
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infoproduto">Infoproduto</SelectItem>
                    <SelectItem value="negocio_local">Negócio Local</SelectItem>
                    <SelectItem value="pagina">Página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_template" checked={formData.is_template} onChange={e => setFormData({
              ...formData,
              is_template: e.target.checked
            })} className="rounded" />
              <Label htmlFor="is_template">Salvar como template</Label>
            </div>

            {/* Controles de Publicação */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Compartilhamento Público</h3>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_public" 
                    checked={formData.is_public || false} 
                    onChange={e => setFormData({
                      ...formData,
                      is_public: e.target.checked
                    })} 
                    className="rounded" 
                  />
                  <Label htmlFor="is_public">Tornar público</Label>
                </div>
              </div>
              
              {formData.is_public && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="public_slug">URL Pública (Slug)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex">
                        <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                          /referencia/publica/
                        </span>
                        <Input 
                          id="public_slug"
                          value={formData.public_slug || ''}
                          onChange={e => setFormData({
                            ...formData,
                            public_slug: e.target.value
                          })}
                          placeholder="slug-da-referencia"
                          className="rounded-l-none"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const slug = formData.titulo
                            ? formData.titulo.toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/[^a-z0-9\s-]/g, '')
                                .replace(/\s+/g, '-')
                                .trim()
                            : '';
                          setFormData({
                            ...formData,
                            public_slug: slug
                          });
                        }}
                      >
                        Gerar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      URL amigável para compartilhamento público
                    </p>
                  </div>

                  {editingId && (
                    <div className="flex items-center justify-between p-3 bg-background rounded border">
                      <div>
                        <p className="text-sm font-medium">Link Público</p>
                        <p className="text-xs text-muted-foreground">
                          {formData.public_slug 
                            ? `${window.location.origin}/referencia/publica/${formData.public_slug}`
                            : 'Salve para gerar o link público'
                          }
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (formData.public_slug) {
                              const link = `${window.location.origin}/referencia/publica/${formData.public_slug}`;
                              navigator.clipboard.writeText(link);
                              toast({
                                title: "Link copiado!",
                                description: "Link público copiado para a área de transferência."
                              });
                            }
                          }}
                          disabled={!formData.public_slug}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (editingId) {
                              try {
                                const { data, error } = await supabase
                                  .from('referencias_criativos')
                                  .update({ public_token: null }) // Trigger will generate new token
                                  .eq('id', editingId)
                                  .select('public_token')
                                  .single();

                                if (error) throw error;

                                toast({
                                  title: "Token regenerado!",
                                  description: "Novo token de acesso gerado com sucesso."
                                });
                                carregarReferencias(); // Refresh the list
                              } catch (error) {
                                console.error('Erro ao regenerar token:', error);
                                toast({
                                  title: "Erro",
                                  description: "Não foi possível regenerar o token.",
                                  variant: "destructive"
                                });
                              }
                            }
                          }}
                        >
                          Regenerar Token
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <p><strong>💡 Dica:</strong> Referências públicas podem ser acessadas por qualquer pessoa com o link, mesmo sem login.</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Links Externos */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Links Externos</h3>
                <Button type="button" variant="outline" size="sm" onClick={adicionarLinkExterno}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Link
                </Button>
              </div>
              
              {linksExternos.map((link, index) => <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                  <Input placeholder="Título do link" value={link.titulo} onChange={e => atualizarLinkExterno(index, 'titulo', e.target.value)} />
                  <div className="flex gap-2">
                    <Input placeholder="URL" value={link.url} onChange={e => atualizarLinkExterno(index, 'url', e.target.value)} />
                    <Button type="button" variant="outline" size="sm" onClick={() => removerLinkExterno(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>)}
            </div>

            <Separator />

            {/* Blocos de Conteúdo */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Conteúdo</h3>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => adicionarBloco('texto')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Texto
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => adicionarBloco('imagem')}>
                    <Image className="h-4 w-4 mr-2" />
                    Imagem
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => adicionarBloco('video')}>
                    <Video className="h-4 w-4 mr-2" />
                    Vídeo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => adicionarBloco('link')}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Link
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                {blocos.map(bloco => <Card key={bloco.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{bloco.tipo}</Badge>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerBloco(bloco.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Título (opcional)</Label>
                        <Input value={bloco.titulo || ""} onChange={e => atualizarBloco(bloco.id, 'titulo', e.target.value)} placeholder="Título do bloco" />
                      </div>
                      
                      {bloco.tipo === 'texto' ? <div>
                          <Label>Conteúdo</Label>
                          <Textarea value={bloco.conteudo} onChange={e => atualizarBloco(bloco.id, 'conteudo', e.target.value)} placeholder="Digite o texto..." rows={4} />
                        </div> : <div>
                          <Label>URL</Label>
                          <Input value={bloco.conteudo} onChange={e => atualizarBloco(bloco.id, 'conteudo', e.target.value)} placeholder={`URL da ${bloco.tipo}`} />
                        </div>}
                      
                      {bloco.tipo !== 'texto' && <div>
                          <Label>Descrição (opcional)</Label>
                          <Input value={bloco.descricao || ""} onChange={e => atualizarBloco(bloco.id, 'descricao', e.target.value)} placeholder="Descrição do conteúdo" />
                        </div>}
                    </CardContent>
                  </Card>)}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarReferencia}>
                {editingId ? "Salvar Alterações" : "Criar Referência"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação CSV */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Referências via CSV</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Formato esperado: titulo,categoria,is_template,links_externos</p>
              <p>Categorias válidas: infoproduto, negocio_local, pagina</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplateCSV} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
            </div>
            
            <div>
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input id="csv-file" type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>
                Cancelar
              </Button>
              <Button onClick={processarImportacaoCSV} disabled={!csvFile || importLoading}>
                {importLoading ? "Importando..." : "Importar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização - Agora só para compatibilidade */}
      <Dialog open={showVisualizacao} onOpenChange={setShowVisualizacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abrindo referência...</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              A referência será aberta em uma nova aba para melhor visualização.
            </p>
            <Button onClick={() => setShowVisualizacao(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor estilo Notion */}
      <ReferencesEditor 
        isOpen={showNotionEditor} 
        onClose={() => {
          setShowNotionEditor(false);
          setEditingId(null);
        }} 
        referenceId={editingId} 
        clienteId={clienteId} 
        onSave={() => {
          // Apenas recarregar as referências, NÃO fechar o modal
          carregarReferencias();
        }} 
      />
    </div>;
};