import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Heart, ThumbsUp, ThumbsDown, Rocket, AlertTriangle, Plus, ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DiarioBordoEntry {
  id: string;
  cliente_id: string;
  autor_id: string;
  texto: string;
  reacoes: Record<string, string[]>;
  created_at: string;
  updated_at: string;
  autor_nome?: string;
  autor_avatar?: string;
}

interface DiarioBordoProps {
  clienteId: string;
}

const EMOJIS = [
  { emoji: "👍", label: "Curtir" },
  { emoji: "👎", label: "Não curtir" },
  { emoji: "🚀", label: "Excelente" },
  { emoji: "❗", label: "Importante" },
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
  const [expanded, setExpanded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canWrite = isAdmin || canCreateContent;

  useEffect(() => {
    if (clienteId) {
      loadEntries();
    }
  }, [clienteId]);

  const loadEntries = async () => {
    try {
      // Buscar entradas do diário de bordo
      const { data: entriesData, error: entriesError } = await supabase
        .from('diario_bordo')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;

      // Buscar informações dos colaboradores para cada entrada
      const entriesWithAuthor: DiarioBordoEntry[] = [];
      
      if (entriesData) {
        for (const entry of entriesData) {
          const { data: colaboradorData } = await supabase
            .from('colaboradores')
            .select('nome, avatar_url')
            .eq('user_id', entry.autor_id)
            .maybeSingle();

          entriesWithAuthor.push({
            ...entry,
            reacoes: (entry.reacoes as Record<string, string[]>) || {},
            autor_nome: colaboradorData?.nome || 'Usuário',
            autor_avatar: colaboradorData?.avatar_url
          });
        }
      }

      setEntries(entriesWithAuthor);
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
        autor_nome: userData?.nome || 'Usuário',
        autor_avatar: userData?.avatar_url
      };

      setEntries(prev => [newEntry, ...prev]);
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

  const displayedEntries = expanded ? entries : entries.slice(0, 5);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Diário de Bordo
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
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Diário de Bordo
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
              displayedEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.autor_avatar} />
                        <AvatarFallback>
                          {entry.autor_nome?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{entry.autor_nome}</p>
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
                    
                    {(user?.id === entry.autor_id || isAdmin) && (
                      <div className="flex gap-1">
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
                      </div>
                    )}
                  </div>

                  {editingEntry === entry.id ? (
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

                  <div className="flex items-center gap-2 pt-2">
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
                </div>
              ))
            )}
          </div>

          {entries.length > 5 && (
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="w-full"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Expandir histórico ({entries.length - 5} mais)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

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