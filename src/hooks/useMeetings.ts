import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Meeting = Database['public']['Tables']['meetings']['Row'];
type MeetingInsert = Database['public']['Tables']['meetings']['Insert'];
type MeetingUpdate = Database['public']['Tables']['meetings']['Update'];

type MeetingParticipant = Database['public']['Tables']['meeting_participants']['Row'];
type MeetingParticipantInsert = Database['public']['Tables']['meeting_participants']['Insert'];

export const meetingKeys = {
    all: ["meetings"] as const,
    lists: () => [...meetingKeys.all, "list"] as const,
    list: (filters: Record<string, any>) => [...meetingKeys.lists(), { filters }] as const,
    details: () => [...meetingKeys.all, "detail"] as const,
    detail: (id: string) => [...meetingKeys.details(), id] as const,
    participants: (meetingId: string) => [...meetingKeys.detail(meetingId), "participants"] as const,
};

export interface MeetingFilters {
    cliente_id?: string;
    gestor_id?: string;
    data_inicio?: string;
    data_fim?: string;
}

export function useMeetings(filters?: MeetingFilters) {
    return useQuery({
        queryKey: meetingKeys.list(filters || {}),
        queryFn: async () => {
            let query = supabase
                .from("meetings")
                .select(`
          *,
          clientes(nome, situacao_cliente),
          colaboradores(nome, avatar_url),
          meeting_participants(*),
          tasks(*)
        `)
                .order("data", { ascending: true })
                .order("hora_inicio", { ascending: true });

            if (filters?.cliente_id) {
                query = query.eq("cliente_id", filters.cliente_id);
            }
            if (filters?.gestor_id) {
                query = query.eq("gestor_id", filters.gestor_id);
            }
            if (filters?.data_inicio) {
                query = query.gte("data", filters.data_inicio);
            }
            if (filters?.data_fim) {
                query = query.lte("data", filters.data_fim);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useMeeting(id: string) {
    return useQuery({
        queryKey: meetingKeys.detail(id),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("meetings")
                .select(`
          *,
          clientes(nome, situacao_cliente),
          colaboradores(nome, avatar_url),
          meeting_participants(*),
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

export function useCreateMeeting() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newMeeting: MeetingInsert) => {
            const { data, error } = await supabase
                .from("meetings")
                .insert(newMeeting)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meetingKeys.all });
            toast({
                title: "Reunião criada",
                description: "A reunião foi criada com sucesso.",
            });
        },
        onError: (error) => {
            console.error("Error creating meeting:", error);
            toast({
                title: "Erro",
                description: "Não foi possível criar a reunião.",
                variant: "destructive",
            });
        },
    });
}

export function useUpdateMeeting() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...updates }: MeetingUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from("meetings")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: meetingKeys.all });
            queryClient.invalidateQueries({ queryKey: meetingKeys.detail(data.id) });
            toast({
                title: "Reunião atualizada",
                description: "As informações da reunião foram salvas.",
            });
        },
        onError: (error) => {
            console.error("Error updating meeting:", error);
            toast({
                title: "Erro",
                description: "Não foi possível atualizar a reunião.",
                variant: "destructive",
            });
        },
    });
}

export function useDeleteMeeting() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("meetings")
                .delete()
                .eq("id", id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meetingKeys.all });
            toast({
                title: "Reunião excluída",
                description: "A reunião foi removida com sucesso.",
            });
        },
        onError: (error) => {
            console.error("Error deleting meeting:", error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir a reunião.",
                variant: "destructive",
            });
        },
    });
}

// Participants hooks

export function useAddMeetingParticipant() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (participant: MeetingParticipantInsert) => {
            const { data, error } = await supabase
                .from("meeting_participants")
                .insert(participant)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: meetingKeys.detail(data.meeting_id) });
        },
        onError: (error) => {
            console.error("Error adding participant:", error);
            toast({
                title: "Erro",
                description: "Não foi possível adicionar o participante.",
                variant: "destructive",
            });
        },
    });
}

export function useUpdateMeetingParticipant() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, meeting_id, ...updates }: Partial<MeetingParticipant> & { id: string, meeting_id: string }) => {
            const { data, error } = await supabase
                .from("meeting_participants")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: meetingKeys.detail(data.meeting_id) });
        },
        onError: (error) => {
            console.error("Error updating participant:", error);
            toast({
                title: "Erro",
                description: "Não foi possível atualizar o participante.",
                variant: "destructive",
            });
        },
    });
}
