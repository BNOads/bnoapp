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

            // Fetch client name + responsavel name + create log in parallel
            const [clienteRes, responsavelRes] = await Promise.all([
                supabase.from("clientes").select("nome").eq("id", ticket.cliente_id).single(),
                ticket.responsavel_id
                    ? supabase.from("colaboradores").select("nome").eq("user_id", ticket.responsavel_id).single()
                    : Promise.resolve({ data: null }),
                supabase.from("ticket_logs").insert({
                    ticket_id: ticket.id,
                    user_id: user.id,
                    acao: "criado",
                    descricao: "Ticket aberto pelo sistema",
                }),
            ]);

            const clienteNome = clienteRes.data?.nome || "Cliente";
            const responsavelNome = (responsavelRes as any).data?.nome || null;
            const descricaoResumida = (ticket.descricao || "").substring(0, 80);
            const SUPORTE_LIST_ID = "909c6ae7-c732-4d9c-8d9a-ff20cfcc5e3b";

            // 2. Create primary Task linked to Ticket (assigned to responsável)
            const { data: task, error: taskError } = await supabase
                .from("tasks")
                .insert({
                    title: `${clienteNome} | ${descricaoResumida}`,
                    description: ticket.descricao,
                    priority: ticket.prioridade === "critica" || ticket.prioridade === "alta" ? "alta" :
                        ticket.prioridade === "media" ? "media" : "baixa",
                    assigned_to_id: ticket.responsavel_id || user.id,
                    assignee: responsavelNome,
                    created_by_id: user.id,
                    ticket_id: ticket.id,
                    cliente_id: ticket.cliente_id,
                    list_id: SUPORTE_LIST_ID,
                })
                .select()
                .single();

            if (taskError) {
                console.error("Error creating linked task:", taskError);
            } else {
                // Update ticket with linked task id
                await supabase
                    .from("tickets")
                    .update({ linked_task_id: task.id })
                    .eq("id", ticket.id);

                // 3. If creator is different from responsável, create follow-up task for creator
                if (ticket.responsavel_id && ticket.responsavel_id !== user.id) {
                    // Get creator name
                    const { data: creatorData } = await supabase
                        .from("colaboradores")
                        .select("nome")
                        .eq("user_id", user.id)
                        .single();

                    await supabase.from("tasks").insert({
                        title: `[Acompanhamento] ${clienteNome} | ${descricaoResumida}`,
                        description: `Ticket #${ticket.numero} aberto. Acompanhe o andamento da tarefa principal de suporte.`,
                        priority: ticket.prioridade === "critica" || ticket.prioridade === "alta" ? "alta" :
                            ticket.prioridade === "media" ? "media" : "baixa",
                        assigned_to_id: user.id,
                        assignee: creatorData?.nome || null,
                        created_by_id: user.id,
                        ticket_id: ticket.id,
                        cliente_id: ticket.cliente_id,
                        list_id: SUPORTE_LIST_ID,
                    });
                }
            }

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

export function useLinkTaskToTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ ticketId, taskId }: { ticketId: string; taskId: string }) => {
            const { error } = await supabase
                .from("tasks")
                .update({ ticket_id: ticketId })
                .eq("id", taskId);

            if (error) throw error;

            // Log the action
            const user = (await supabase.auth.getUser()).data.user;
            await supabase.from("ticket_logs").insert({
                ticket_id: ticketId,
                user_id: user?.id,
                acao: "tarefa_vinculada",
                descricao: "Tarefa existente vinculada ao ticket",
            });
        },
        onSuccess: (_, { ticketId }) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Tarefa vinculada ao ticket" });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao vincular tarefa", description: error.message, variant: "destructive" });
        },
    });
}

export function useUnlinkTaskFromTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ ticketId, taskId }: { ticketId: string; taskId: string }) => {
            const { error } = await supabase
                .from("tasks")
                .update({ ticket_id: null })
                .eq("id", taskId);

            if (error) throw error;
        },
        onSuccess: (_, { ticketId }) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Tarefa desvinculada do ticket" });
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
