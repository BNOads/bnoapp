import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { ticketKeys } from "./useTickets";
import { taskKeys } from "./useTasks";
import { useToast } from "@/hooks/use-toast";

type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];

export function useCreateTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newTicket: TicketInsert) => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("Usuário não autenticado");

            // 1. Create Ticket
            const { data: ticket, error: ticketError } = await supabase
                .from("tickets")
                .insert({
                    ...newTicket,
                    criado_por: user.id,
                })
                .select()
                .single();

            if (ticketError) throw ticketError;

            // 2. Create Task Linked to Ticket
            const { data: task, error: taskError } = await supabase
                .from("tasks")
                .insert({
                    title: `Ticket #${ticket.numero}: ${ticket.categoria}`,
                    description: ticket.descricao,
                    priority: ticket.prioridade === "critica" ? "copa_mundo" :
                        ticket.prioridade === "alta" ? "libertadores" : "brasileirao",
                    status: "pendente",
                    user_id: ticket.responsavel_id || user.id,
                    ticket_id: ticket.id,
                    cliente_id: ticket.cliente_id,
                })
                .select()
                .single();

            if (taskError) {
                console.error("Error creating linked task:", taskError);
                // We don't fail the whole operation but log it
            } else {
                // Update ticket with linked task ID
                await supabase
                    .from("tickets")
                    .update({ linked_task_id: task.id })
                    .eq("id", ticket.id);
            }

            // 3. Create initial log
            await supabase.from("ticket_logs").insert({
                ticket_id: ticket.id,
                user_id: user.id,
                acao: "criado",
                descricao: "Ticket aberto pelo sistema",
            });

            return ticket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Ticket criado com sucesso" });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao criar ticket", description: error.message, variant: "destructive" });
        },
    });
}

export function useUpdateTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: TicketUpdate }) => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase
                .from("tickets")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;

            // Create log for update
            const changes = Object.keys(updates).join(", ");
            await supabase.from("ticket_logs").insert({
                ticket_id: id,
                user_id: user.id,
                acao: "atualizado",
                descricao: `Campos atualizados: ${changes}`,
            });

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(data.id) });
            toast({ title: "Ticket atualizado" });
        },
    });
}

export function useCloseTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            id,
            solucao_descricao,
            anexos
        }: {
            id: string;
            solucao_descricao: string;
            anexos?: { url: string; nome: string; tipo: string; tamanho: number }[];
        }) => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("Usuário não autenticado");

            // 1. Get ticket details to find linked task
            const { data: ticket } = await supabase
                .from("tickets")
                .select("linked_task_id")
                .eq("id", id)
                .single();

            // 2. Update Ticket
            const { data, error } = await supabase
                .from("tickets")
                .update({
                    status: "encerrado",
                    solucao_descricao,
                    encerrado_em: new Date().toISOString(),
                })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;

            // 3. Mark linked task as completed if exists
            if (ticket?.linked_task_id) {
                await supabase
                    .from("tasks")
                    .update({
                        completed: true,
                        completed_at: new Date().toISOString()
                    })
                    .eq("id", ticket.linked_task_id);
            }

            // 4. Register solution logs
            await supabase.from("ticket_logs").insert({
                ticket_id: id,
                user_id: user.id,
                acao: "encerrado",
                descricao: "Ticket encerrado com solução registrada",
            });

            // 5. Register attachments if any
            if (anexos && anexos.length > 0) {
                const anexoEntries = anexos.map(a => ({
                    ticket_id: id,
                    arquivo_url: a.url,
                    nome_arquivo: a.nome,
                    tipo_arquivo: a.tipo,
                    tamanho_arquivo: a.tamanho,
                    criado_por: user.id,
                }));
                await supabase.from("ticket_anexos").insert(anexoEntries);
            }

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Ticket encerrado com sucesso" });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao encerrar ticket", description: error.message, variant: "destructive" });
        },
    });
}
