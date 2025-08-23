import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link2, ExternalLink, Plus, Globe, FileText, Video, Settings, FolderOpen, BarChart3, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface LinkImportante {
  id: string;
  titulo: string;
  url: string;
  tipo: string;
  created_at: string;
}

interface Dashboard {
  titulo: string;
  url: string;
}

interface Cliente {
  nome: string;
  pasta_drive_url: string | null;
  dashboards_looker: any; // JSONB field from Supabase
}

interface LinksImportantesProps {
  clienteId: string;
}

export const LinksImportantes = ({ clienteId }: LinksImportantesProps) => {
  const [links, setLinks] = useState<LinkImportante[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [novoLink, setNovoLink] = useState({
    titulo: '',
    url: '',
    tipo: 'geral',
  });
  const [novoDashboard, setNovoDashboard] = useState({
    titulo: '',
    url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
    loadClienteData();
    loadLinks();
  }, [clienteId]);

  // Buscar dashboards automaticamente após carregar dados do cliente
  useEffect(() => {
    if (cliente?.nome) {
      buscarDashboardsAutomaticos();
    }
  }, [cliente?.nome]);

  const buscarDashboardsAutomaticos = async () => {
    if (!cliente?.nome) return;
    
    try {
      setLoadingDashboards(true);
      
      console.log('Buscando dashboards automaticamente para:', cliente.nome);
      
      const { data, error } = await supabase.functions.invoke('looker-studio-search', {
        body: { clienteNome: cliente.nome }
      });

      if (error) {
        console.error('Erro ao buscar dashboards:', error);
        return;
      }

      console.log('Resultado da busca de dashboards:', data);

      if (data?.success && data.dashboards && data.dashboards.length > 0) {
        // Filtrar dashboards que já não estão na lista
        const dashboardsExistentes = cliente.dashboards_looker || [];
        const urlsExistentes = dashboardsExistentes.map((d: any) => d.url);
        
        const novosDashboards = data.dashboards.filter((dashboard: any) => 
          !urlsExistentes.includes(dashboard.url)
        );

        if (novosDashboards.length > 0) {
          // Adicionar novos dashboards automaticamente
          const dashboardsAtualizados = [...dashboardsExistentes, ...novosDashboards];
          
          const { error: updateError } = await supabase
            .from('clientes')
            .update({ dashboards_looker: dashboardsAtualizados })
            .eq('id', clienteId);

          if (updateError) {
            console.error('Erro ao atualizar dashboards:', updateError);
          } else {
            toast({
              title: "Dashboards encontrados!",
              description: `${novosDashboards.length} dashboard(s) do Looker Studio foram adicionados automaticamente.`,
            });
            // Recarregar dados do cliente
            loadClienteData();
          }
        } else {
          console.log('Nenhum dashboard novo encontrado');
        }
      }
    } catch (error) {
      console.error('Erro na busca automática de dashboards:', error);
    } finally {
      setLoadingDashboards(false);
    }
  };

  const sincronizarDashboards = async () => {
    if (!cliente?.nome) {
      toast({
        title: "Erro",
        description: "Nome do cliente não encontrado",
        variant: "destructive",
      });
      return;
    }
    
    await buscarDashboardsAutomaticos();
  };

  const loadClienteData = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('nome, pasta_drive_url, dashboards_looker')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      setCliente(data);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    }
  };

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

  const adicionarDashboard = async () => {
    try {
      // Validar URL
      try {
        new URL(novoDashboard.url);
      } catch {
        toast({
          title: "Erro",
          description: "Por favor, insira uma URL válida",
          variant: "destructive",
        });
        return;
      }

      const dashboardsAtuais = cliente?.dashboards_looker || [];
      const novosDashboards = [...dashboardsAtuais, novoDashboard];

      const { error } = await supabase
        .from('clientes')
        .update({ dashboards_looker: novosDashboards })
        .eq('id', clienteId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dashboard adicionado com sucesso",
      });

      setShowDashboardModal(false);
      setNovoDashboard({ titulo: '', url: '' });
      loadClienteData();
    } catch (error) {
      console.error('Erro ao adicionar dashboard:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar dashboard",
        variant: "destructive",
      });
    }
  };

  const removerDashboard = async (index: number) => {
    try {
      const dashboardsAtuais = cliente?.dashboards_looker || [];
      const novosDashboards = dashboardsAtuais.filter((_, i) => i !== index);

      const { error } = await supabase
        .from('clientes')
        .update({ dashboards_looker: novosDashboards })
        .eq('id', clienteId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dashboard removido com sucesso",
      });

      loadClienteData();
    } catch (error) {
      console.error('Erro ao remover dashboard:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover dashboard",
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
            <div className="flex gap-2">
              <Dialog open={showDashboardModal} onOpenChange={setShowDashboardModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Dashboard Looker Studio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Nome do dashboard"
                      value={novoDashboard.titulo}
                      onChange={(e) => setNovoDashboard({ ...novoDashboard, titulo: e.target.value })}
                    />
                    <Input
                      placeholder="https://lookerstudio.google.com/..."
                      value={novoDashboard.url}
                      onChange={(e) => setNovoDashboard({ ...novoDashboard, url: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button onClick={adicionarDashboard} className="flex-1">
                        Adicionar Dashboard
                      </Button>
                      <Button variant="outline" onClick={() => setShowDashboardModal(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

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
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Links Automáticos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Links Automáticos
            </h3>
            {isAuthenticated && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={sincronizarDashboards}
                disabled={loadingDashboards}
                className="text-xs"
              >
                {loadingDashboards ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Sincronizar
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {/* Link do Google Drive */}
            {cliente?.pasta_drive_url && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Pasta Google Drive</h4>
                    <p className="text-sm text-muted-foreground">Arquivos do cliente</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href={cliente.pasta_drive_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Drive
                  </a>
                </Button>
              </div>
            )}

            {/* Dashboards Looker Studio */}
            {cliente?.dashboards_looker && cliente.dashboards_looker.length > 0 && (
              <>
                {cliente.dashboards_looker.map((dashboard, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{dashboard.titulo}</h4>
                        <p className="text-sm text-muted-foreground">Dashboard Looker Studio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={dashboard.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </a>
                      </Button>
                      {isAuthenticated && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removerDashboard(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {!cliente?.pasta_drive_url && (!cliente?.dashboards_looker || cliente.dashboards_looker.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Nenhum link automático configurado</p>
              </div>
            )}
          </div>
        </div>

        {/* Separador */}
        {links.length > 0 && <Separator />}

        {/* Links Manuais */}
        {links.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
              Links Adicionais
            </h3>
            <div className="space-y-3">
              {links.map((link) => {
                const tipoConfig = getTipoConfig(link.tipo);
                const TipoIcon = tipoConfig.icon;
                
                return (
                  <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
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
          </div>
        )}

        {/* Mensagem quando não há links manuais */}
        {links.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum link adicional encontrado</p>
            <p className="text-sm">Adicione links relevantes para este cliente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};