import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClienteEscala {
    id: string;
    nome: string;
    serie: string | null;
    situacao_cliente: string | null;
    escala_contato: number[];
    ultimo_contato_at: string | null;
    cs_id: string | null;
    gestor_id: string | null;
    ativo: boolean;
}

export function useEscalaContatos() {
    const queryClient = useQueryClient();

    // Buscar todos os clientes ativos
    const { data: clientes = [], isLoading, error } = useQuery({
        queryKey: ["escala-contatos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, serie, situacao_cliente, escala_contato, ultimo_contato_at, cs_id, primary_gestor_user_id, ativo, is_active")
                .eq("ativo", true)
                .eq("is_active", true)
                .order("nome", { ascending: true });

            if (error) throw new Error(error.message);

            // Mapear para garantir que os nomes correspondam à interface se algo for diferente
            return data as unknown as ClienteEscala[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Mutator para registrar contato (atualiza data para "agora")
    const marcarContatoMutation = useMutation({
        mutationFn: async (clienteId: string) => {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from("clientes")
                .update({ ultimo_contato_at: now })
                .eq("id", clienteId);

            if (error) throw new Error(error.message);
            return { clienteId, now };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["escala-contatos"] });
            toast.success("Contato registrado com sucesso!");
        },
        onError: (err) => {
            toast.error(`Erro ao registrar contato: ${err.message}`);
        }
    });

    // Mutator para alterar os dias da semana de um cliente
    const alterarEscalaMutation = useMutation({
        mutationFn: async ({ clienteId, novosDias }: { clienteId: string; novosDias: number[] }) => {
            const { error } = await supabase
                .from("clientes")
                .update({ escala_contato: novosDias })
                .eq("id", clienteId);

            if (error) throw new Error(error.message);
            return { clienteId, novosDias };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["escala-contatos"] });
            toast.success("Escala do cliente atualizada com sucesso!");
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar escala: ${err.message}`);
        }
    });

    // Mutator para realizar update em massa por série
    const bulkAlterarEscalaSerieMutation = useMutation({
        mutationFn: async ({ serie, novosDias }: { serie: string; novosDias: number[] }) => {
            const { error } = await supabase
                .from("clientes")
                .update({ escala_contato: novosDias })
                .eq("serie", serie);

            if (error) throw new Error(error.message);
            return { serie, novosDias };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["escala-contatos"] });
            toast.success("Escala da série atualizada para todos os clientes!");
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar série: ${err.message}`);
        }
    });

    return {
        clientes,
        isLoading,
        error,
        marcarContato: (id: string) => marcarContatoMutation.mutate(id),
        isMarcandoContato: marcarContatoMutation.isPending,
        alterarEscala: (id: string, novosDias: number[]) => alterarEscalaMutation.mutate({ clienteId: id, novosDias }),
        isAlterandoEscala: alterarEscalaMutation.isPending,
        bulkAlterarEscalaSerie: (serie: string, novosDias: number[]) => bulkAlterarEscalaSerieMutation.mutate({ serie, novosDias }),
        isBulkUpdating: bulkAlterarEscalaSerieMutation.isPending
    };
}
