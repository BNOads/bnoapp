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
import { Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: {
    id: string;
    nome: string;
  } | null;
  onSuccess: () => void;
}

export const DeleteClienteModal = ({
  open,
  onOpenChange,
  cliente,
  onSuccess
}: DeleteClienteModalProps) => {
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!cliente || confirmName !== cliente.nome) {
      toast({
        title: "Nome incorreto",
        description: "Digite o nome do cliente corretamente para confirmar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Iniciando soft delete do cliente:', cliente.id, cliente.nome);

      // Soft delete: marcar como deletado
      const { error: updateError } = await supabase
        .from('clientes')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', cliente.id);

      if (updateError) throw updateError;

      // Notify team
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from('avisos').insert({
        titulo: "Saída de Cliente 😔",
        conteudo: `Sentimentos ao time. 😔 O cliente ${cliente.nome} foi removido.`,
        tipo: 'warning',
        prioridade: 'normal',
        created_by: currentUser?.id
      });

      // Registrar no audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: auditError } = await supabase
          .from('clientes_audit_log')
          .insert({
            user_id: user.id,
            cliente_id: cliente.id,
            acao: 'apagar',
            motivo: 'Cliente removido via interface'
          });

        if (auditError) console.error('Erro ao registrar audit:', auditError);
      }

      console.log('Cliente apagado com sucesso (soft delete)');
      toast({
        title: "Cliente apagado",
        description: `${cliente.nome} foi removido. É possível restaurar via suporte.`,
      });

      setConfirmName("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao apagar cliente:', error);
      toast({
        title: "Erro ao apagar cliente",
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Apagar Cliente</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Tem certeza que deseja apagar o cliente{" "}
            <span className="font-semibold">{cliente?.nome}</span>?
            <br />
            <br />
            <span className="text-destructive font-medium">
              O cliente será removido das listas. É possível restaurar via suporte se necessário.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirmName">
            Digite <span className="font-semibold">{cliente?.nome}</span> para confirmar:
          </Label>
          <Input
            id="confirmName"
            placeholder="Nome do cliente"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || confirmName !== cliente?.nome}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Apagando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Trash2 className="h-4 w-4" />
                <span>Apagar Cliente</span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};