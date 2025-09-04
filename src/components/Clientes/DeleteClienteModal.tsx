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
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!cliente) return;

    try {
      setLoading(true);
      console.log('Iniciando exclusão do cliente:', cliente.id, cliente.nome);

      // Primeiro, verificar se existem tarefas e excluí-las
      console.log('Verificando e excluindo tarefas...');
      const { data: tarefasData, error: tarefasSelectError } = await supabase
        .from('tarefas')
        .select('id')
        .eq('cliente_id', cliente.id);

      if (tarefasSelectError) {
        console.error('Erro ao verificar tarefas:', tarefasSelectError);
      } else if (tarefasData && tarefasData.length > 0) {
        console.log(`Encontradas ${tarefasData.length} tarefas para excluir`);
        const { error: tarefasDeleteError } = await supabase
          .from('tarefas')
          .delete()
          .eq('cliente_id', cliente.id);
        
        if (tarefasDeleteError) {
          console.error('Erro ao excluir tarefas:', tarefasDeleteError);
          throw tarefasDeleteError;
        }
        console.log('Tarefas excluídas com sucesso');
      }

      // Excluir outras referências do cliente
      console.log('Excluindo gravações...');
      await supabase.from('gravacoes').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo reuniões...');
      await supabase.from('reunioes').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo links importantes...');
      await supabase.from('links_importantes').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo orçamentos...');
      await supabase.from('orcamentos_funil').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo documentos...');
      await supabase.from('documentos').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo interações...');
      await supabase.from('interacoes').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo criativos...');
      await supabase.from('criativos').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo creatives...');
      await supabase.from('creatives').delete().eq('client_id', cliente.id);

      console.log('Excluindo referências...');
      await supabase.from('referencias_criativos').delete().eq('cliente_id', cliente.id);

      console.log('Excluindo layout...');
      await supabase.from('clientes_layout').delete().eq('cliente_id', cliente.id);

      // Por último, excluir o cliente
      console.log('Excluindo cliente...');
      const { error: clienteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', cliente.id);

      if (clienteError) {
        console.error('Erro ao excluir cliente:', clienteError);
        throw clienteError;
      }

      console.log('Cliente excluído com sucesso');
      toast({
        title: "Painel excluído",
        description: `O painel do cliente ${cliente.nome} foi excluído com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: "Erro ao excluir painel",
        description: error.message || "Erro desconhecido ao excluir o painel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open || !cliente) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o painel do cliente{" "}
            <span className="font-semibold">{cliente.nome}</span>?
            <br />
            <br />
            <span className="text-destructive font-medium">
              Esta ação não pode ser desfeita. Todos os dados relacionados ao cliente serão permanentemente removidos.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Excluindo...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Trash2 className="h-4 w-4" />
                <span>Excluir Painel</span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};