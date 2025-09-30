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
import { AlertTriangle, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface InativarClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: {
    id: string;
    nome: string;
  } | null;
  onSuccess: () => void;
}

export const InativarClienteModal = ({ 
  open, 
  onOpenChange, 
  cliente, 
  onSuccess 
}: InativarClienteModalProps) => {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { toast } = useToast();

  const handleInativar = async () => {
    if (!cliente) return;

    try {
      setLoading(true);

      // Inativar cliente
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ is_active: false })
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
            acao: 'inativar',
            motivo: motivo || 'Sem motivo informado'
          });

        if (auditError) console.error('Erro ao registrar audit:', auditError);
      }

      toast({
        title: "Cliente inativado",
        description: `${cliente.nome} foi movido para a aba Desativados.`,
      });

      setMotivo("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao inativar cliente:', error);
      toast({
        title: "Erro ao inativar cliente",
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
            <Pause className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle>Inativar Cliente</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Tem certeza que deseja inativar o cliente{" "}
            <span className="font-semibold">{cliente?.nome}</span>?
            <br />
            <br />
            O cliente sairá das telas operacionais, mas poderá ser reativado a qualquer momento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo (opcional)</Label>
          <Textarea
            id="motivo"
            placeholder="Descreva o motivo da inativação..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleInativar}
            disabled={loading}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Inativando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Pause className="h-4 w-4" />
                <span>Inativar Cliente</span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};