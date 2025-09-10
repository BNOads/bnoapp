import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ExternalLink, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExternalLink {
  id?: string;
  titulo: string;
  url: string;
}

interface PDIExternalLinksProps {
  pdiId: string;
  links: ExternalLink[];
  onLinksUpdate: (links: ExternalLink[]) => void;
  canEdit?: boolean;
}

export function PDIExternalLinks({ pdiId, links, onLinksUpdate, canEdit = false }: PDIExternalLinksProps) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    url: ""
  });
  const [loading, setLoading] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleOpenModal = (link?: ExternalLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        titulo: link.titulo,
        url: link.url
      });
    } else {
      setEditingLink(null);
      setFormData({
        titulo: "",
        url: ""
      });
    }
    setShowModal(true);
  };

  const handleSaveLink = async () => {
    if (!formData.titulo.trim() || !formData.url.trim()) {
      toast({
        title: "Erro",
        description: "Título e URL são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!validateUrl(formData.url)) {
      toast({
        title: "Erro",
        description: "URL deve começar com http:// ou https://",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const newLink = {
        titulo: formData.titulo.trim(),
        url: formData.url.trim()
      };

      let updatedLinks: ExternalLink[];

      if (editingLink && editingLink.id) {
        // Editando link existente
        updatedLinks = links.map(link => 
          link.id === editingLink.id ? { ...link, ...newLink } : link
        );
      } else {
        // Adicionando novo link
        updatedLinks = [...links, { ...newLink, id: Date.now().toString() }];
      }

      // Salvar no banco de dados
      const { error } = await supabase
        .from('pdis')
        .update({
          links_externos: updatedLinks
        })
        .eq('id', pdiId);

      if (error) throw error;

      onLinksUpdate(updatedLinks);

      toast({
        title: "Sucesso",
        description: editingLink ? "Link atualizado com sucesso!" : "Link adicionado com sucesso!"
      });

      setShowModal(false);
      setFormData({ titulo: "", url: "" });
      setEditingLink(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao salvar link: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const updatedLinks = links.filter(link => link.id !== linkId);

      const { error } = await supabase
        .from('pdis')
        .update({
          links_externos: updatedLinks
        })
        .eq('id', pdiId);

      if (error) throw error;

      onLinksUpdate(updatedLinks);

      toast({
        title: "Sucesso",
        description: "Link removido com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao remover link: " + error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Links Externos</CardTitle>
          {canEdit && (
            <Dialog open={showModal} onOpenChange={setShowModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingLink ? "Editar Link" : "Adicionar Link Externo"}
                  </DialogTitle>
                  <DialogDescription>
                    Adicione links úteis relacionados ao PDI. URLs devem começar com http:// ou https://
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="titulo">Título</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Documentação do Curso"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://exemplo.com"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveLink} disabled={loading}>
                    {loading ? "Salvando..." : editingLink ? "Atualizar" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {links.length > 0 ? (
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{link.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  {canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(link)}
                        title="Editar link"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLink(link.id!)}
                        title="Remover link"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum link externo adicionado</p>
            {canEdit && (
              <p className="text-sm">Clique em "Adicionar Link" para incluir links úteis</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}