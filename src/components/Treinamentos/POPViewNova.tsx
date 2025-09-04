import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Search, 
  FileText, 
  Calendar, 
  User, 
  ChevronRight, 
  Star, 
  Clock,
  Plus,
  RefreshCw,
  Eye,
  Copy,
  Link,
  Settings,
  Check,
  ExternalLink
} from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { POPDocumentNovo } from "./POPDocumentNovo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface POP {
  id: string;
  titulo: string;
  categoria_documento: string;
  updated_at: string;
  tipo: string;
  icone: string;
  autor: string;
  tags: string[];
  link_publico: string | null;
  link_publico_ativo: boolean;
  conteudo: string;
}

export const POPViewNova = () => {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [pops, setPOPs] = useState<POP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoPOPModal, setShowNovoPOPModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [novoPOPData, setNovoPOPData] = useState({
    titulo: "",
    tipo: "Procedimento",
    icone: "📄",
    autor: "",
    tags: "",
    conteudo: "",
    link_publico_ativo: false
  });
  
  const { toast } = useToast();
  const { isAdmin, canCreateContent } = useUserPermissions();
  
  const {
    searchTerm,
    setSearchTerm,
    filteredItems
  } = useSearch(pops, ['titulo', 'tipo', 'autor']);

  useEffect(() => {
    carregarPOPs();
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('pop-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const carregarPOPs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('categoria_documento', 'pop')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPOPs(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar POPs: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const criarNovoPOP = async () => {
    try {
      const tagsArray = novoPOPData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const { error } = await supabase
        .from('documentos')
        .insert({
          titulo: novoPOPData.titulo,
          categoria_documento: 'pop',
          tipo: novoPOPData.tipo,
          icone: novoPOPData.icone,
          autor: novoPOPData.autor,
          tags: tagsArray,
          conteudo: novoPOPData.conteudo,
          link_publico_ativo: novoPOPData.link_publico_ativo,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "POP criado com sucesso!",
      });

      setShowNovoPOPModal(false);
      setNovoPOPData({
        titulo: "",
        tipo: "Procedimento",
        icone: "📄",
        autor: "",
        tags: "",
        conteudo: "",
        link_publico_ativo: false
      });
      carregarPOPs();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao criar POP: " + error.message,
        variant: "destructive",
      });
    }
  };

  const sincronizarPOPs = async () => {
    toast({
      title: "Sincronizando",
      description: "Atualizando lista de POPs...",
    });
    await carregarPOPs();
    toast({
      title: "Sincronizado",
      description: "POPs atualizados com sucesso!",
    });
  };

  const toggleLinkPublico = async (popId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('documentos')
        .update({ link_publico_ativo: ativo })
        .eq('id', popId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Link público ${ativo ? 'ativado' : 'desativado'} com sucesso!`,
      });

      carregarPOPs();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar link público: " + error.message,
        variant: "destructive",
      });
    }
  };

  const copiarLinkPublico = async (linkPublico: string) => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiedLink(linkPublico);
      setTimeout(() => setCopiedLink(null), 2000);
      toast({
        title: "Link copiado!",
        description: "Link público copiado para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar link",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = (docId: string) => {
    const newFavorites = favorites.includes(docId) 
      ? favorites.filter(id => id !== docId)
      : [...favorites, docId];
    
    setFavorites(newFavorites);
    localStorage.setItem('pop-favorites', JSON.stringify(newFavorites));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Dashboard': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'Estratégia': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'Métricas': 'bg-green-500/10 text-green-600 border-green-500/20',
      'Comunicação': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'Campanhas': 'bg-pink-500/10 text-pink-600 border-pink-500/20'
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const favoriteItems = filteredItems.filter(item => favorites.includes(item.id));

  if (selectedDocument) {
    return (
      <POPDocumentNovo 
        documentId={selectedDocument} 
        onBack={() => setSelectedDocument(null)} 
      />
    );
  }

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
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">POPs & Procedimentos</h2>
            <p className="text-muted-foreground">Biblioteca de procedimentos operacionais padrão</p>
          </div>
        </div>

        {/* Actions and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar procedimentos..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={sincronizarPOPs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar
            </Button>
            <Button variant="outline" onClick={() => { setLoading(true); carregarPOPs(); }}>
              <Eye className="h-4 w-4 mr-2" />
              Verificar POPs
            </Button>
            {canCreateContent && (
              <Button onClick={() => setShowNovoPOPModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar POP
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Favorites */}
        {favoriteItems.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <h3 className="font-semibold">Favoritos</h3>
            </div>
            <div className="space-y-2">
              {favoriteItems.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => setSelectedDocument(item.id)}
                >
                  <span className="text-lg">{item.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">{item.tipo}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recentes</h3>
          </div>
          <div className="space-y-2">
            {filteredItems.slice(0, 3).map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => setSelectedDocument(item.id)}
              >
                <span className="text-lg">{item.icone}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Separator />

      {/* All Documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Todos os Documentos</h3>
          <Badge variant="outline" className="text-xs">
            {filteredItems.length} documentos
          </Badge>
        </div>

        <div className="space-y-2">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedDocument(item.id)}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <span className="text-xl">{item.icone}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground mb-1 truncate">
                        {item.titulo}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(item.updated_at).toLocaleDateString('pt-BR')}</span>
                        <span>{item.autor}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.tipo}
                        </Badge>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1">
                            {item.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* Link Público */}
                      {item.link_publico && (
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLinkPublico(item.id, !item.link_publico_ativo);
                              }}
                              className={item.link_publico_ativo ? 'text-green-600' : 'text-muted-foreground'}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          )}
                          {item.link_publico_ativo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copiarLinkPublico(item.link_publico);
                              }}
                            >
                              {copiedLink === item.link_publico ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                      >
                        <Star 
                          className={`h-4 w-4 ${
                            favorites.includes(item.id) 
                              ? 'text-yellow-500 fill-yellow-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal Novo POP */}
      <Dialog open={showNovoPOPModal} onOpenChange={setShowNovoPOPModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo POP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={novoPOPData.titulo}
                  onChange={(e) => setNovoPOPData({ ...novoPOPData, titulo: e.target.value })}
                  placeholder="Nome do procedimento"
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={novoPOPData.tipo}
                  onChange={(e) => setNovoPOPData({ ...novoPOPData, tipo: e.target.value })}
                  placeholder="Procedimento, Tutorial, Guia, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icone">Ícone (emoji)</Label>
                <Input
                  id="icone"
                  value={novoPOPData.icone}
                  onChange={(e) => setNovoPOPData({ ...novoPOPData, icone: e.target.value })}
                  placeholder="📄"
                />
              </div>
              <div>
                <Label htmlFor="autor">Autor</Label>
                <Input
                  id="autor"
                  value={novoPOPData.autor}
                  onChange={(e) => setNovoPOPData({ ...novoPOPData, autor: e.target.value })}
                  placeholder="Nome do autor"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={novoPOPData.tags}
                onChange={(e) => setNovoPOPData({ ...novoPOPData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div>
              <Label htmlFor="conteudo">Conteúdo (Markdown)</Label>
              <Textarea
                id="conteudo"
                value={novoPOPData.conteudo}
                onChange={(e) => setNovoPOPData({ ...novoPOPData, conteudo: e.target.value })}
                placeholder="# Título do POP&#10;&#10;## Objetivo&#10;&#10;Descrição do procedimento..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="link-publico"
                checked={novoPOPData.link_publico_ativo}
                onCheckedChange={(checked) => setNovoPOPData({ ...novoPOPData, link_publico_ativo: checked })}
              />
              <Label htmlFor="link-publico">Ativar link público</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNovoPOPModal(false)}>
                Cancelar
              </Button>
              <Button onClick={criarNovoPOP} disabled={!novoPOPData.titulo || !novoPOPData.conteudo}>
                Criar POP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};