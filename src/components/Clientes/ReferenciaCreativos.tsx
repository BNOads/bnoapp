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
import { 
  FileText, 
  Image, 
  Video, 
  Link2, 
  Copy, 
  Eye, 
  Edit2, 
  Plus, 
  Calendar,
  ExternalLink,
  FileCode,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  data_expiracao: string | null;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  links_externos: any;
}

interface ReferenciaCriativosProps {
  clienteId: string;
}

export const ReferenciaCreativos = ({ clienteId }: ReferenciaCriativosProps) => {
  const [referencias, setReferencias] = useState<ReferenciaCreativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVisualizacao, setShowVisualizacao] = useState(false);
  const [selectedReferencia, setSelectedReferencia] = useState<ReferenciaCreativo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: "",
    data_expiracao: "",
    is_template: false
  });
  
  const [blocos, setBlocos] = useState<ConteudoBloco[]>([]);
  const [linksExternos, setLinksExternos] = useState<{url: string, titulo: string}[]>([]);
  
  const { toast } = useToast();
  const { isAdmin } = useUserPermissions();

  useEffect(() => {
    carregarReferencias();
  }, [clienteId]);

  const carregarReferencias = async () => {
    try {
      let query = supabase
        .from('referencias_criativos')
        .select('*')
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
      setReferencias(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar referências: " + error.message,
        variant: "destructive",
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
    setBlocos(blocos.map(bloco => 
      bloco.id === id ? { ...bloco, [campo]: valor } : bloco
    ));
  };

  const removerBloco = (id: string) => {
    setBlocos(blocos.filter(bloco => bloco.id !== id));
  };

  const salvarReferencia = async () => {
    try {
      if (!formData.titulo) {
        toast({
          title: "Erro",
          description: "Título é obrigatório",
          variant: "destructive",
        });
        return;
      }

      const dataExpiracao = formData.data_expiracao ? new Date(formData.data_expiracao).toISOString() : null;

      if (editingId) {
        // Editar existente
        const { error } = await supabase
          .from('referencias_criativos')
          .update({
            titulo: formData.titulo,
            conteudo: JSON.stringify(blocos),
            data_expiracao: dataExpiracao,
            is_template: formData.is_template,
            links_externos: linksExternos
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Referência atualizada com sucesso!",
        });
      } else {
        // Criar nova
        const { error } = await supabase
          .from('referencias_criativos')
          .insert({
            cliente_id: clienteId === "geral" ? null : clienteId,
            titulo: formData.titulo,
            conteudo: JSON.stringify(blocos),
            data_expiracao: dataExpiracao,
            is_template: formData.is_template,
            links_externos: linksExternos,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Referência criada com sucesso!",
        });
      }

      resetarForm();
      setShowModal(false);
      carregarReferencias();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar referência: " + error.message,
        variant: "destructive",
      });
    }
  };

  const resetarForm = () => {
    setFormData({
      titulo: "",
      data_expiracao: "",
      is_template: false
    });
    setBlocos([]);
    setLinksExternos([]);
    setEditingId(null);
  };

  const abrirEdicao = (referencia: ReferenciaCreativo) => {
    setEditingId(referencia.id);
    setFormData({
      titulo: referencia.titulo,
      data_expiracao: referencia.data_expiracao ? referencia.data_expiracao.split('T')[0] : "",
      is_template: referencia.is_template
    });
    setBlocos(typeof referencia.conteudo === 'string' ? JSON.parse(referencia.conteudo) : (referencia.conteudo || []));
    setLinksExternos(referencia.links_externos || []);
    setShowModal(true);
  };

  const abrirVisualizacao = (referencia: ReferenciaCreativo) => {
    setSelectedReferencia(referencia);
    setShowVisualizacao(true);
  };

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência",
    });
  };

  const duplicarTemplate = async (referencia: ReferenciaCreativo) => {
    try {
      const { error } = await supabase
        .from('referencias_criativos')
        .insert({
          cliente_id: clienteId === "geral" ? null : clienteId,
          titulo: `${referencia.titulo} (Cópia)`,
          conteudo: referencia.conteudo,
          data_expiracao: null,
          is_template: false,
          links_externos: referencia.links_externos,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template duplicado com sucesso!",
      });
      carregarReferencias();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao duplicar template: " + error.message,
        variant: "destructive",
      });
    }
  };

  const adicionarLinkExterno = () => {
    setLinksExternos([...linksExternos, { url: "", titulo: "" }]);
  };

  const atualizarLinkExterno = (index: number, campo: string, valor: string) => {
    const novosLinks = [...linksExternos];
    novosLinks[index] = { ...novosLinks[index], [campo]: valor };
    setLinksExternos(novosLinks);
  };

  const removerLinkExterno = (index: number) => {
    setLinksExternos(linksExternos.filter((_, i) => i !== index));
  };

  const renderizarBloco = (bloco: ConteudoBloco) => {
    switch (bloco.tipo) {
      case 'texto':
        return (
          <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <p className="whitespace-pre-wrap">{bloco.conteudo}</p>
          </div>
        );
      case 'imagem':
        return (
          <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <img 
              src={bloco.conteudo} 
              alt={bloco.descricao || ""} 
              className="max-w-full h-auto rounded-lg"
            />
            {bloco.descricao && <p className="text-sm text-muted-foreground mt-2">{bloco.descricao}</p>}
          </div>
        );
      case 'video':
        return (
          <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <video 
              src={bloco.conteudo} 
              controls 
              className="max-w-full h-auto rounded-lg"
            />
            {bloco.descricao && <p className="text-sm text-muted-foreground mt-2">{bloco.descricao}</p>}
          </div>
        );
      case 'link':
        return (
          <div>
            {bloco.titulo && <h4 className="font-semibold mb-2">{bloco.titulo}</h4>}
            <a 
              href={bloco.conteudo} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {bloco.descricao || bloco.conteudo}
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Referência de Criativos</h2>
          <p className="text-muted-foreground">
            Crie documentos multimídia para referência e compartilhamento
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Referência
          </Button>
        )}
      </div>

      {/* Lista de Referências */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {referencias.map((referencia) => (
          <Card key={referencia.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{referencia.titulo}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {referencia.is_template && (
                      <Badge variant="secondary">
                        <FileCode className="h-3 w-3 mr-1" />
                        Template
                      </Badge>
                    )}
                    {referencia.data_expiracao && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Expira em {format(new Date(referencia.data_expiracao), "dd/MM", { locale: ptBR })}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirVisualizacao(referencia)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copiarLink(referencia.link_publico)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEdicao(referencia)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {referencia.is_template && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicarTemplate(referencia)}
                        >
                          <FileCode className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {referencia.conteudo?.length || 0} bloco(s) de conteúdo
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Criado em {format(new Date(referencia.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {referencias.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhuma referência criada</h3>
            <p className="text-muted-foreground">
              {isAdmin ? "Clique em 'Nova Referência' para criar a primeira." : "As referências serão exibidas aqui quando criadas."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição */}
      <Dialog open={showModal} onOpenChange={(open) => {
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
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título da referência"
                />
              </div>
              <div>
                <Label htmlFor="data_expiracao">Data de Expiração (opcional)</Label>
                <Input
                  id="data_expiracao"
                  type="date"
                  value={formData.data_expiracao}
                  onChange={(e) => setFormData({ ...formData, data_expiracao: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_template"
                checked={formData.is_template}
                onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_template">Salvar como template</Label>
            </div>

            <Separator />

            {/* Links Externos */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Links Externos</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarLinkExterno}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Link
                </Button>
              </div>
              
              {linksExternos.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Título"
                    value={link.titulo}
                    onChange={(e) => atualizarLinkExterno(index, 'titulo', e.target.value)}
                  />
                  <Input
                    placeholder="URL (Figma, Notion, Miro, etc.)"
                    value={link.url}
                    onChange={(e) => atualizarLinkExterno(index, 'url', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerLinkExterno(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Editor de Conteúdo */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Conteúdo</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarBloco('texto')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Texto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarBloco('imagem')}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Imagem
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarBloco('video')}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Vídeo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarBloco('link')}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Link
                  </Button>
                </div>
              </div>

              {/* Blocos de Conteúdo */}
              <div className="space-y-4">
                {blocos.map((bloco, index) => (
                  <Card key={bloco.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="capitalize">
                          {bloco.tipo}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerBloco(bloco.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Título (opcional)</Label>
                        <Input
                          value={bloco.titulo || ""}
                          onChange={(e) => atualizarBloco(bloco.id, 'titulo', e.target.value)}
                          placeholder="Título do bloco"
                        />
                      </div>
                      
                      {bloco.tipo === 'texto' ? (
                        <div>
                          <Label>Conteúdo</Label>
                          <Textarea
                            value={bloco.conteudo}
                            onChange={(e) => atualizarBloco(bloco.id, 'conteudo', e.target.value)}
                            placeholder="Digite o texto..."
                            rows={4}
                          />
                        </div>
                      ) : (
                        <div>
                          <Label>URL</Label>
                          <Input
                            value={bloco.conteudo}
                            onChange={(e) => atualizarBloco(bloco.id, 'conteudo', e.target.value)}
                            placeholder={`URL da ${bloco.tipo}`}
                          />
                        </div>
                      )}
                      
                      {bloco.tipo !== 'texto' && (
                        <div>
                          <Label>Descrição (opcional)</Label>
                          <Input
                            value={bloco.descricao || ""}
                            onChange={(e) => atualizarBloco(bloco.id, 'descricao', e.target.value)}
                            placeholder="Descrição do conteúdo"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
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

      {/* Modal de Visualização */}
      <Dialog open={showVisualizacao} onOpenChange={setShowVisualizacao}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">{selectedReferencia?.titulo}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedReferencia && copiarLink(selectedReferencia.link_publico)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                  {selectedReferencia?.data_expiracao && (
                    <Badge variant="outline">
                      Expira em {format(new Date(selectedReferencia.data_expiracao), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Links Externos */}
            {selectedReferencia?.links_externos && selectedReferencia.links_externos.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Links Externos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedReferencia.links_externos.map((link: any, index: number) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{link.titulo || link.url}</span>
                    </a>
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Conteúdo */}
            <div className="space-y-6">
              {selectedReferencia?.conteudo?.map((bloco, index) => (
                <div key={index} className="space-y-4">
                  {renderizarBloco(bloco)}
                  {index < (selectedReferencia.conteudo?.length || 0) - 1 && (
                    <Separator className="my-6" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};