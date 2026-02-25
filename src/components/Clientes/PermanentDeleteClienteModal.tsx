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

interface PermanentDeleteClienteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cliente: {
        id: string;
        nome: string;
    } | null;
    onSuccess: () => void;
}

export const PermanentDeleteClienteModal = ({
    open,
    onOpenChange,
    cliente,
    onSuccess
}: PermanentDeleteClienteModalProps) => {
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
            console.log('Iniciando exclusão PERMANENTE do cliente:', cliente.id, cliente.nome);

            // Delete físico: remover o cliente e todos os dados associados (cascade)
            const { error: deleteError } = await supabase
                .from('clientes')
                .delete()
                .eq('id', cliente.id);

            if (deleteError) throw deleteError;

            // Notify team (opcional, já que o cliente nem existe mais no banco)
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            await supabase.from('avisos').insert({
                titulo: "Exclusão de Cliente 🗑️",
                conteudo: `O cliente ${cliente.nome} foi excluído permanentemente da plataforma.`,
                tipo: 'warning',
                prioridade: 'normal',
                created_by: currentUser?.id
            });

            console.log('Cliente excluído permanentemente com sucesso');
            toast({
                title: "Cliente excluído permanentemente",
                description: `${cliente.nome} foi removido permanentemente de todos os registros.`,
            });

            setConfirmName("");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Erro ao excluir permanentemente o cliente:', error);
            toast({
                title: "Erro ao excluir permanentemente",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="border-2 border-red-500 shadow-xl">
                <AlertDialogHeader>
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <AlertDialogTitle className="text-red-600 text-xl font-bold">Exclusão Permanente</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-slate-700 font-medium">
                        <span className="text-red-700 font-black uppercase text-lg block mb-2">Ação Irreversível!</span>
                        Tem certeza que deseja apagar o cliente{" "}
                        <span className="font-bold text-foreground">"{cliente?.nome}"</span> permanentemente?
                        <br />
                        <br />
                        <span className="bg-red-50 p-3 rounded-lg border border-red-100 block text-red-700 leading-snug">
                            Esta ação removerá todos os dados vinculados a este cliente (reuniões, arquivos, interações, etc.) de forma definitiva.
                            Não será possível restaurar estes dados nem mesmo via suporte.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 py-4">
                    <Label htmlFor="confirmPermanentDeleteName" className="text-sm font-semibold">
                        Para confirmar, digite exatamente <span className="text-red-600 underline">{cliente?.nome}</span>:
                    </Label>
                    <Input
                        id="confirmPermanentDeleteName"
                        placeholder="Nome do cliente"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        className="border-red-200 focus-visible:ring-red-500 h-11"
                    />
                </div>

                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel disabled={loading} className="hover:bg-slate-100">
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading || confirmName !== cliente?.nome}
                        className="bg-red-600 text-white hover:bg-red-700 border-none transition-all"
                    >
                        {loading ? (
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Excluindo...</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Trash2 className="h-4 w-4" />
                                <span>Excluir Permanentemente</span>
                            </div>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
