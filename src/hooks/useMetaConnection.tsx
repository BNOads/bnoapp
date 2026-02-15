import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MetaConnection {
  id: string;
  token_reference: string;
  auth_type: string;
  status: string;
  business_id: string | null;
  last_validated_at: string | null;
  expires_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ValidateTokenResult {
  success: boolean;
  user: { id: string; name: string };
  expires_at: string | null;
  accounts: any[];
  accounts_count: number;
}

export const useMetaConnection = () => {
  const queryClient = useQueryClient();

  const { data: connections, isLoading, error } = useQuery({
    queryKey: ['meta-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MetaConnection[];
    },
  });

  const activeConnection = connections?.find(c => c.status === 'active') || null;

  const validateTokenMutation = useMutation({
    mutationFn: async (token: string): Promise<ValidateTokenResult> => {
      const { data, error } = await supabase.functions.invoke('meta-ads-validate-token', {
        body: { token },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-connections'] });
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts'] });
    },
  });

  return {
    connections: connections || [],
    activeConnection,
    isLoading,
    error,
    validateToken: validateTokenMutation.mutateAsync,
    isValidating: validateTokenMutation.isPending,
    validationError: validateTokenMutation.error,
  };
};
