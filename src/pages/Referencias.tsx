import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Upload, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReferenciasList } from "@/components/Referencias/ReferenciasList";
import { ReferenciasFilters, DEFAULT_FILTERS, ReferenciaFilters } from "@/components/Referencias/ReferenciasFilters";
import { ReferenciaItem } from "@/components/Referencias/ReferenciaCard";

export default function Referencias() {
  const [referencias, setReferencias] = useState<ReferenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReferenciaFilters>(DEFAULT_FILTERS);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; referencia?: ReferenciaItem }>({ open: false });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadReferencias();
  }, []);

  const loadReferencias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("referencias_criativos")
        .select(
          "id, titulo, categoria, tipo_cliente, tipo_funil, tags, thumbnail_url, descricao, created_at, updated_at, is_public, public_slug, created_by, link_url, conteudo, links_externos, is_template"
        )
        .eq("ativo", true)
        .is("cliente_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      let loadedRefs = (data || []) as ReferenciaItem[];

      // Fetch clients for auto-tagging
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("nome, aliases")
        .eq("is_active", true);
      const clientes = clientesData || [];

      // Auto-tagging logic based on title/description, existing tags, and clients
      const allExistingTags = new Set<string>();
      loadedRefs.forEach((r) => r.tags?.forEach((t) => allExistingTags.add(t.toLowerCase())));
      const availableTagArray = Array.from(allExistingTags);

      if (availableTagArray.length > 0 || clientes.length > 0) {
        let hasUpdates = false;

        loadedRefs = loadedRefs.map(ref => {
          const currentTags = (ref.tags || []).map(t => t.toLowerCase());
          const textToSearch = `${ref.titulo} ${ref.descricao || ""}`.toLowerCase();

          const newTags = new Set(ref.tags || []);
          let refUpdated = false;

          availableTagArray.forEach(tag => {
            if (!currentTags.includes(tag) && textToSearch.includes(tag)) {
              newTags.add(tag);
              refUpdated = true;
              hasUpdates = true;
            }
          });

          clientes.forEach(cliente => {
            const clienteNome = cliente.nome.toLowerCase();
            // check name
            if (textToSearch.includes(clienteNome)) {
              const lowerNewTags = Array.from(newTags).map(t => t.toLowerCase());
              if (!lowerNewTags.includes(clienteNome)) {
                newTags.add(cliente.nome);
                refUpdated = true;
                hasUpdates = true;
              }
            }
            // check aliases
            if (cliente.aliases && Array.isArray(cliente.aliases)) {
              cliente.aliases.forEach((alias: string) => {
                const lowerAlias = alias.toLowerCase();
                if (textToSearch.includes(lowerAlias)) {
                  const lowerNewTags = Array.from(newTags).map(t => t.toLowerCase());
                  if (!lowerNewTags.includes(lowerAlias)) {
                    newTags.add(alias);
                    refUpdated = true;
                    hasUpdates = true;
                  }
                }
              });
            }
          });

          if (refUpdated) {
            const updatedTagsArray = Array.from(newTags);
            // Async background update, no await to not block UI
            supabase
              .from("referencias_criativos")
              .update({ tags: updatedTagsArray })
              .eq("id", ref.id)
              .then(({ error }) => {
                if (error) console.error("Auto-tagging update failed", error);
              });

            return { ...ref, tags: updatedTagsArray };
          }

          return ref;
        });
      }

      setReferencias(loadedRefs);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as referências.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTagsChange = async (referenciaId: string, newTags: string[]) => {
    try {
      // Optmistic update
      setReferencias(prev => prev.map(ref =>
        ref.id === referenciaId ? { ...ref, tags: newTags } : ref
      ));

      const { error } = await supabase
        .from("referencias_criativos")
        .update({ tags: newTags })
        .eq("id", referenciaId);

      if (error) throw error;

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as tags.",
        variant: "destructive"
      });
      // Revert optmistic update by reloading
      loadReferencias();
    }
  };

  // Derived: all unique tags across references
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    referencias.forEach((r) => r.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [referencias]);

  // Filtering logic
  const filteredReferencias = useMemo(() => {
    return referencias.filter((ref) => {
      if (filters.categoria !== "todas" && ref.categoria !== filters.categoria) return false;
      if (filters.tipo_funil !== "todos" && ref.tipo_funil !== filters.tipo_funil) return false;
      if (filters.tipo_cliente !== "todos" && ref.tipo_cliente !== filters.tipo_cliente) return false;
      if (filters.tag && !(ref.tags ?? []).includes(filters.tag)) return false;
      if (filters.search.trim()) {
        const term = filters.search.toLowerCase();
        if (
          !ref.titulo.toLowerCase().includes(term) &&
          !(ref.descricao ?? "").toLowerCase().includes(term)
        )
          return false;
      }
      return true;
    });
  }, [referencias, filters]);

  const handleView = (ref: ReferenciaItem) => {
    window.open(`/referencia/${ref.id}`, "_blank");
  };

  const handleEdit = (ref: ReferenciaItem) => {
    navigate(`/referencias/${ref.id}`);
  };

  const handleDelete = async () => {
    if (!deleteDialog.referencia) return;
    if (confirmTitle !== deleteDialog.referencia.titulo) {
      toast({ title: "Erro", description: "O título digitado não corresponde.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.rpc("soft_delete_referencia", {
        _id: deleteDialog.referencia.id,
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Referência excluída com sucesso!" });
      setDeleteDialog({ open: false });
      setConfirmTitle("");
      loadReferencias();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir", variant: "destructive" });
    }
  };

  const processarImportacaoCSV = async () => {
    if (!csvFile) return;
    setImportLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const referencesData = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        return {
          titulo: values[0] || "",
          categoria: (["criativos", "pagina"].includes(values[1]) ? values[1] : "criativos") as "criativos" | "pagina",
          link_url: values[2] || "",
        };
      });

      const { data: userData } = await supabase.auth.getUser();
      for (const refData of referencesData) {
        if (refData.titulo && refData.link_url) {
          await supabase.from("referencias_criativos").insert({
            cliente_id: null,
            titulo: refData.titulo,
            categoria: refData.categoria,
            conteudo: JSON.stringify([]),
            link_url: refData.link_url,
            created_by: userData.user?.id,
          });
        }
      }
      toast({
        title: "Sucesso",
        description: `${referencesData.filter((r) => r.titulo && r.link_url).length} referências importadas!`,
      });
      setShowImportModal(false);
      setCsvFile(null);
      loadReferencias();
    } catch (error: any) {
      toast({ title: "Erro", description: "Erro ao processar CSV: " + error.message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplateCSV = () => {
    const template = `titulo,categoria,link_url\n"Exemplo Criativos","criativos","https://example.com/criativo"\n"Exemplo Página","pagina","https://example.com/pagina"`;
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_referencias.csv";
    link.click();
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b bg-card/60 backdrop-blur-sm px-6 py-5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Banco de Referências</h1>
              <p className="text-xs text-muted-foreground">
                Referências criativas para compartilhar com clientes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Importar CSV
            </Button>
            <Button size="sm" onClick={() => navigate("/referencias/novo")}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Referência
            </Button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-6 px-6 py-6 max-w-screen-2xl mx-auto w-full">
        {/* Sidebar */}
        <ReferenciasFilters
          filters={filters}
          onChange={setFilters}
          availableTags={availableTags}
          showTipoCliente={true}
          totalCount={referencias.length}
          filteredCount={filteredReferencias.length}
        />

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-muted animate-pulse border"
                />
              ))}
            </div>
          ) : (
            <ReferenciasList
              referencias={filteredReferencias}
              availableTags={availableTags}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(ref) => setDeleteDialog({ open: true, referencia: ref })}
              onTagsChange={handleTagsChange}
              canEdit={true}
              emptyMessage={filters.search || filters.categoria !== "todas" || filters.tipo_funil !== "todos" || filters.tipo_cliente !== "todos" || filters.tag
                ? "Nenhuma referência com esses filtros"
                : "Nenhuma referência criada ainda"}
              emptySubMessage={
                filters.search || filters.categoria !== "todas" || filters.tipo_funil !== "todos" || filters.tipo_cliente !== "todos" || filters.tag
                  ? "Tente ajustar ou limpar os filtros."
                  : "Clique em 'Nova Referência' para começar."
              }
            />
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          setDeleteDialog({ open });
          if (!open) setConfirmTitle("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Digite o título para confirmar a exclusão de:{" "}
              <strong>{deleteDialog.referencia?.titulo}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder="Digite o título exato"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar via CSV</DialogTitle>
            <DialogDescription>
              Colunas: titulo, categoria, link_url
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplateCSV} className="flex-1">
                Baixar Template
              </Button>
              <Button
                onClick={processarImportacaoCSV}
                disabled={!csvFile || importLoading}
                className="flex-1"
              >
                {importLoading ? "Importando..." : "Importar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
