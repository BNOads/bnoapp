import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link2, ExternalLink, Plus, Globe, FileText, Video, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LinkImportante {
  id: string;
  titulo: string;
  url: string;
  tipo: string;
  created_at: string;
}

interface LinksImportantesProps {
  clienteId: string;
}

export const LinksImportantes = ({ clienteId }: LinksImportantesProps) => {
  const [links, setLinks] = useState<LinkImportante[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [novoLink, setNovoLink] = useState({
    titulo: '',
    url: '',
    tipo: 'geral',
  });
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
    loadLinks();
  }, [clienteId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links_importantes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar links importantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const criarLink = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Validar URL
      try {
        new URL(novoLink.url);
      } catch {
        toast({
          title: "Erro",
          description: "Por favor, insira uma URL válida",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('links_importantes')
        .insert({
          ...novoLink,
          cliente_id: clienteId,
          created_by: user.data.user.id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Link adicionado com sucesso",
      });

      setShowModal(false);
      setNovoLink({
        titulo: '',
        url: '',
        tipo: 'geral',
      });
      loadLinks();
    } catch (error) {
      console.error('Erro ao criar link:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar link",
        variant: "destructive",
      });
    }
  };

  const getTipoConfig = (tipo: string) => {
    switch (tipo) {
      case 'drive':
        return { icon: FileText, color: 'text-blue-600', label: 'Google Drive' };
      case 'video':
        return { icon: Video, color: 'text-red-600', label: 'Vídeo' };
      case 'ferramenta':
        return { icon: Settings, color: 'text-purple-600', label: 'Ferramenta' };
      case 'site':
        return { icon: Globe, color: 'text-green-600', label: 'Website' };
      default:
        return { icon: Link2, color: 'text-gray-600', label: 'Geral' };
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando links...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Links Importantes
          </CardTitle>
          {isAuthenticated && (
            <Dialog open={showModal} onOpenChange={setShowModal}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Link Importante</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Título do link"
                    value={novoLink.titulo}
                    onChange={(e) => setNovoLink({ ...novoLink, titulo: e.target.value })}
                  />
                  <Input
                    placeholder="https://exemplo.com"
                    value={novoLink.url}
                    onChange={(e) => setNovoLink({ ...novoLink, url: e.target.value })}
                  />
                  <Select
                    value={novoLink.tipo}
                    onValueChange={(value) => setNovoLink({ ...novoLink, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo do link" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="drive">Google Drive</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="ferramenta">Ferramenta</SelectItem>
                      <SelectItem value="site">Website</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={criarLink} className="flex-1">
                      Adicionar Link
                    </Button>
                    <Button variant="outline" onClick={() => setShowModal(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum link importante encontrado</p>
            <p className="text-sm">Adicione links relevantes para este cliente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const tipoConfig = getTipoConfig(link.tipo);
              const TipoIcon = tipoConfig.icon;
              
              return (
                <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <TipoIcon className={`h-4 w-4 ${tipoConfig.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold">{link.titulo}</h4>
                      <p className="text-sm text-muted-foreground">{tipoConfig.label}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};