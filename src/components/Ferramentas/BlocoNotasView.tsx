import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSearch } from "@/hooks/useSearch";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  NotebookPen,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BlocoNotasTipTapEditor } from "./BlocoNotasTipTapEditor";

interface Nota {
  id: string;
  titulo: string;
  conteudo: string;
  conteudo_json: any;
  created_at: string;
  updated_at: string;
}

type SaveStatus = "idle" | "saving" | "saved";

export const BlocoNotasView = () => {
  const { user } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Nota | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudoJson, setConteudoJson] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Refs para autosave
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentNoteIdRef = useRef<string | null>(null);
  const tituloRef = useRef<string>("");
  const conteudoJsonRef = useRef<any>(null);

  const { searchTerm, setSearchTerm, filteredItems } = useSearch(notas, [
    "titulo",
    "conteudo",
  ]);

  useEffect(() => {
    fetchNotas();
  }, [user]);

  // Sincronizar refs com os estados (para o autosave ter valores atualizados)
  useEffect(() => {
    tituloRef.current = titulo;
  }, [titulo]);

  useEffect(() => {
    conteudoJsonRef.current = conteudoJson;
  }, [conteudoJson]);

  const fetchNotas = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notas")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotas((data as Nota[]) || []);
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
      toast.error("Erro ao carregar notas");
    } finally {
      setLoading(false);
    }
  };

  // Extrai texto puro do JSON TipTap para busca e exibição
  const extractPlainText = (json: any): string => {
    if (!json || !json.content) return "";
    const extractText = (nodes: any[]): string =>
      nodes
        .map((node) => {
          if (node.type === "text") return node.text || "";
          if (node.content) return extractText(node.content);
          return "";
        })
        .join(" ");
    return extractText(json.content).trim();
  };

  // Salvar nota no banco (chamado pelo autosave e pelo botão manual)
  const persistNota = useCallback(
    async (noteId: string | null, t: string, json: any) => {
      if (!user || !t.trim()) return;

      const plainText = extractPlainText(json);
      setSaveStatus("saving");

      try {
        if (noteId) {
          // Update
          const { error } = await supabase
            .from("notas")
            .update({
              titulo: t.trim(),
              conteudo: plainText,
              conteudo_json: json,
            })
            .eq("id", noteId);

          if (error) throw error;
        } else {
          // Insert
          const { data, error } = await supabase
            .from("notas")
            .insert({
              user_id: user.id,
              titulo: t.trim(),
              conteudo: plainText,
              conteudo_json: json,
            })
            .select()
            .single();

          if (error) throw error;
          if (data) {
            currentNoteIdRef.current = data.id;
          }
        }

        setSaveStatus("saved");
        await fetchNotas();

        // Voltar para idle após 2s
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Erro ao salvar nota:", error);
        setSaveStatus("idle");
        toast.error("Erro ao salvar nota");
      }
    },
    [user]
  );

  // Autosave com debounce de 2s
  const scheduleAutosave = useCallback(
    (json: any) => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

      autosaveTimerRef.current = setTimeout(() => {
        persistNota(currentNoteIdRef.current, tituloRef.current, json);
      }, 2000);
    },
    [persistNota]
  );

  const handleContentChange = useCallback(
    (json: any) => {
      setConteudoJson(json);
      scheduleAutosave(json);
    },
    [scheduleAutosave]
  );

  const handleTituloChange = (value: string) => {
    setTitulo(value);
    // Re-agenda autosave quando o título muda
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistNota(currentNoteIdRef.current, value, conteudoJsonRef.current);
    }, 2000);
  };

  // Salvar manualmente (botão)
  const saveNota = async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    await persistNota(currentNoteIdRef.current, tituloRef.current, conteudoJsonRef.current);
    if (currentNoteIdRef.current) {
      toast.success("Nota salva com sucesso");
    } else {
      toast.success("Nota criada com sucesso");
    }
    if (!editingNote) resetForm();
  };

  const deleteNota = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta nota?")) return;

    try {
      const { error } = await supabase.from("notas").delete().eq("id", id);
      if (error) throw error;
      toast.success("Nota excluída com sucesso");
      await fetchNotas();
    } catch (error) {
      console.error("Erro ao excluir nota:", error);
      toast.error("Erro ao excluir nota");
    }
  };

  const editNota = (nota: Nota) => {
    setEditingNote(nota);
    currentNoteIdRef.current = nota.id;
    setTitulo(nota.titulo);
    // Usa JSON se disponível, senão gera TipTap a partir do texto puro
    if (nota.conteudo_json) {
      setConteudoJson(nota.conteudo_json);
    } else if (nota.conteudo) {
      setConteudoJson({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: nota.conteudo }] }],
      });
    } else {
      setConteudoJson(null);
    }
    setSaveStatus("idle");
    setIsDialogOpen(true);
  };

  const openNewNote = () => {
    setEditingNote(null);
    currentNoteIdRef.current = null;
    setTitulo("");
    setConteudoJson(null);
    setSaveStatus("idle");
  };

  const resetForm = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setEditingNote(null);
    currentNoteIdRef.current = null;
    setTitulo("");
    setConteudoJson(null);
    setSaveStatus("idle");
    setIsDialogOpen(false);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando notas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Meu Bloco de Notas</h2>
          <p className="text-muted-foreground">
            Suas anotações pessoais e lembretes
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetForm();
            else setIsDialogOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openNewNote}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Nota
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {editingNote ? "Editar Nota" : "Nova Nota"}
                </DialogTitle>

                {/* Indicador de status de salvamento */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-8">
                  {saveStatus === "saving" && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">Salvo</span>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
              {/* Título */}
              <Input
                placeholder="Título da nota"
                value={titulo}
                onChange={(e) => handleTituloChange(e.target.value)}
                className="text-lg font-semibold shrink-0"
                autoFocus={!editingNote}
              />

              {/* Editor TipTap com scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-background">
                <BlocoNotasTipTapEditor
                  content={conteudoJson}
                  onChange={handleContentChange}
                  placeholder="Escreva sua nota aqui... Selecione o texto para opções de formatação e criação de tarefas."
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 shrink-0 pt-1">
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
                <Button onClick={saveNota} disabled={!titulo.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar notas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid de notas */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <NotebookPen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? "Nenhuma nota encontrada" : "Nenhuma nota criada ainda"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "Tente ajustar os termos de busca"
              : "Comece criando sua primeira nota"}
          </p>
          {!searchTerm && (
            <Button onClick={() => { openNewNote(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Nota
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((nota) => (
            <Card
              key={nota.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => editNota(nota)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">
                    {nota.titulo}
                  </CardTitle>
                  <div
                    className="flex gap-1 shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editNota(nota)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNota(nota.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atualizada{" "}
                  {formatDistanceToNow(parseISO(nota.updated_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {nota.conteudo || "Sem conteúdo"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};