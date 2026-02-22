import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";
import { DocumentosRichEditor } from "./DocumentosRichEditor";
import {
  Copy,
  FilePlus2,
  Folder,
  FolderPlus,
  Globe,
  Search,
  Star,
  Trash2,
  ChevronRight,
  ChevronDown
} from "lucide-react";

type WorkspaceFolder = Database["public"]["Tables"]["workspace_document_folders"]["Row"];
type WorkspaceDocument = Database["public"]["Tables"]["workspace_documents"]["Row"];
type WorkspaceDocumentUpdate =
  Database["public"]["Tables"]["workspace_documents"]["Update"];

const EMOJI_OPTIONS = [
  "📝",
  "📄",
  "📘",
  "📙",
  "📗",
  "📕",
  "📌",
  "✅",
  "🚀",
  "💡",
  "📊",
  "📅",
  "🎯",
  "🔖",
  "📚",
  "🧠",
  "🧾",
  "🗂️",
];

const sortDocuments = (docs: WorkspaceDocument[]) => {
  return [...docs].sort((a, b) => {
    const aDate = new Date(a.updated_at).getTime();
    const bDate = new Date(b.updated_at).getTime();
    return bDate - aDate;
  });
};

const normalizeSearch = (value: string) => value.trim().toLowerCase();

