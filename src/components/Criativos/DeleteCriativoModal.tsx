import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteCriativoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criativo: {id: string, nome: string} | null;
  onSuccess: () => void;
}

export const DeleteCriativoModal = ({ open, onOpenChange, criativo, onSuccess }: DeleteCriativoModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!criativo) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('criativos')
        .update({ ativo: false })
        .eq('id', criativo.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Criativo removido!",
        description: "O criativo foi removido com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao remover criativo:', error);
      toast({
        title: "Erro ao remover criativo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover Criativo</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover o criativo "{criativo?.nome}"? 
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};