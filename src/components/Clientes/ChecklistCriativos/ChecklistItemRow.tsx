import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, Edit, Trash2, Film, Image as ImageIcon, FileText, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChecklistItem } from "./ChecklistCriativosView";
import { EditarItemModal } from "./EditarItemModal";
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

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onUpdate: () => void;
  isAuthenticated: boolean;
}

const getTipoIcon = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'video':
      return Film;
    case 'imagem':
      return ImageIcon;
    case 'texto':
      return FileText;
    default:
      return Package;
  }
};

const getTipoBadgeColor = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'video':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'imagem':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'texto':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const ChecklistItemRow = ({ item, onUpdate, isAuthenticated }: ChecklistItemRowProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const TipoIcon = getTipoIcon(item.tipo);

  const handleToggleComplete = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from('checklist_criativos_itens')
        .update({ concluido: checked })
        .eq('id', item.id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: checked ? "Item marcado como concluído" : "Item desmarcado",
      });
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar item",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('checklist_criativos_itens')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso"
      });
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir item",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <Checkbox
          checked={item.concluido}
          onCheckedChange={handleToggleComplete}
          disabled={!isAuthenticated}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <h4 className={`font-medium ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
              {item.titulo}
            </h4>
            <Badge variant="outline" className={`${getTipoBadgeColor(item.tipo)} flex items-center gap-1`}>
              <TipoIcon className="h-3 w-3" />
              {item.tipo.toUpperCase()}
            </Badge>
          </div>

          {item.formato && (
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">FORMATO:</span> {item.formato}
            </p>
          )}

          {item.especificacoes && (
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">ESPECIFICAÇÕES:</span> {item.especificacoes}
            </p>
          )}

          {item.referencias && Array.isArray(item.referencias) && item.referencias.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  toast({
                    title: "Referências",
                    description: "Funcionalidade em desenvolvimento"
                  });
                }}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Ver Referências ({item.referencias.length})
              </Button>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(true)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <EditarItemModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        item={item}
        onSuccess={() => {
          setShowEditModal(false);
          onUpdate();
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
