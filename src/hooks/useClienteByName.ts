import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Find cliente by name (case-insensitive partial match) */
export function useClienteByName(clienteName: string | null) {
    return useQuery({
        queryKey: ["cliente-by-name", clienteName],
        enabled: !!clienteName,
        queryFn: async () => {
            const { data } = await supabase
                .from("clientes")
                .select("id, nome, pasta_drive_url")
                .ilike("nome", `%${clienteName}%`)
                .eq("is_active", true)
                .limit(1);
            return data?.[0] ?? null;
        },
        staleTime: 10 * 60 * 1000,
    });
}
