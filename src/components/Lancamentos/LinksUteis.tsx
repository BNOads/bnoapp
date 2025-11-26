import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Copy, 
  Plus, 
  Trash2, 
  GripVertical, 
  Edit2,
  Save,
  X,
  Link as LinkIcon,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Link {
  id: string;
  nome: string;
  url: string;
  ordem: number;
}

interface LinksUteisProps {
  lancamentoId: string;
}

const SortableLink = ({ link, onEdit, onDelete, editing, editingLink, setEditingLink, onSave, onCancel }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const normalizeUrl = (url: string) => {
    if (!url) return url;
    if (!/^https?:\/\//i.test(url)) {
      return `https://${url}`;
    }
    return url;
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('✔ Copiado!', { duration: 2000 });
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const isValid = isValidUrl(link.url);

  if (editing && editingLink?.id === link.id) {
    return (
      <div ref={setNodeRef} style={style} className="bg-background border rounded-lg p-3 space-y-2">
        <div>
          <Label className="text-xs">Nome</Label>
          <Input 
            value={editingLink.nome}
            onChange={(e) => setEditingLink({ ...editingLink, nome: e.target.value })}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">URL</Label>
          <Input 
            value={editingLink.url}
            onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" />
            Cancelar
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="h-3 w-3 mr-1" />
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-background border rounded-lg p-3 flex items-center gap-3 group hover:shadow-md transition-shadow">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{link.nome}</div>
        <div className="text-xs text-muted-foreground truncate">{link.url}</div>
      </div>

      <div className="flex items-center gap-2">
        {!isValid && (
          <span className="text-red-500 text-xs">🚫</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleCopy(link.url)}
          className="h-8 w-8 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
        {isValid && (
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-8 w-8 p-0"
          >
            <a href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(link)}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(link.id)}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default function LinksUteis({ lancamentoId }: LinksUteisProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [newLink, setNewLink] = useState({ nome: '', url: '' });
  const [editandoUrls, setEditandoUrls] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchLinks();
  }, [lancamentoId]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('lancamento_links')
        .select('*')
        .eq('lancamento_id', lancamentoId)
        .order('ordem');

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar links');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newLink.nome || !newLink.url) {
      toast.error('Preencha nome e URL');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('lancamento_links')
        .insert({
          lancamento_id: lancamentoId,
          nome: newLink.nome,
          url: newLink.url,
          ordem: links.length,
          criado_por: userData.user.id
        });

      if (error) throw error;
      
      toast.success('Link adicionado');
      setNewLink({ nome: '', url: '' });
      setAdding(false);
      fetchLinks();
    } catch (error: any) {
      toast.error('Erro ao adicionar link');
    }
  };

  const handleEdit = (link: Link) => {
    setEditingLink(link);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLink) return;

    try {
      const { error } = await supabase
        .from('lancamento_links')
        .update({ nome: editingLink.nome, url: editingLink.url })
        .eq('id', editingLink.id);

      if (error) throw error;
      
      toast.success('Link atualizado');
      setEditing(false);
      setEditingLink(null);
      fetchLinks();
    } catch (error: any) {
      toast.error('Erro ao atualizar link');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lancamento_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Link removido');
      fetchLinks();
    } catch (error: any) {
      toast.error('Erro ao remover link');
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLinks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update ordem in database
        newOrder.forEach((link, index) => {
          supabase
            .from('lancamento_links')
            .update({ ordem: index })
            .eq('id', link.id)
            .then(() => {});
        });

        return newOrder;
      });
    }
  };

  const camposPredefinidos = [
    { nome: 'Página de Captura', descricao: 'Link da página de captura de leads' },
    { nome: 'Página de Vendas / Checkout', descricao: 'Link da página de vendas' },
    { nome: 'Planilha de Leads', descricao: 'Planilha de controle de leads' },
    { nome: 'Planilha de Compradores', descricao: 'Planilha de controle de vendas' },
    { nome: 'Pasta do Drive do Lançamento', descricao: 'Pasta com materiais do lançamento' },
    { nome: 'Formulário de Pesquisa / NPS', descricao: 'Pesquisa de satisfação' },
    { nome: 'Biblioteca de Criativos', descricao: 'Catálogo de criativos aprovados' }
  ];

  const getLinkByCategoria = (categoria: string) => {
    return links.find(link => link.nome === categoria);
  };

  const handleAddPredefined = async (categoria: string) => {
    setNewLink({ nome: categoria, url: '' });
    setAdding(true);
  };

  const handleQuickAdd = async (categoria: string, url: string) => {
    if (!url) {
      toast.error('Preencha a URL');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('lancamento_links')
        .insert({
          lancamento_id: lancamentoId,
          nome: categoria,
          url: url,
          ordem: links.length,
          criado_por: userData.user.id
        });

      if (error) throw error;
      
      toast.success('Link adicionado');
      fetchLinks();
    } catch (error: any) {
      toast.error('Erro ao adicionar link');
    }
  };

  if (loading) return <div>Carregando links...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Links Úteis do Lançamento
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setAdding(!adding);
              setNewLink({ nome: '', url: '' });
            }}
            variant={adding ? 'outline' : 'default'}
          >
            {adding ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {adding ? 'Cancelar' : 'Link Personalizado'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <Card className="bg-muted/50 border-2 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div>
                <Label>Nome do Link</Label>
                <Input
                  placeholder="Nome personalizado do link"
                  value={newLink.nome}
                  onChange={(e) => setNewLink({ ...newLink, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setAdding(false);
                  setNewLink({ nome: '', url: '' });
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd}>Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categorias Pré-definidas */}
        <div className="space-y-2">
          {camposPredefinidos.map((campo) => {
            const linkExistente = getLinkByCategoria(campo.nome);

            return (
              <Card 
                key={campo.nome} 
                className={linkExistente ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{campo.nome}</h4>
                        {linkExistente ? (
                          <Badge variant="default" className="bg-green-600 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            Adicionado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500 text-white">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{campo.descricao}</p>
                      
                      {linkExistente ? (
                        <div className="flex items-center gap-2 pt-2">
                          {editing && editingLink?.id === linkExistente.id ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={editingLink.url}
                                onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                                className="h-8 text-xs"
                              />
                              <Button size="sm" variant="outline" onClick={() => {
                                setEditing(false);
                                setEditingLink(null);
                              }}>
                                <X className="h-3 w-3" />
                              </Button>
                              <Button size="sm" onClick={handleSaveEdit}>
                                <Save className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 text-xs text-muted-foreground truncate font-mono bg-background px-2 py-1 rounded">
                                {linkExistente.url}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(linkExistente.url);
                                      toast.success('✔ Copiado!', { duration: 2000 });
                                    } catch (error) {
                                      toast.error('Erro ao copiar link');
                                    }
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                  className="h-7 w-7 p-0"
                                >
                                  <a href={linkExistente.url.startsWith('http') ? linkExistente.url : `https://${linkExistente.url}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(linkExistente)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(linkExistente.id)}
                                  className="h-7 w-7 p-0 text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2">
                          <Input
                            placeholder="Cole a URL aqui..."
                            value={editandoUrls[campo.nome] || ''}
                            onChange={(e) => setEditandoUrls({ ...editandoUrls, [campo.nome]: e.target.value })}
                            className="h-8 text-xs"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => {
                              handleQuickAdd(campo.nome, editandoUrls[campo.nome] || '');
                              setEditandoUrls({ ...editandoUrls, [campo.nome]: '' });
                            }}
                            className="h-8"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Links Personalizados */}
        {links.filter(link => !camposPredefinidos.some(c => c.nome === link.nome)).length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground">Links Personalizados</h4>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={links.filter(link => !camposPredefinidos.some(c => c.nome === link.nome)).map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {links.filter(link => !camposPredefinidos.some(c => c.nome === link.nome)).map((link) => (
                    <SortableLink
                      key={link.id}
                      link={link}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      editing={editing}
                      editingLink={editingLink}
                      setEditingLink={setEditingLink}
                      onSave={handleSaveEdit}
                      onCancel={() => {
                        setEditing(false);
                        setEditingLink(null);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
