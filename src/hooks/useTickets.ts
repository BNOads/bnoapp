import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
    clientes?: { nome: string };
    responsavel_nome?: string;
    responsavel_avatar?: string | null;
};

export const ticketKeys = {
    all: ["tickets"] as const,
    lists: () => [...ticketKeys.all, "list"] as const,
    list: (filters: string) => [...ticketKeys.lists(), { filters }] as const,
    details: () => [...ticketKeys.all, "detail"] as const,
    detail: (id: string) => [...ticketKeys.details(), id] as const,
};

export interface TicketFilters {
    search?: string;
    status?: string;
    priority?: string;
    category?: string;
    responsavel_id?: string;
    cliente_id?: string;
    origem?: string;
}

export function useTickets(filters?: TicketFilters) {
    return useQuery({
        queryKey: ticketKeys.list(JSON.stringify(filters || {})),
        queryFn: async () => {
            let query = supabase
                .from("tickets")
                .select("*, clientes(nome)")
                .order("created_at", { ascending: false });

            if (filters?.search) {
                query = query.or(`descricao.ilike.%${filters.search}%,numero.ilike.%${filters.search}%`);
            }
            if (filters?.status && filters.status !== "all") {
                query = query.eq("status", filters.status);
            }
            if (filters?.priority && filters.priority !== "all") {
                query = query.eq("prioridade", filters.priority);
            }
            if (filters?.category && filters.category !== "all") {
                query = query.eq("categoria", filters.category);
            }
            if (filters?.responsavel_id && filters.responsavel_id !== "all") {
                query = query.eq("responsavel_id", filters.responsavel_id);
            }
            if (filters?.cliente_id && filters.cliente_id !== "all") {
                query = query.eq("cliente_id", filters.cliente_id);
            }
            if (filters?.origem && filters.origem !== "all") {
                query = query.eq("origem", filters.origem);
            }

            const { data, error } = await query;
            if (error) throw error;

            const tickets = (data || []) as unknown as Ticket[];

            // Enrich with responsavel names + avatars from colaboradores
            const responsavelIds = [...new Set(tickets.map(t => t.responsavel_id).filter(Boolean))];
            if (responsavelIds.length > 0) {
                const { data: colaboradores } = await supabase
                    .from("colaboradores")
                    .select("user_id, nome, avatar_url")
                    .in("user_id", responsavelIds as string[]);

                if (colaboradores) {
                    const colabMap = new Map(colaboradores.map(c => [c.user_id, c]));
                    tickets.forEach(t => {
                        if (t.responsavel_id) {
                            const colab = colabMap.get(t.responsavel_id);
                            if (colab) {
                                t.responsavel_nome = colab.nome;
                                t.responsavel_avatar = colab.avatar_url;
                            }
                        }
                    });
                }
            }

            return tickets;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useTicket(id: string) {
    return useQuery({
        queryKey: ticketKeys.detail(id),
        queryFn: async () => {
            // Run ticket + logs + all colaboradores in parallel
            const [ticketRes, logsRes, colabRes] = await Promise.all([
                supabase
                    .from("tickets")
                    .select("*, clientes(nome, whatsapp_grupo_url), ticket_anexos(*), tasks!tasks_ticket_id_fkey(*)")
                    .eq("id", id)
                    .single(),
                supabase
                    .from("ticket_logs")
                    .select("*")
                    .eq("ticket_id", id)
                    .order("created_at", { ascending: true }),
                supabase
                    .from("colaboradores")
                    .select("user_id, nome, email, avatar_url")
                    .eq("ativo", true),
            ]);

            if (ticketRes.error) throw ticketRes.error;
            const data = ticketRes.data;
            const logs = logsRes.data || [];
            const colabMap = new Map((colabRes.data || []).map(c => [c.user_id, c]));

            // Responsavel
            const responsavelColab = data.responsavel_id ? colabMap.get(data.responsavel_id) : null;
            const responsavel = responsavelColab
                ? { nome: responsavelColab.nome, email: responsavelColab.email, avatar_url: responsavelColab.avatar_url }
                : null;

            // Enrich logs
            const enrichedLogs = logs.map(l => ({
                ...l,
                profiles: l.user_id ? {
                    nome: colabMap.get(l.user_id)?.nome || "Desconhecido",
                    avatar_url: colabMap.get(l.user_id)?.avatar_url || null,
                } : null,
            }));

            return {
                ...data,
                profiles: responsavel,
                ticket_logs: enrichedLogs,
                criado_por_nome: data.criado_por ? colabMap.get(data.criado_por)?.nome || null : null,
                criado_por_avatar: data.criado_por ? colabMap.get(data.criado_por)?.avatar_url || null : null,
            };
        },
        enabled: !!id,
    });
}
