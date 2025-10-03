import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Link2, ExternalLink, Plus, Globe, FileText, Video, Settings, FolderOpen, BarChart3, Trash2, RefreshCw, Search, Edit, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  dashboards_looker: any;
}
interface LinksImportantesProps {
  clienteId: string;
  isPublicView?: boolean;
}
const LINKS_PER_PAGE = 3;
export const LinksImportantesEnhanced = ({
  clienteId,
  isPublicView = false
}: LinksImportantesProps) => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkImportante[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkImportante | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [novoLink, setNovoLink] = useState({
    titulo: '',
    url: '',
    tipo: 'geral'
  });
  const [novoDashboard, setNovoDashboard] = useState({
    titulo: '',
    url: ''
  });
  const {
    toast
  } = useToast();

  // Search functionality
  const {
    searchTerm,
    setSearchTerm,
    filteredItems: filteredLinks
  } = useSearch(links, ['titulo', 'url']);

  // Pagination logic
  const totalPages = Math.ceil(filteredLinks.length / LINKS_PER_PAGE);
  const startIndex = (currentPage - 1) * LINKS_PER_PAGE;
  const endIndex = startIndex + LINKS_PER_PAGE;
  const currentLinks = filteredLinks.slice(startIndex, endIndex);
  useEffect(() => {
    const checkAuth = async () => {
      if (!isPublicView) {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
    loadClienteData();
    loadLinks();
  }, [clienteId, isPublicView]);
  useEffect(() => {
    if (cliente?.nome && isAuthenticated && !isPublicView) {
      buscarDashboardsAutomaticos();
    }
  }, [cliente?.nome, isAuthenticated, isPublicView]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  const buscarDashboardsAutomaticos = async () => {
    if (!cliente?.nome || isPublicView) return;
    try {
      setLoadingDashboards(true);
      const {
        data,
        error
      } = await supabase.functions.invoke('looker-studio-search', {
        body: {
          clienteNome: cliente.nome
        }
      });
      if (error) {
        console.error('Erro ao buscar dashboards:', error);
        return;
      }
      if (data?.success && data.dashboards && data.dashboards.length > 0) {
        const dashboardsExistentes = cliente.dashboards_looker || [];
        const urlsExistentes = dashboardsExistentes.map((d: any) => d.url);
        const novosDashboards = data.dashboards.filter((dashboard: any) => !urlsExistentes.includes(dashboard.url));
        if (novosDashboards.length > 0) {
          const dashboardsAtualizados = [...dashboardsExistentes, ...novosDashboards];
          const {
            error: updateError
          } = await supabase.from('clientes').update({
            dashboards_looker: dashboardsAtualizados
          }).eq('id', clienteId);
          if (updateError) {
            console.error('Erro ao atualizar dashboards:', updateError);
          } else {
            toast({
              title: "Dashboards encontrados!",
              description: `${novosDashboards.length} dashboard(s) do Looker Studio foram adicionados automaticamente.`
            });
            loadClienteData();
          }
        }
      }
    } catch (error) {
      console.error('Erro na busca automática de dashboards:', error);
    } finally {
      setLoadingDashboards(false);
    }
  };
  const loadClienteData = async () => {
    try {
      let clientInstance = supabase;
      if (isPublicView) {
        const {
          createPublicSupabaseClient
        } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }
      const {
        data,
        error
      } = await clientInstance.from('clientes').select('nome, pasta_drive_url, dashboards_looker').eq('id', clienteId).maybeSingle();
      if (error) throw error;
      if (data) {
        setCliente(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    }
  };
  const loadLinks = async () => {
    try {
      let clientInstance = supabase;
      if (isPublicView) {
        const {
          createPublicSupabaseClient
        } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }
      const {
        data,
        error
      } = await clientInstance.from('links_importantes').select('*').eq('cliente_id', clienteId).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar links importantes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const criarLink = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Validar URL - trim and check format
      const urlTrimmed = novoLink.url.trim();
      if (!urlTrimmed || !/^https?:\/\/.+/.test(urlTrimmed)) {
        toast({
          title: "Erro",
          description: "Por favor, insira uma URL válida",
          variant: "destructive"
        });
        return;
      }
      const {
        error
      } = await supabase.from('links_importantes').insert({
        ...novoLink,
        url: urlTrimmed,
        cliente_id: clienteId,
        created_by: user.data.user.id
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Link adicionado com sucesso"
      });
      setShowModal(false);
      setNovoLink({
        titulo: '',
        url: '',
        tipo: 'geral'
      });
      loadLinks();
    } catch (error) {
      console.error('Erro ao criar link:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar link",
        variant: "destructive"
      });
    }
  };
  const editarLink = async () => {
    if (!editingLink) return;
    try {
      // Validar URL - trim and check format
      const urlTrimmed = editingLink.url.trim();
      if (!urlTrimmed || !/^https?:\/\/.+/.test(urlTrimmed)) {
        toast({
          title: "Erro",
          description: "Por favor, insira uma URL válida",
          variant: "destructive"
        });
        return;
      }
      const {
        error
      } = await supabase.from('links_importantes').update({
        titulo: editingLink.titulo,
        url: urlTrimmed,
        tipo: editingLink.tipo
      }).eq('id', editingLink.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Link atualizado com sucesso"
      });
      setShowEditModal(false);
      setEditingLink(null);
      loadLinks();
    } catch (error) {
      console.error('Erro ao editar link:', error);
      toast({
        title: "Erro",
        description: "Erro ao editar link",
        variant: "destructive"
      });
    }
  };
  const excluirLink = async (linkId: string) => {
    try {
      const {
        error
      } = await supabase.from('links_importantes').delete().eq('id', linkId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Link removido com sucesso"
      });
      loadLinks();
      // Adjust pagination if necessary
      if (currentLinks.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('Erro ao excluir link:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover link",
        variant: "destructive"
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
          variant: "destructive"
        });
        return;
      }
      const dashboardsAtuais = cliente?.dashboards_looker || [];
      const novosDashboards = [...dashboardsAtuais, novoDashboard];
      const {
        error
      } = await supabase.from('clientes').update({
        dashboards_looker: novosDashboards
      }).eq('id', clienteId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Dashboard adicionado com sucesso"
      });
      setShowDashboardModal(false);
      setNovoDashboard({
        titulo: '',
        url: ''
      });
      loadClienteData();
    } catch (error) {
      console.error('Erro ao adicionar dashboard:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar dashboard",
        variant: "destructive"
      });
    }
  };
  const removerDashboard = async (index: number) => {
    try {
      const dashboardsAtuais = cliente?.dashboards_looker || [];
      const novosDashboards = dashboardsAtuais.filter((_, i) => i !== index);
      const {
        error
      } = await supabase.from('clientes').update({
        dashboards_looker: novosDashboards
      }).eq('id', clienteId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Dashboard removido com sucesso"
      });
      loadClienteData();
    } catch (error) {
      console.error('Erro ao remover dashboard:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover dashboard",
        variant: "destructive"
      });
    }
  };
  const getTipoConfig = (tipo: string) => {
    switch (tipo) {
      case 'drive':
        return {
          icon: FileText,
          color: 'text-blue-600',
          label: 'Google Drive'
        };
      case 'video':
        return {
          icon: Video,
          color: 'text-red-600',
          label: 'Vídeo'
        };
      case 'ferramenta':
        return {
          icon: Settings,
          color: 'text-purple-600',
          label: 'Ferramenta'
        };
      case 'site':
        return {
          icon: Globe,
          color: 'text-green-600',
          label: 'Website'
        };
      default:
        return {
          icon: Link2,
          color: 'text-gray-600',
          label: 'Geral'
        };
    }
  };
  if (loading) {
    return <div className="text-center py-4">Carregando links...</div>;
  }
  return <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          
          {isAuthenticated && <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(`/criativos/${clienteId}`, {
            state: {
              from: `/painel/${clienteId}`
            }
          })}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Criativos
              </Button>
              
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
                    <Input placeholder="Nome do dashboard" value={novoDashboard.titulo} onChange={e => setNovoDashboard({
                  ...novoDashboard,
                  titulo: e.target.value
                })} />
                    <Input placeholder="https://lookerstudio.google.com/..." value={novoDashboard.url} onChange={e => setNovoDashboard({
                  ...novoDashboard,
                  url: e.target.value
                })} />
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
                    <Input placeholder="Título do link" value={novoLink.titulo} onChange={e => setNovoLink({
                  ...novoLink,
                  titulo: e.target.value
                })} />
                    <Input placeholder="https://exemplo.com" value={novoLink.url} onChange={e => setNovoLink({
                  ...novoLink,
                  url: e.target.value
                })} />
                    <Select value={novoLink.tipo} onValueChange={value => setNovoLink({
                  ...novoLink,
                  tipo: value
                })}>
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
            </div>}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Links Automáticos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Links Automáticos
            </h3>
            {isAuthenticated && <Button size="sm" variant="ghost" onClick={() => buscarDashboardsAutomaticos()} disabled={loadingDashboards} className="text-xs">
                {loadingDashboards ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Sincronizar
              </Button>}
          </div>
          <div className="space-y-3">
            {/* Link do Google Drive */}
            {cliente?.pasta_drive_url && <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
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
              </div>}

            {/* Dashboards Looker Studio */}
            {cliente?.dashboards_looker && cliente.dashboards_looker.length > 0 && <>
                {cliente.dashboards_looker.map((dashboard, index) => <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{dashboard.titulo}</h4>
                        <p className="text-sm text-muted-foreground">Dashboard Looker Studio</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={dashboard.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </a>
                      </Button>
                      {isAuthenticated && <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Dashboard</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover este dashboard? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removerDashboard(index)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>}
                    </div>
                  </div>)}
              </>}
          </div>
        </div>

        <Separator />

        {/* Links Manuais */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Links Manuais
            </h3>
            {links.length > 0 && <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Buscar links..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-64" />
              </div>}
          </div>
          
          {filteredLinks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? <p>Nenhum link encontrado para "{searchTerm}"</p> : links.length === 0 ? <p>Nenhum link manual adicionado</p> : null}
            </div> : <>
              <div className="space-y-3">
                {currentLinks.map(link => {
              const tipoConfig = getTipoConfig(link.tipo);
              const TipoIcon = tipoConfig.icon;
              return <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <TipoIcon className={`h-4 w-4 ${tipoConfig.color}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold">{link.titulo}</h4>
                          <p className="text-sm text-muted-foreground">{tipoConfig.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir
                          </a>
                        </Button>
                        {isAuthenticated && <>
                            <Button size="sm" variant="outline" onClick={() => {
                      setEditingLink(link);
                      setShowEditModal(true);
                    }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Link</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover o link "{link.titulo}"? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => excluirLink(link.id)}>
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>}
                      </div>
                    </div>;
            })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                      </PaginationItem>
                      
                      {Array.from({
                  length: totalPages
                }, (_, i) => i + 1).map(page => <PaginationItem key={page}>
                          <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                            {page}
                          </PaginationLink>
                        </PaginationItem>)}
                      
                      <PaginationItem>
                        <PaginationNext onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>}
            </>}
        </div>
      </CardContent>

      {/* Edit Link Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Link</DialogTitle>
          </DialogHeader>
          {editingLink && <div className="space-y-4">
              <Input placeholder="Título do link" value={editingLink.titulo} onChange={e => setEditingLink({
            ...editingLink,
            titulo: e.target.value
          })} />
              <Input placeholder="https://exemplo.com" value={editingLink.url} onChange={e => setEditingLink({
            ...editingLink,
            url: e.target.value
          })} />
              <Select value={editingLink.tipo} onValueChange={value => setEditingLink({
            ...editingLink,
            tipo: value
          })}>
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
                <Button onClick={editarLink} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </Card>;
};