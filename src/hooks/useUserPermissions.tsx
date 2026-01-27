import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserPermissions {
  isAdmin: boolean;
  isMaster: boolean;
  isCS: boolean;
  isGestorProjetos: boolean;
  canCreateContent: boolean;
  canManageBudgets: boolean;
  canManageReferences: boolean;
  loading: boolean;
}

const defaultPermissions: UserPermissions = {
  isAdmin: false,
  isMaster: false,
  isCS: false,
  isGestorProjetos: false,
  canCreateContent: false,
  canManageBudgets: false,
  canManageReferences: false,
  loading: true,
};

// Cache global para evitar múltiplas chamadas
let cachedPermissions: UserPermissions | null = null;
let cacheUserId: string | null = null;

export const useUserPermissions = (): UserPermissions => {
  const [permissions, setPermissions] = useState<UserPermissions>(
    cachedPermissions ? { ...cachedPermissions, loading: false } : defaultPermissions
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Se já temos cache, não recarregar
    if (cachedPermissions) {
      return;
    }

    const checkUserPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          const noUserPermissions = { ...defaultPermissions, loading: false };
          cachedPermissions = noUserPermissions;
          if (mountedRef.current) {
            setPermissions(noUserPermissions);
          }
          return;
        }

        // Se cache existe e é do mesmo usuário, usar
        if (cachedPermissions && cacheUserId === user.id) {
          if (mountedRef.current) {
            setPermissions({ ...cachedPermissions, loading: false });
          }
          return;
        }

        cacheUserId = user.id;

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
        const isAdmin = ['admin', 'dono'].includes(profile?.nivel_acesso);
        const isMaster = isAdmin;
        const isCS = ['cs', 'admin', 'dono'].includes(profile?.nivel_acesso);
        const isGestorProjetos = profile?.nivel_acesso === 'gestor_projetos';
        
        const canCreateContent = ['admin', 'dono', 'gestor_trafego', 'gestor_projetos', 'cs', 'webdesigner', 'editor_video'].includes(profile?.nivel_acesso);
        const canManageBudgets = ['admin', 'dono', 'gestor_trafego', 'gestor_projetos'].includes(profile?.nivel_acesso);
        const canManageReferences = ['admin', 'dono', 'gestor_trafego', 'gestor_projetos'].includes(profile?.nivel_acesso);

        const newPermissions: UserPermissions = {
          isAdmin,
          isMaster,
          isCS,
          isGestorProjetos,
          canCreateContent,
          canManageBudgets,
          canManageReferences,
          loading: false,
        };

        cachedPermissions = newPermissions;
        
        if (mountedRef.current) {
          setPermissions(newPermissions);
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        const errorPermissions = { ...defaultPermissions, loading: false };
        cachedPermissions = errorPermissions;
        if (mountedRef.current) {
          setPermissions(errorPermissions);
        }
      }
    };

    checkUserPermissions();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return permissions;
};
