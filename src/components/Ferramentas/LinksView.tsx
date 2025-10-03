import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, ExternalLink, Edit, Archive, MoreVertical, Copy, Trash2, Globe, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/components/Auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LinkImportante {
  id: string;
  titulo: string;
  url: string;
  cliente_id: string;
  tipo: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  cliente?: {
    nome: string;
  };
}

interface Cliente {
  id: string;
  nome: string;
}

const categorias = [
  "Site",
  "Checkout", 
  "Drive",
  "Catálogo",
  "Dashboard",
  "Social Media",
  "Email",
  "WhatsApp",
  "Outros"
];

const statusOptions = [
  { value: "ativo", label: "Ativo" },
  { value: "arquivado", label: "Arquivado" }
];

export const LinksView = () => {
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [links, setLinks] = useState<LinkImportante[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<LinkImportante[]>([]);
  
  // Filters
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ativo");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkImportante | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    titulo: "",
    url: "",
    cliente_id: "",
    tipo: "Site"
  });
  
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadClientes();
    loadLinks();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [links, selectedClientes, selectedCategorias, selectedStatus, searchTerm]);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de clientes",
        variant: "destructive",
      });
    }
  };

  const loadLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("links_importantes")
        .select(`
          *,
          cliente:clientes(nome)
        `)
        .order("titulo");

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Erro ao carregar links:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...links];

    // Filter by clientes
    if (selectedClientes.length > 0) {
      filtered = filtered.filter(link => selectedClientes.includes(link.cliente_id));
    }

    // Filter by categorias
    if (selectedCategorias.length > 0) {
      filtered = filtered.filter(link => selectedCategorias.includes(link.tipo));
    }

    // Filter by status (assuming active links don't have a status field, treat all as active)
    // Since the table doesn't have a status field, we'll show all for now

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(link => 
        link.titulo.toLowerCase().includes(search) ||
        link.url.toLowerCase().includes(search) ||
        link.cliente?.nome?.toLowerCase().includes(search)
      );
    }

    setFilteredLinks(filtered);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const handleCreate = async () => {
    if (!user || !formData.titulo || !formData.url || !formData.cliente_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validate URL - trim and check format
    const urlTrimmed = formData.url.trim();
    if (!urlTrimmed || !/^https?:\/\/.+/.test(urlTrimmed)) {
      toast({
        title: "Erro",
        description: "URL inválida. Use o formato: https://exemplo.com",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("links_importantes")
        .insert({
          ...formData,
          url: formData.url.trim(),
          created_by: user.id,
        })
        .select(`
          *,
          cliente:clientes(nome)
        `)
        .single();

      if (error) throw error;

      setLinks([...links, data]);
      setFormData({ titulo: "", url: "", cliente_id: "", tipo: "Site" });
      setIsCreateModalOpen(false);
      
      toast({
        title: "Sucesso",
        description: "Link criado com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao criar link:", error);
      if (error.code === '23505') {
        toast({
          title: "Erro",
          description: "Este link já existe para este cliente",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível criar o link",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = async () => {
    if (!editingLink || !formData.titulo || !formData.url || !formData.cliente_id) return;

    // Validate URL - trim and check format
    const urlTrimmed = formData.url.trim();
    if (!urlTrimmed || !/^https?:\/\/.+/.test(urlTrimmed)) {
      toast({
        title: "Erro",
        description: "URL inválida. Use o formato: https://exemplo.com",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("links_importantes")
        .update({
          titulo: formData.titulo,
          url: urlTrimmed,
          cliente_id: formData.cliente_id,
          tipo: formData.tipo,
        })
        .eq("id", editingLink.id)
        .select(`
          *,
          cliente:clientes(nome)
        `)
        .single();

      if (error) throw error;

      setLinks(links.map(link => link.id === editingLink.id ? data : link));
      setEditingLink(null);
      setFormData({ titulo: "", url: "", cliente_id: "", tipo: "Site" });
      
      toast({
        title: "Sucesso",
        description: "Link atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao editar link:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o link",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("links_importantes")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setLinks(links.filter(link => link.id !== linkId));
      
      toast({
        title: "Sucesso",
        description: "Link excluído com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir link:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o link",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Copiado!",
        description: "Link copiado para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (link: LinkImportante) => {
    setEditingLink(link);
    setFormData({
      titulo: link.titulo,
      url: link.url,
      cliente_id: link.cliente_id,
      tipo: link.tipo,
    });
  };

  const resetEditModal = () => {
    setEditingLink(null);
    setFormData({ titulo: "", url: "", cliente_id: "", tipo: "Site" });
  };

  // Group links by client
  const groupedLinks = filteredLinks.reduce((acc, link) => {
    const clienteName = link.cliente?.nome || "Cliente não encontrado";
    if (!acc[clienteName]) {
      acc[clienteName] = [];
    }
    acc[clienteName].push(link);
    return acc;
  }, {} as Record<string, LinkImportante[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Links Importantes</h2>
          <p className="text-muted-foreground">
            Gerencie todos os links importantes organizados por cliente
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Site Principal"
                />
              </div>
              
              <div>
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://exemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="tipo">Categoria</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>
                Criar Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, URL ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Clientes Filter */}
            <div>
              <Label>Clientes</Label>
              <Select
                value={selectedClientes.length === 1 ? selectedClientes[0] : "todos"}
                onValueChange={(value) => setSelectedClientes(value === "todos" ? [] : [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categorias Filter */}
            <div>
              <Label>Categorias</Label>
              <Select
                value={selectedCategorias.length === 1 ? selectedCategorias[0] : "todas"}
                onValueChange={(value) => setSelectedCategorias(value === "todas" ? [] : [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedClientes([]);
                  setSelectedCategorias([]);
                  setSearchTerm("");
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {filteredLinks.length} link(s) encontrado(s)
          </p>
        </div>

        {Object.keys(groupedLinks).length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Nenhum link encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(groupedLinks).map(([clienteName, clienteLinks]) => (
              <AccordionItem key={clienteName} value={clienteName} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <span className="font-medium">{clienteName}</span>
                    <Badge variant="secondary">
                      {clienteLinks.length} link(s)
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {clienteLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <img
                            src={getFaviconUrl(link.url) || "/placeholder.svg"}
                            alt=""
                            className="h-6 w-6 rounded"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg";
                            }}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:text-primary transition-colors flex items-center gap-1"
                              >
                                {link.titulo}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {link.url}
                            </p>
                          </div>
                          
                          <Badge variant="outline">
                            {link.tipo}
                          </Badge>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.open(link.url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(link.url)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openEditModal(link)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o link "{link.titulo}"?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(link.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingLink} onOpenChange={() => resetEditModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-cliente">Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-titulo">Título *</Label>
              <Input
                id="edit-titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Site Principal"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-url">URL *</Label>
              <Input
                id="edit-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://exemplo.com"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-tipo">Categoria</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={resetEditModal}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};