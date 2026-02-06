import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ValorCard } from "./ValorCard";
import { NovoValorModal } from "./NovoValorModal";
import { EditarValorModal } from "./EditarValorModal";
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

interface ValoresGridProps {
  valores: any[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const ValoresGrid = ({ valores, isAdmin, onRefresh }: ValoresGridProps) => {
  const { toast } = useToast();

  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedValor, setSelectedValor] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [valorToDelete, setValorToDelete] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = valores.findIndex((v) => v.id === active.id);
    const newIndex = valores.findIndex((v) => v.id === over.id);
    const reordered = arrayMove(valores, oldIndex, newIndex);

    // Update order in database
    try {
      const updates = reordered.map((v, index) =>
        supabase.from("cultura_valores").update({ ordem: index }).eq("id", v.id)
      );
      await Promise.all(updates);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (valor: any) => {
    try {
      const { error } = await supabase
        .from("cultura_valores")
        .update({ ativo: !valor.ativo })
        .eq("id", valor.id);

      if (error) throw error;
      toast({ title: valor.ativo ? "Valor desativado" : "Valor ativado" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!valorToDelete) return;
    try {
      const { error } = await supabase
        .from("cultura_valores")
        .delete()
        .eq("id", valorToDelete.id);

      if (error) throw error;
      toast({ title: "Valor excluído!" });
      setDeleteDialogOpen(false);
      setValorToDelete(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir valor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (valor: any) => {
    setSelectedValor(valor);
    setEditModalOpen(true);
  };

  const handleDeleteRequest = (valor: any) => {
    setValorToDelete(valor);
    setDeleteDialogOpen(true);
  };

  // Filter: non-admin only sees active values
  const visibleValores = isAdmin ? valores : valores.filter((v) => v.ativo);
  const nextOrdem = valores.length > 0 ? Math.max(...valores.map((v) => v.ordem)) + 1 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Valores</h3>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setNovoModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Valor
          </Button>
        )}
      </div>

      {visibleValores.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhum valor cadastrado ainda.</p>
          {isAdmin && (
            <Button className="mt-3" size="sm" onClick={() => setNovoModalOpen(true)}>
              Adicionar Primeiro Valor
            </Button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleValores.map((v) => v.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleValores.map((valor) => (
                <ValorCard
                  key={valor.id}
                  valor={valor}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modals */}
      <NovoValorModal
        open={novoModalOpen}
        onOpenChange={setNovoModalOpen}
        onSuccess={onRefresh}
        nextOrdem={nextOrdem}
      />

      <EditarValorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        valor={selectedValor}
        onSuccess={onRefresh}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o valor &quot;{valorToDelete?.titulo}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
