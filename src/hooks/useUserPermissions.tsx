import { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserPermissions {
  isAdmin: boolean;
  isMaster: boolean;
  canCreateContent: boolean;
  canManageBudgets: boolean;
  canManageReferences: boolean;
  loading: boolean;
}

export const useUserPermissions = (): UserPermissions => {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    isAdmin: false,
    isMaster: false,
    canCreateContent: false,
    canManageBudgets: false,
    canManageReferences: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading || !user) {
      setPermissions({
        isAdmin: false,
        isMaster: false,
        canCreateContent: false,
        canManageBudgets: false,
        canManageReferences: false,
        loading: authLoading,
      });
      return;
    }

  const checkUserPermissions = async () => {
    try {
      // Verificar perfil do usuário
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nivel_acesso')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        throw error;
      }

      // Definir permissões baseadas no nível de acesso
      const isAdmin = profile?.nivel_acesso === 'admin';
      const isMaster = isAdmin; // Simplificado: se é admin, é master
      const canCreateContent = ['admin', 'gestor_trafego', 'cs'].includes(profile?.nivel_acesso);
      
      // CS, gestor_trafego e admin podem gerenciar orçamentos e referências
      const canManageBudgets = ['admin', 'gestor_trafego', 'cs'].includes(profile?.nivel_acesso);
      const canManageReferences = ['admin', 'gestor_trafego', 'cs'].includes(profile?.nivel_acesso);

      console.log('Permissões verificadas:', {
        email: user.email,
        nivel_acesso: profile?.nivel_acesso,
        isAdmin,
        canCreateContent
      });

      setPermissions({
        isAdmin,
        isMaster,
        canCreateContent,
        canManageBudgets,
        canManageReferences,
        loading: false,
      });
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setPermissions({
          isAdmin: false,
          isMaster: false,
          canCreateContent: false,
          canManageBudgets: false,
          canManageReferences: false,
          loading: false,
        });
      }
    };

    checkUserPermissions();
  }, [user, authLoading]);

  return permissions;
};