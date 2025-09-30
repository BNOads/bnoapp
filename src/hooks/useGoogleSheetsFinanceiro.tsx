import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SheetType = 'resumo-ano-1' | 'resumo-ano-2' | 'clientes-ativos' | 'movimentos';

interface UseGoogleSheetsOptions {
  sheet: SheetType;
  enabled?: boolean;
  refresh?: boolean;
}

export const useGoogleSheetsFinanceiro = ({ sheet, enabled = true, refresh = false }: UseGoogleSheetsOptions) => {
  return useQuery({
    queryKey: ['google-sheets-financeiro', sheet, refresh],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-sheets-financeiro', {
        body: { 
          action: 'read',
          sheet,
          refresh 
        },
      });

      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};
