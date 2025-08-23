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
        const { data: profile } = await supabase
          .from('profiles')
          .select('nivel_acesso')
          .eq('user_id', user.id)
          .maybeSingle();

        // Verificar se é email master
        const { data: masterEmail } = await supabase
          .from('master_emails')
          .select('email')
          .eq('email', user.email!)
          .maybeSingle();

        const isAdmin = profile?.nivel_acesso === 'admin';
        const isMaster = !!masterEmail;
        const canCreateContent = isAdmin || isMaster;

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