import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Plus, Edit2, Trash2, Reply, Maximize2, Share2, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import bnoadsLogoImg from "@/assets/bnoads-logo-new.png";

interface DiarioBordoEntry {
  id: string;
  cliente_id: string;
  autor_id: string;
  texto: string;
  reacoes: Record<string, string[]>;
  created_at: string;
  updated_at: string;
  author_nome?: string;
  author_avatar?: string;
  parent_id?: string;
  replies?: DiarioBordoEntry[];
}

interface DiarioBordoProps {
  clienteId: string;
}

const EMOJIS = [
  { emoji: "👍", label: "Curtir" },
  { emoji: "👎", label: "Não curtir" },
  { emoji: "🚀", label: "Excelente" },
  { emoji: "❗", label: "Importante" },
  { emoji: "❌", label: "Problema" },
  { emoji: "✅", label: "Verificado" },
];

export const DiarioBordo = ({ clienteId }: DiarioBordoProps) => {
  const { user } = useAuth();
  const { userData } = useCurrentUser();
  const { isAdmin, canCreateContent } = useUserPermissions();
  const { toast } = useToast();

  const [entries, setEntries] = useState<DiarioBordoEntry[]>([]);
  const [newEntryText, setNewEntryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showMaximizeModal, setShowMaximizeModal] = useState(false);
  const [allEntries, setAllEntries] = useState<DiarioBordoEntry[]>([]);

  const canWrite = isAdmin || canCreateContent;
  const isPublicAccess = !user;

  useEffect(() => {
    if (clienteId) {
      loadEntries();
    }
  }, [clienteId]);

  const loadEntries = async () => {
    try {
      // Buscar entradas do diário de bordo (apenas principais - sem parent_id)
      const { data: entriesData, error: entriesError } = await supabase
        .from('diario_bordo')
        .select('*')
        .eq('cliente_id', clienteId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;

      // Buscar informações dos colaboradores e replies para cada entrada
      const entriesWithAuthor: DiarioBordoEntry[] = [];
      
      if (entriesData) {
        for (const entry of entriesData) {
          const { data: colaboradorData } = await supabase
            .from('colaboradores')
            .select('nome, avatar_url')
            .eq('user_id', entry.autor_id)
            .maybeSingle();

          // Buscar replies para esta entrada
          const { data: repliesData } = await supabase
            .from('diario_bordo')
            .select('*')
            .eq('parent_id', entry.id)
            .order('created_at', { ascending: true });

          const repliesWithAuthor: DiarioBordoEntry[] = [];
          if (repliesData) {
            for (const reply of repliesData) {
              const { data: replyAuthorData } = await supabase
                .from('colaboradores')
                .select('nome, avatar_url')
                .eq('user_id', reply.autor_id)
                .maybeSingle();

              repliesWithAuthor.push({
                ...reply,
                reacoes: (reply.reacoes as Record<string, string[]>) || {},
                author_nome: replyAuthorData?.nome || 'Usuário',
                author_avatar: replyAuthorData?.avatar_url,
                replies: []
              });
            }
          }

          entriesWithAuthor.push({
            ...entry,
            reacoes: (entry.reacoes as Record<string, string[]>) || {},
            author_nome: colaboradorData?.nome || 'Usuário',
            author_avatar: colaboradorData?.avatar_url,
            replies: repliesWithAuthor
          });
        }
      }

      setEntries(entriesWithAuthor);
      setAllEntries(entriesWithAuthor);
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o diário de bordo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryText.trim() || !user?.id) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('diario_bordo')
        .insert({
          cliente_id: clienteId,
          autor_id: user.id,
          texto: newEntryText.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const newEntry: DiarioBordoEntry = {
        ...data,
        reacoes: {},
        author_nome: userData?.nome || 'Usuário',
        author_avatar: userData?.avatar_url,
        replies: []
      };

      setEntries(prev => [newEntry, ...prev]);
      setAllEntries(prev => [newEntry, ...prev]);
      setNewEntryText("");
      
      toast({
        title: "Sucesso",
        description: "Entrada adicionada ao diário de bordo.",
      });
    } catch (error) {
      console.error('Erro ao criar entrada:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a entrada.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || !user?.id) return;

    setSubmittingReply(true);
    try {
      const { data, error } = await supabase
        .from('diario_bordo')
        .insert({
          cliente_id: clienteId,
          autor_id: user.id,
          texto: replyText.trim(),
          parent_id: parentId
        })
        .select()
        .single();

      if (error) throw error;

      const newReply: DiarioBordoEntry = {
        ...data,
        reacoes: {},
        author_nome: userData?.nome || 'Usuário',
        author_avatar: userData?.avatar_url,
        replies: []
      };

      // Adicionar o reply à entrada pai
      setEntries(prev => prev.map(entry => 
        entry.id === parentId 
          ? { ...entry, replies: [...(entry.replies || []), newReply] }
          : entry
      ));
      setAllEntries(prev => prev.map(entry => 
        entry.id === parentId 
          ? { ...entry, replies: [...(entry.replies || []), newReply] }
          : entry
      ));

      setReplyText("");
      setReplyingTo(null);
      
      toast({
        title: "Sucesso",
        description: "Resposta adicionada ao diário de bordo.",
      });
    } catch (error) {
      console.error('Erro ao criar resposta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a resposta.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReaction = async (entryId: string, emoji: string) => {
    if (!user?.id) return;

    try {
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      const currentReactions = entry.reacoes || {};
      const emojiReactions = currentReactions[emoji] || [];
      
      let newReactions;
      if (emojiReactions.includes(user.id)) {
        // Remove reaction
        newReactions = {
          ...currentReactions,
          [emoji]: emojiReactions.filter(id => id !== user.id)
        };
      } else {
        // Add reaction
        newReactions = {
          ...currentReactions,
          [emoji]: [...emojiReactions, user.id]
        };
      }

      const { error } = await supabase
        .from('diario_bordo')
        .update({ reacoes: newReactions })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, reacoes: newReactions }
          : entry
      ));
      setAllEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, reacoes: newReactions }
          : entry
      ));
    } catch (error) {
      console.error('Erro ao reagir:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reagir à entrada.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (entryId: string) => {
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from('diario_bordo')
        .update({ 
          texto: editText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, texto: editText.trim(), updated_at: new Date().toISOString() }
          : entry
      ));
      setAllEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, texto: editText.trim(), updated_at: new Date().toISOString() }
          : entry
      ));

      setEditingEntry(null);
      setEditText("");
      
      toast({
        title: "Sucesso",
        description: "Entrada editada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao editar entrada:', error);
      toast({
        title: "Erro",
        description: "Não foi possível editar a entrada.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('diario_bordo')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      setAllEntries(prev => prev.filter(entry => entry.id !== entryId));
      setDeleteConfirm(null);
      
      toast({
        title: "Sucesso",
        description: "Entrada excluída com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir entrada:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a entrada.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (entry: DiarioBordoEntry) => {
    setEditingEntry(entry.id);
    setEditText(entry.texto);
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditText("");
  };

  const displayedEntries = entries.slice(0, 3);

  const renderAuthorInfo = (authorName?: string, authorAvatar?: string) => {
    if (isPublicAccess) {
      return {
        name: "EQUIPE BNOads",
        avatar: bnoadsLogoImg
      };
    }
    return {
      name: authorName || 'Usuário',
      avatar: authorAvatar
    };
  };

  const renderEntry = (entry: DiarioBordoEntry, isModal = false) => {
    const authorInfo = renderAuthorInfo(entry.author_nome, entry.author_avatar);
    
    return (
      <div key={entry.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorInfo.avatar} />
              <AvatarFallback>
                {authorInfo.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{authorInfo.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
                {entry.updated_at !== entry.created_at && (
                  <span className="ml-1">(editado)</span>
                )}
              </p>
            </div>
          </div>
        
          <div className="flex gap-1">
            {/* Botões de compartilhamento (sempre visíveis) */}
            {!isModal && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const texto = `*${authorInfo.name}* - ${formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}\n\n${entry.texto}`;
                    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                    window.open(url, '_blank');
                  }}
                  className="h-8 w-8 p-0"
                  title="Compartilhar no WhatsApp"
                >
                  <Share2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const texto = `${authorInfo.name} - ${formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}\n\n${entry.texto}`;
                    navigator.clipboard.writeText(texto);
                    toast({ title: "Copiado!", description: "Conteúdo copiado para a área de transferência" });
                  }}
                  className="h-8 w-8 p-0"
                  title="Copiar conteúdo"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </>
            )}
            
            {/* Botões de edição (apenas para autor ou admin) */}
            {(user?.id === entry.autor_id || isAdmin) && !isModal && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(entry)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(entry.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {editingEntry === entry.id && !isModal ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEdit(entry.id)}>
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {entry.texto}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {EMOJIS.map(({ emoji, label }) => {
              const reactions = entry.reacoes?.[emoji] || [];
              const hasReacted = user?.id ? reactions.includes(user.id) : false;
              
              return (
                <Button
                  key={emoji}
                  variant={hasReacted ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleReaction(entry.id, emoji)}
                  className="h-8 px-2 text-xs"
                  title={label}
                >
                  <span className="mr-1">{emoji}</span>
                  {reactions.length > 0 && (
                    <span>{reactions.length}</span>
                  )}
                </Button>
              );
            })}
          </div>
          
          {user && !isModal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(replyingTo === entry.id ? null : entry.id)}
              className="h-8 px-2 text-xs"
            >
              <Reply className="h-3 w-3 mr-1" />
              Responder
            </Button>
          )}
        </div>

        {/* Reply Form */}
        {replyingTo === entry.id && !isModal && (
          <div className="mt-3 pl-8 border-l-2 border-muted">
            <div className="space-y-2">
              <Textarea
                placeholder="Escreva sua resposta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmitReply(entry.id);
                  }
                }}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleSubmitReply(entry.id)}
                  disabled={!replyText.trim() || submittingReply}
                >
                  {submittingReply ? "Enviando..." : "Responder"}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Display Replies */}
        {entry.replies && entry.replies.length > 0 && (
          <div className="mt-3 pl-8 space-y-3 border-l-2 border-muted">
            {entry.replies.map((reply) => {
              const replyAuthorInfo = renderAuthorInfo(reply.author_nome, reply.author_avatar);
              return (
                <div key={reply.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={replyAuthorInfo.avatar} />
                        <AvatarFallback className="text-xs">
                          {replyAuthorInfo.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-xs">{replyAuthorInfo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {(user?.id === reply.autor_id || isAdmin) && !isModal && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(reply.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {reply.texto}
                  </p>
                  
                  {!isModal && (
                    <div className="flex items-center gap-1">
                      {EMOJIS.map(({ emoji, label }) => {
                        const reactions = reply.reacoes?.[emoji] || [];
                        const hasReacted = user?.id ? reactions.includes(user.id) : false;
                        
                        return (
                          <Button
                            key={emoji}
                            variant={hasReacted ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => handleReaction(reply.id, emoji)}
                            className="h-6 px-1 text-xs"
                            title={label}
                          >
                            <span className="mr-1">{emoji}</span>
                            {reactions.length > 0 && (
                              <span className="text-xs">{reactions.length}</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Diário de Bordo
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMaximizeModal(true)}
              className="h-8 w-8 p-0"
              title="Ver histórico completo"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Diário de Bordo
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMaximizeModal(true)}
              className="h-8 w-8 p-0"
              title="Ver histórico completo"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite && (
            <form onSubmit={handleSubmitEntry} className="space-y-3">
              <Textarea
                placeholder="Escreva o que foi otimizado, testado ou ajustado..."
                value={newEntryText}
                onChange={(e) => setNewEntryText(e.target.value)}
                className="min-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmitEntry(e);
                  }
                }}
              />
              <Button 
                type="submit" 
                disabled={!newEntryText.trim() || submitting}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {submitting ? "Adicionando..." : "Adicionar entrada"}
              </Button>
            </form>
          )}

          <div className="space-y-4">
            {displayedEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma entrada no diário de bordo ainda.</p>
                {canWrite && (
                  <p className="text-sm">Seja o primeiro a registrar uma otimização!</p>
                )}
              </div>
            ) : (
              <div className={entries.length > 3 ? "max-h-[260px] overflow-hidden" : ""}>
                <ScrollArea className={entries.length > 3 ? "h-[260px] pr-4" : ""}>
                  <div className="space-y-4">
                    {displayedEntries.map((entry) => renderEntry(entry))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Histórico Completo */}
      <Dialog open={showMaximizeModal} onOpenChange={setShowMaximizeModal}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Histórico Completo - Diário de Bordo</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4 pb-4">
                {allEntries.map((entry) => renderEntry(entry, true))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta entrada do diário de bordo? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};