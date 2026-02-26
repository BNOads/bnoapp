import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
    clientes?: { nome: string };
    profiles?: { nome: string };
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
                .select("*, clientes(nome), profiles!tickets_responsavel_id_fkey(nome)")
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
            return data as Ticket[];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useTicket(id: string) {
    return useQuery({
        queryKey: ticketKeys.detail(id),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tickets")
                .select(`
          *,
          clientes(nome, whatsapp_grupo_url),
          profiles!tickets_responsavel_id_fkey(nome, email),
          ticket_logs(*, profiles(nome)),
          ticket_anexos(*),
          tasks(*)
        `)
                .eq("id", id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });
}
