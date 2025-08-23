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
      console.log('=== VERIFICANDO PERMISSÕES ===');
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);
      
      // Verificar perfil do usuário
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nivel_acesso')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Profile Query Result:', { profile, error });

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        throw error;
      }

      // Para evitar problemas com RLS na tabela master_emails, 
      // vamos considerar master qualquer usuário que seja admin
      const isAdmin = profile?.nivel_acesso === 'admin';
      const isMaster = isAdmin; // Simplificado: se é admin, é master
      const canCreateContent = isAdmin;

      console.log('=== RESULTADO DAS PERMISSÕES ===');
      console.log('Permissões do usuário:', {
        email: user.email,
        userId: user.id,
        profile,
        isAdmin,
        isMaster,
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