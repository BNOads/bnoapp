import { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserPermissions {
  isAdmin: boolean;
  isMaster: boolean;
  canCreateContent: boolean;
  loading: boolean;
}

export const useUserPermissions = (): UserPermissions => {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    isAdmin: false,
    isMaster: false,
    canCreateContent: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading || !user) {
      setPermissions({
        isAdmin: false,
        isMaster: false,
        canCreateContent: false,
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

      // Para evitar problemas com RLS na tabela master_emails, 
      // vamos considerar master qualquer usuário que seja admin
      const isAdmin = profile?.nivel_acesso === 'admin';
      const isMaster = isAdmin; // Simplificado: se é admin, é master
      const canCreateContent = isAdmin;

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
        loading: false,
      });
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setPermissions({
          isAdmin: false,
          isMaster: false,
          canCreateContent: false,
          loading: false,
        });
      }
    };

    checkUserPermissions();
  }, [user, authLoading]);

  return permissions;
};