export function DocumentosView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const docIdFromUrl = searchParams.get("doc");

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [draggingDocumentId, setDraggingDocumentId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | "root" | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingPatchesRef = useRef<Record<string, WorkspaceDocumentUpdate>>({});

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  const updateDocParam = useCallback(
    (docId: string | null) => {
      const nextParams = new URLSearchParams(searchParams);

      if (docId) {
        nextParams.set("doc", docId);
      } else {
        nextParams.delete("doc");
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const selectDocument = useCallback(
    (docId: string | null) => {
      setSelectedDocumentId(docId);
      updateDocParam(docId);
    },
    [updateDocParam]
  );

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [foldersResponse, documentsResponse] = await Promise.all([
        supabase
          .from("workspace_document_folders")
          .select("*")
          .order("name", { ascending: true }),
        supabase
          .from("workspace_documents")
          .select("*")
          .order("updated_at", { ascending: false }),
      ]);

      if (foldersResponse.error) throw foldersResponse.error;
      if (documentsResponse.error) throw documentsResponse.error;

      const loadedFolders = foldersResponse.data || [];
      const loadedDocuments = documentsResponse.data || [];

      setFolders(loadedFolders);
      setDocuments(sortDocuments(loadedDocuments));

      setSelectedDocumentId((currentSelected) => {
        if (docIdFromUrl && loadedDocuments.some((doc) => doc.id === docIdFromUrl)) {
          return docIdFromUrl;
        }

        if (currentSelected && loadedDocuments.some((doc) => doc.id === currentSelected)) {
          return currentSelected;
        }

        return loadedDocuments[0]?.id || null;
      });

      if (docIdFromUrl && !loadedDocuments.some((doc) => doc.id === docIdFromUrl)) {
        const fallbackId = loadedDocuments[0]?.id || null;
        updateDocParam(fallbackId);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar seus documentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [docIdFromUrl, toast, updateDocParam, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const updateDocumentLocal = useCallback((documentId: string, patch: WorkspaceDocumentUpdate) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === documentId ? { ...doc, ...patch } : doc))
    );
  }, []);

  const persistDocumentPatch = useCallback(
    async (documentId: string, patch: WorkspaceDocumentUpdate) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("workspace_documents")
        .update(patch)
        .eq("id", documentId)
        .select("updated_at, is_public, public_slug")
        .single();

      if (error) throw error;

      setDocuments((prev) =>
        sortDocuments(
          prev.map((doc) =>
            doc.id === documentId
              ? {
                ...doc,
                ...patch,
                updated_at: data.updated_at,
                is_public: data.is_public,
                public_slug: data.public_slug,
              }
              : doc
          )
        )
      );

      setLastSavedAt(new Date(data.updated_at));
    },
    [user]
  );

  const scheduleDocumentSave = useCallback(
    (documentId: string, patch: WorkspaceDocumentUpdate) => {
      pendingPatchesRef.current[documentId] = {
        ...(pendingPatchesRef.current[documentId] || {}),
        ...patch,
      };

      setSaveStatus("saving");

      if (saveTimersRef.current[documentId]) {
        clearTimeout(saveTimersRef.current[documentId]);
      }

      saveTimersRef.current[documentId] = setTimeout(async () => {
        const payload = pendingPatchesRef.current[documentId];
        delete pendingPatchesRef.current[documentId];
        delete saveTimersRef.current[documentId];

        if (!payload) return;

        try {
          await persistDocumentPatch(documentId, payload);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 1200);
        } catch (error: any) {
          setSaveStatus("error");
          toast({
            title: "Erro ao salvar",
            description: error.message || "Não foi possível salvar as alterações.",
            variant: "destructive",
          });
        }
      }, 700);
    },
    [persistDocumentPatch, toast]
  );

  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("workspace_document_folders")
        .insert({
          user_id: user.id,
          name: newFolderName.trim(),
        })
        .select("*")
        .single();

      if (error) throw error;

      setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName("");
      setFolderDialogOpen(false);

      toast({
        title: "Pasta criada",
        description: "A pasta foi criada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a pasta.",
        variant: "destructive",
      });
    }
  };

  const createDocument = async (folderId: string | null = null) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("workspace_documents")
        .insert({
          user_id: user.id,
          folder_id: folderId,
          title: "Sem título",
          emoji: "📝",
          content_html: "",
        })
        .select("*")
        .single();

      if (error) throw error;

      setDocuments((prev) => sortDocuments([data, ...prev]));
      selectDocument(data.id);

      toast({
        title: "Documento criado",
        description: "Você já pode começar a escrever.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o documento.",
        variant: "destructive",
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!user) return;
    if (!confirm("Deseja realmente excluir este documento?")) return;

    try {
      const { error } = await supabase
        .from("workspace_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      const nextDocuments = documents.filter((doc) => doc.id !== documentId);
      setDocuments(nextDocuments);

      if (selectedDocumentId === documentId) {
        selectDocument(nextDocuments[0]?.id || null);
      }

      toast({
        title: "Documento excluído",
        description: "O documento foi removido.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o documento.",
        variant: "destructive",
      });
    }
  };

  const togglePublicAccess = async () => {
    if (!user || !selectedDocument) return;

    try {
      setSaveStatus("saving");

      const { data, error } = await supabase
        .from("workspace_documents")
        .update({ is_public: !selectedDocument.is_public })
        .eq("id", selectedDocument.id)
        .select("is_public, public_slug, updated_at")
        .single();

      if (error) throw error;

      setDocuments((prev) =>
        sortDocuments(
          prev.map((doc) =>
            doc.id === selectedDocument.id
              ? {
                ...doc,
                is_public: data.is_public,
                public_slug: data.public_slug,
                updated_at: data.updated_at,
              }
              : doc
          )
        )
      );

      setSaveStatus("saved");
      setLastSavedAt(new Date(data.updated_at));
      setTimeout(() => setSaveStatus("idle"), 1200);

      toast({
        title: data.is_public ? "Documento público" : "Documento privado",
        description: data.is_public
          ? "Qualquer pessoa com o link pode visualizar."
          : "A visualização pública foi desativada.",
      });
    } catch (error: any) {
      setSaveStatus("error");
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o compartilhamento.",
        variant: "destructive",
      });
    }
  };

  const copyPublicLink = async () => {
    if (!selectedDocument?.public_slug) return;

    const link = `${window.location.origin}/documentos/publico/${selectedDocument.public_slug}`;
    await navigator.clipboard.writeText(link);

    toast({
      title: "Link copiado",
      description: "Link público copiado para a área de transferência.",
    });
  };

  const filteredDocuments = useMemo(() => {
    const normalized = normalizeSearch(searchTerm);
    if (!normalized) return documents;

    return documents.filter((doc) =>
      `${doc.emoji || ""} ${doc.title}`.toLowerCase().includes(normalized)
    );
  }, [documents, searchTerm]);

  const favoriteDocuments = useMemo(
    () => filteredDocuments.filter((doc) => doc.is_favorite),
    [filteredDocuments]
  );

  const rootDocuments = useMemo(
    () => filteredDocuments.filter((doc) => !doc.folder_id),
    [filteredDocuments]
  );

  const folderDocumentsMap = useMemo(() => {
    const grouped = new Map<string, WorkspaceDocument[]>();

    folders.forEach((folder) => {
      grouped.set(
        folder.id,
        filteredDocuments.filter((doc) => doc.folder_id === folder.id)
      );
    });

    return grouped;
  }, [filteredDocuments, folders]);

  const renderDocumentRow = (doc: WorkspaceDocument) => {
    const isSelected = doc.id === selectedDocumentId;

    return (
      <button
        key={doc.id}
        type="button"
        draggable
        onDragStart={(event) => handleDocumentDragStart(event, doc.id)}
        onDragEnd={handleDocumentDragEnd}
        onClick={() => selectDocument(doc.id)}
        className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
          } ${draggingDocumentId === doc.id ? "opacity-50" : ""}`}
      >
        <span className="text-base leading-none">{doc.emoji || "📝"}</span>
        <span className="flex-1 truncate text-sm font-medium">{doc.title || "Sem título"}</span>
        {doc.is_public && <Globe className="h-3.5 w-3.5 text-emerald-600" />}
        {doc.is_favorite && <Star className="h-3.5 w-3.5 text-amber-500 fill-current" />}
      </button>
    );
  };

  const handleTitleChange = (title: string) => {
    if (!selectedDocument) return;
    updateDocumentLocal(selectedDocument.id, { title });
    scheduleDocumentSave(selectedDocument.id, { title });
  };

  const handleEmojiChange = (emoji: string) => {
    if (!selectedDocument) return;
    updateDocumentLocal(selectedDocument.id, { emoji });
    scheduleDocumentSave(selectedDocument.id, { emoji });
  };

  const handleContentChange = (contentHtml: string) => {
    if (!selectedDocument) return;
    updateDocumentLocal(selectedDocument.id, { content_html: contentHtml });
    scheduleDocumentSave(selectedDocument.id, { content_html: contentHtml });
  };

  const handleFavoriteToggle = () => {
    if (!selectedDocument) return;
    const nextValue = !selectedDocument.is_favorite;
    updateDocumentLocal(selectedDocument.id, { is_favorite: nextValue });
    scheduleDocumentSave(selectedDocument.id, { is_favorite: nextValue });
  };

  const handleFolderChange = (folderValue: string) => {
    if (!selectedDocument) return;
    const folderId = folderValue === "root" ? null : folderValue;
    updateDocumentLocal(selectedDocument.id, { folder_id: folderId });
    scheduleDocumentSave(selectedDocument.id, { folder_id: folderId });
  };

  const moveDocumentToFolder = useCallback(
    (documentId: string, targetFolderId: string | null) => {
      const documentToMove = documents.find((doc) => doc.id === documentId);
      if (!documentToMove) return;
      if (documentToMove.folder_id === targetFolderId) return;

      updateDocumentLocal(documentId, { folder_id: targetFolderId });
      scheduleDocumentSave(documentId, { folder_id: targetFolderId });
    },
    [documents, scheduleDocumentSave, updateDocumentLocal]
  );

  const handleDocumentDragStart = (event: DragEvent, documentId: string) => {
    event.dataTransfer.setData("text/plain", documentId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingDocumentId(documentId);
  };

  const handleDocumentDragEnd = () => {
    setDraggingDocumentId(null);
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (
    event: DragEvent,
    folderId: string | "root"
  ) => {
    if (!draggingDocumentId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  };

  const handleFolderDrop = (
    event: DragEvent,
    targetFolderId: string | null
  ) => {
    event.preventDefault();

    const droppedDocumentId =
      event.dataTransfer.getData("text/plain") || draggingDocumentId;

    if (droppedDocumentId) {
      moveDocumentToFolder(droppedDocumentId, targetFolderId);
    }

    setDraggingDocumentId(null);
    setDragOverFolderId(null);
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando documentos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Documentos</h2>
          <p className="text-sm text-muted-foreground">
            Organização estilo Notion com pastas, favoritos e compartilhamento público.
          </p>
        </div>

        {saveStatus !== "idle" && (
          <div className="text-xs text-muted-foreground">
            {saveStatus === "saving" && "Salvando..."}
            {saveStatus === "saved" &&
              `Salvo${lastSavedAt ? ` às ${lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
            {saveStatus === "error" && "Erro ao salvar"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-[680px] rounded-xl border overflow-hidden">
        <aside className="border-r bg-muted/20 flex flex-col">
          <div className="p-3 space-y-2 border-b">
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => createDocument(null)}>
                <FilePlus2 className="h-4 w-4 mr-2" />
                Novo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFolderDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Pasta
              </Button>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar documento"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {favoriteDocuments.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Favoritos
                </p>
                {favoriteDocuments.map(renderDocumentRow)}
              </div>
            )}

            <div
              className={`space-y-1 rounded-md p-1 transition-colors ${dragOverFolderId === "root" ? "bg-primary/10" : ""
                }`}
              onDragOver={(event) => handleFolderDragOver(event, "root")}
              onDragLeave={() =>
                setDragOverFolderId((current) => (current === "root" ? null : current))
              }
              onDrop={(event) => handleFolderDrop(event, null)}
            >
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sem pasta
              </p>
              {rootDocuments.length > 0 ? (
                rootDocuments.map(renderDocumentRow)
              ) : (
                <p className="px-2 py-1 text-xs text-muted-foreground">Nenhum documento</p>
              )}
            </div>

            {folders.map((folder) => {
              const folderDocs = folderDocumentsMap.get(folder.id) || [];

              return (
                <div
                  key={folder.id}
                  className={`space-y-1 rounded-md p-1 transition-colors ${dragOverFolderId === folder.id ? "bg-primary/10" : ""
                    }`}
                  onDragOver={(event) => handleFolderDragOver(event, folder.id)}
                  onDragLeave={() =>
                    setDragOverFolderId((current) => (current === folder.id ? null : current))
                  }
                  onDrop={(event) => handleFolderDrop(event, folder.id)}
                >
                  <div className="px-2 pt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFolderExpanded(folder.id)}
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {expandedFolders[folder.id] === false ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      <Folder className="h-3.5 w-3.5" />
                      {folder.name}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => createDocument(folder.id)}
                    >
                      + doc
                    </Button>
                  </div>

                  {expandedFolders[folder.id] !== false && (
                    <>
                      {folderDocs.length > 0 ? (
                        folderDocs.map(renderDocumentRow)
                      ) : (
                        <p className="px-2 py-1 text-xs text-muted-foreground">Pasta vazia</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex flex-col min-h-0 bg-background">
          {!selectedDocument ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <p className="text-muted-foreground mb-4">Crie seu primeiro documento para começar.</p>
              <Button onClick={() => createDocument(null)}>
                <FilePlus2 className="h-4 w-4 mr-2" />
                Criar documento
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 border-b space-y-4">
                <div className="flex items-start gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-11 w-11 p-0 text-xl">
                        {selectedDocument.emoji || "📝"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[250px]">
                      <div className="p-2 grid grid-cols-6 gap-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="h-8 w-8 rounded hover:bg-muted"
                            onClick={() => handleEmojiChange(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <input
                    value={selectedDocument.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Sem título"
                    className="w-full bg-transparent border-0 p-0 text-3xl font-bold leading-tight focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[200px]">
                    <Select
                      value={selectedDocument.folder_id || "root"}
                      onValueChange={handleFolderChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar pasta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Sem pasta</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant={selectedDocument.is_favorite ? "default" : "outline"}
                    onClick={handleFavoriteToggle}
                  >
                    <Star className={`h-4 w-4 mr-2 ${selectedDocument.is_favorite ? "fill-current" : ""}`} />
                    Favorito
                  </Button>

                  <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                    <Switch checked={selectedDocument.is_public} onCheckedChange={togglePublicAccess} />
                    <Label className="text-sm">Público</Label>
                  </div>

                  <Button
                    variant="outline"
                    onClick={copyPublicLink}
                    disabled={!selectedDocument.is_public || !selectedDocument.public_slug}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar link
                  </Button>

                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => deleteDocument(selectedDocument.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-4">
                <DocumentosRichEditor
                  value={selectedDocument.content_html || ""}
                  onChange={handleContentChange}
                  placeholder="Digite '/' para começar e organize como no Notion..."
                />
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                Criar pasta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
