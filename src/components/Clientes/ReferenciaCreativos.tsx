import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ReferencesEditor } from "@/components/References/ReferencesEditor";
import { ReferenciasList } from "@/components/Referencias/ReferenciasList";
import { ReferenciasFilters, DEFAULT_FILTERS, ReferenciaFilters } from "@/components/Referencias/ReferenciasFilters";
import { ReferenciaItem } from "@/components/Referencias/ReferenciaCard";

interface ReferenciaCriativosProps {
  clienteId: string;
}

export const ReferenciaCreativos = ({ clienteId }: ReferenciaCriativosProps) => {
  const [referencias, setReferencias] = useState<ReferenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReferenciaFilters>(DEFAULT_FILTERS);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotionEditor, setShowNotionEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; referencia?: ReferenciaItem }>({ open: false });
  const [confirmTitle, setConfirmTitle] = useState("");

  const { toast } = useToast();
  const { canCreateContent } = useUserPermissions();

  useEffect(() => {
    carregarReferencias();
  }, [clienteId]);

  const carregarReferencias = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("referencias_criativos")
        .select("id, titulo, categoria, tipo_cliente, tipo_funil, tags, thumbnail_url, descricao, is_public, public_slug, link_url, links_externos, conteudo, is_template, created_at, updated_at")
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (clienteId === "geral") {
        query = query.is("cliente_id", null);
      } else {
        query = query.eq("cliente_id", clienteId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let loadedRefs = (data || []) as unknown as ReferenciaItem[];

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
    } catch (error: any) {
      toast({ title: "Erro", description: "Erro ao carregar referências: " + error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleTagsChange = async (referenciaId: string, newTags: string[]) => {
    if (!canCreateContent) return;

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
      carregarReferencias();
    }
  };

  // Tags disponíveis
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    referencias.forEach((r) => r.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [referencias]);

  // Filtro
  const filteredReferencias = useMemo(() => {
    return referencias.filter((ref) => {
      if (filters.categoria !== "todas" && ref.categoria !== filters.categoria) return false;
      if (filters.tipo_funil !== "todos" && ref.tipo_funil !== filters.tipo_funil) return false;
      if (filters.tag && !(ref.tags ?? []).includes(filters.tag)) return false;
      if (filters.search.trim()) {
        const term = filters.search.toLowerCase();
        if (!ref.titulo.toLowerCase().includes(term) && !(ref.descricao ?? "").toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [referencias, filters]);

  const handleView = (ref: ReferenciaItem) => {
    window.open(`/referencia/${ref.id}`, "_blank");
  };

  const handleEdit = (ref: ReferenciaItem) => {
    setEditingId(ref.id);
    setShowNotionEditor(true);
  };

  const excluirReferencia = async () => {
    if (!deleteDialog.referencia) return;
    if (confirmTitle !== deleteDialog.referencia.titulo) {
      toast({ title: "Erro", description: "O título digitado não corresponde.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.rpc("soft_delete_referencia", { _id: deleteDialog.referencia.id });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Referência excluída com sucesso!" });
      setDeleteDialog({ open: false });
      setConfirmTitle("");
      carregarReferencias();
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
        let linksExternos: any[] = [];
        if (values[3]) {
          try { linksExternos = JSON.parse(values[3]); } catch { linksExternos = [{ titulo: values[3], url: values[3] }]; }
        }
        return {
          titulo: values[0] || "",
          categoria: (["criativos", "pagina"].includes(values[1]) ? values[1] : "criativos") as "criativos" | "pagina",
          is_template: values[2] === "true" || values[2] === "TRUE",
          links_externos: linksExternos,
        };
      });
      for (const refData of referencesData) {
        if (refData.titulo) {
          await supabase.from("referencias_criativos").insert({
            cliente_id: clienteId === "geral" ? null : clienteId,
            titulo: refData.titulo,
            categoria: refData.categoria,
            conteudo: JSON.stringify([]),
            is_template: refData.is_template,
            links_externos: refData.links_externos,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });
        }
      }
      toast({ title: "Sucesso", description: `${referencesData.filter((r) => r.titulo).length} referências importadas!` });
      setShowImportModal(false);
      setCsvFile(null);
      carregarReferencias();
    } catch (error: any) {
      toast({ title: "Erro", description: "Erro ao processar CSV: " + error.message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplateCSV = () => {
    const template = `titulo,categoria,is_template,links_externos\n"Exemplo Referência","criativos","false","[]"\n"Template Página","pagina","true","[{\"url\":\"https://example.com\",\"titulo\":\"Link Exemplo\"}]"`;
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_referencias.csv";
    link.click();
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.categoria !== "todas" ||
    filters.tipo_funil !== "todos" ||
    filters.tag !== "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Referências de Criativos</h2>
          <p className="text-sm text-muted-foreground">Documentos multimídia para referência e compartilhamento</p>
        </div>
        {canCreateContent && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Importar CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null);
                setShowNotionEditor(true);
              }}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Referência
            </Button>
          </div>
        )}
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex gap-5">
        {/* Sidebar filtros — só mostra se houver referências ou filtros ativos */}
        {(referencias.length > 0 || hasActiveFilters) && (
          <ReferenciasFilters
            filters={filters}
            onChange={setFilters}
            availableTags={availableTags}
            showTipoCliente={false}
            totalCount={referencias.length}
            filteredCount={filteredReferencias.length}
          />
        )}

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse border" />
              ))}
            </div>
          ) : (
            <ReferenciasList
              referencias={filteredReferencias}
              availableTags={availableTags}
              onView={handleView}
              onEdit={canCreateContent ? handleEdit : undefined}
              onDelete={canCreateContent ? (ref) => setDeleteDialog({ open: true, referencia: ref }) : undefined}
              onTagsChange={handleTagsChange}
              canEdit={canCreateContent}
              emptyMessage={hasActiveFilters ? "Nenhuma referência com esses filtros" : "Nenhuma referência criada"}
              emptySubMessage={
                hasActiveFilters
                  ? "Tente ajustar os filtros."
                  : canCreateContent
                    ? "Clique em 'Nova Referência' para criar a primeira."
                    : "As referências serão exibidas aqui quando criadas."
              }
            />
          )}
        </div>
      </div>

      {/* Editor Notion */}
      <ReferencesEditor
        isOpen={showNotionEditor}
        onClose={() => { setShowNotionEditor(false); setEditingId(null); }}
        referenceId={editingId}
        clienteId={clienteId}
        onSave={() => carregarReferencias()}
      />

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => { setDeleteDialog({ open }); if (!open) setConfirmTitle(""); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Digite o título para confirmar a exclusão de:{" "}
            <strong>{deleteDialog.referencia?.titulo}</strong>
          </p>
          <Input
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder="Digite o título exato"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={excluirReferencia}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar via CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Formato: titulo,categoria,is_template,links_externos</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplateCSV} className="flex-1">
                <Download className="h-4 w-4 mr-1.5" />
                Baixar Template
              </Button>
            </div>
            <div>
              <Label htmlFor="csv-file-cliente">Arquivo CSV</Label>
              <Input id="csv-file-cliente" type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancelar</Button>
              <Button onClick={processarImportacaoCSV} disabled={!csvFile || importLoading}>
                {importLoading ? "Importando..." : "Importar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};