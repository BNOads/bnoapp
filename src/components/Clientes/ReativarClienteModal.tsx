import { useState } from "react";
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
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReativarClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: {
    id: string;
    nome: string;
  } | null;
  onSuccess: () => void;
}

export const ReativarClienteModal = ({ 
  open, 
  onOpenChange, 
  cliente, 
  onSuccess 
}: ReativarClienteModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReativar = async () => {
    if (!cliente) return;

    try {
      setLoading(true);

      // Reativar cliente
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ is_active: true })
        .eq('id', cliente.id);

      if (updateError) throw updateError;

      // Registrar no audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: auditError } = await supabase
          .from('clientes_audit_log')
          .insert({
            user_id: user.id,
            cliente_id: cliente.id,
            acao: 'reativar',
            motivo: 'Cliente reativado'
          });

        if (auditError) console.error('Erro ao registrar audit:', auditError);
      }

      toast({
        title: "Cliente reativado",
        description: `${cliente.nome} voltou para a aba de clientes ativos.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao reativar cliente:', error);
      toast({
        title: "Erro ao reativar cliente",
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
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertDialogTitle>Reativar Cliente</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Tem certeza que deseja reativar o cliente{" "}
            <span className="font-semibold">{cliente?.nome}</span>?
            <br />
            <br />
            O cliente voltará a aparecer nas telas operacionais.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReativar}
            disabled={loading}
            className="bg-green-500 text-white hover:bg-green-600"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Reativando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Reativar Cliente</span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};