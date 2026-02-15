import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MetaAdAccount {
  id: string;
  meta_account_id: string;
  name: string;
  account_status: number | null;
  business_name: string | null;
  currency: string | null;
  timezone: string | null;
  is_active: boolean | null;
  last_synced_at: string | null;
  sync_error: string | null;
  connection_id: string;
  meta_connections: {
    id: string;
    status: string;
    expires_at: string | null;
  } | null;
  meta_client_ad_accounts: Array<{
    id: string;
    cliente_id: string;
    is_primary: boolean | null;
    primary_action_type: string | null;
    clientes: {
      id: string;
      nome: string;
      slug: string | null;
    } | null;
  }>;
}

export const useMetaAdAccounts = () => {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, error, refetch } = useQuery({
    queryKey: ['meta-ad-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select(`
          *,
          meta_connections (id, status, expires_at, last_validated_at),
          meta_client_ad_accounts (
            id,
            cliente_id,
            is_primary,
            primary_action_type,
            clientes (id, nome, slug)
          )
        `)
        .order('name');

      if (error) throw error;
      return data as MetaAdAccount[];
    },
  });

  const associateMutation = useMutation({
    mutationFn: async ({ ad_account_id, cliente_id }: { ad_account_id: string; cliente_id: string }) => {
      const { data, error } = await supabase
        .from('meta_client_ad_accounts')
        .insert({ ad_account_id, cliente_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts'] });
    },
  });

  const dissociateMutation = useMutation({
    mutationFn: async ({ ad_account_id, cliente_id }: { ad_account_id: string; cliente_id: string }) => {
      const { error } = await supabase
        .from('meta_client_ad_accounts')
        .delete()
        .eq('ad_account_id', ad_account_id)
        .eq('cliente_id', cliente_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts'] });
    },
  });

  const autoAssociateMutation = useMutation({
    mutationFn: async (apply: boolean = false) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-accounts', {
        body: { action: 'auto_associate', apply },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts'] });
    },
  });

  const syncAccountMutation = useMutation({
    mutationFn: async ({ ad_account_id, date_from, date_to }: { ad_account_id: string; date_from?: string; date_to?: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { ad_account_id, date_from, date_to },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['meta-sync-logs'] });
    },
  });

  return {
    accounts: accounts || [],
    isLoading,
    error,
    refetch,
    associate: associateMutation.mutateAsync,
    isAssociating: associateMutation.isPending,
    dissociate: dissociateMutation.mutateAsync,
    isDissociating: dissociateMutation.isPending,
    autoAssociate: autoAssociateMutation.mutateAsync,
    isAutoAssociating: autoAssociateMutation.isPending,
    syncAccount: syncAccountMutation.mutateAsync,
    isSyncing: syncAccountMutation.isPending,
  };
};

export const useClientAdAccounts = (clienteId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-ad-accounts', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];

      const { data, error } = await supabase
        .from('meta_client_ad_accounts')
        .select(`
          *,
          meta_ad_accounts (
            id, meta_account_id, name, account_status, business_name,
            currency, timezone, is_active, last_synced_at, sync_error
          )
        `)
        .eq('cliente_id', clienteId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });

  return {
    adAccounts: data || [],
    isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['client-ad-accounts', clienteId] }),
  };
};
