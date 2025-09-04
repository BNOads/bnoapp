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

      // Excluir todas as referências do cliente em cascata
      console.log('Excluindo tarefas...');
      const { error: tarefasError } = await supabase
        .from('tarefas')
        .delete()
        .eq('cliente_id', cliente.id);
      if (tarefasError && tarefasError.code !== 'PGRST116') throw tarefasError;

      console.log('Excluindo gravações...');
      const { error: gravacoesError } = await supabase
        .from('gravacoes')
        .delete()
        .eq('cliente_id', cliente.id);
      if (gravacoesError && gravacoesError.code !== 'PGRST116') throw gravacoesError;

      console.log('Excluindo reuniões...');
      const { error: reunioesError } = await supabase
        .from('reunioes')
        .delete()
        .eq('cliente_id', cliente.id);
      if (reunioesError && reunioesError.code !== 'PGRST116') throw reunioesError;

      console.log('Excluindo links importantes...');
      const { error: linksError } = await supabase
        .from('links_importantes')
        .delete()
        .eq('cliente_id', cliente.id);
      if (linksError && linksError.code !== 'PGRST116') throw linksError;

      console.log('Excluindo orçamentos...');
      const { error: orcamentosError } = await supabase
        .from('orcamentos_funil')
        .delete()
        .eq('cliente_id', cliente.id);
      if (orcamentosError && orcamentosError.code !== 'PGRST116') throw orcamentosError;

      console.log('Excluindo documentos...');
      const { error: documentosError } = await supabase
        .from('documentos')
        .delete()
        .eq('cliente_id', cliente.id);
      if (documentosError && documentosError.code !== 'PGRST116') throw documentosError;

      console.log('Excluindo interações...');
      const { error: interacoesError } = await supabase
        .from('interacoes')
        .delete()
        .eq('cliente_id', cliente.id);
      if (interacoesError && interacoesError.code !== 'PGRST116') throw interacoesError;

      console.log('Excluindo criativos...');
      const { error: criativosError } = await supabase
        .from('criativos')
        .delete()
        .eq('cliente_id', cliente.id);
      if (criativosError && criativosError.code !== 'PGRST116') throw criativosError;

      console.log('Excluindo creatives...');
      const { error: creativesError } = await supabase
        .from('creatives')
        .delete()
        .eq('client_id', cliente.id);
      if (creativesError && creativesError.code !== 'PGRST116') throw creativesError;

      console.log('Excluindo referências...');
      const { error: referenciasError } = await supabase
        .from('referencias_criativos')
        .delete()
        .eq('cliente_id', cliente.id);
      if (referenciasError && referenciasError.code !== 'PGRST116') throw referenciasError;

      console.log('Excluindo layout...');
      const { error: layoutError } = await supabase
        .from('clientes_layout')
        .delete()
        .eq('cliente_id', cliente.id);
      if (layoutError && layoutError.code !== 'PGRST116') throw layoutError;

      // Depois, excluir o cliente
      console.log('Excluindo cliente...');
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', cliente.id);

      if (error) {
        console.error('Erro ao excluir cliente:', error);
        throw error;
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
        description: error.message,
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