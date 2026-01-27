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

export const useUserPermissions = (): UserPermissions => {
  const [permissions, setPermissions] = useState<UserPermissions>({
    isAdmin: false,
    isMaster: false,
    isCS: false,
    isGestorProjetos: false,
    canCreateContent: false,
    canManageBudgets: false,
    canManageReferences: false,
    loading: true,
  });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;

    const checkUserPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setPermissions({
            isAdmin: false,
            isMaster: false,
            isCS: false,
            isGestorProjetos: false,
            canCreateContent: false,
            canManageBudgets: false,
            canManageReferences: false,
            loading: false,
          });
          return;
        }

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
        const isMaster = isAdmin; // Simplificado: se é admin ou dono, é master
        const isCS = ['cs', 'admin', 'dono'].includes(profile?.nivel_acesso);
        const isGestorProjetos = profile?.nivel_acesso === 'gestor_projetos';
        
        // Níveis que podem criar conteúdo: admin, dono, gestor_trafego, gestor_projetos, cs, webdesigner, editor_video
        const canCreateContent = ['admin', 'dono', 'gestor_trafego', 'gestor_projetos', 'cs', 'webdesigner', 'editor_video'].includes(profile?.nivel_acesso);
        
        // Níveis que podem gerenciar orçamentos e referências: admin, dono, gestor_trafego, gestor_projetos
        const canManageBudgets = ['admin', 'dono', 'gestor_trafego', 'gestor_projetos'].includes(profile?.nivel_acesso);
        const canManageReferences = ['admin', 'dono', 'gestor_trafego', 'gestor_projetos'].includes(profile?.nivel_acesso);

        console.log('Permissões verificadas:', {
          email: user.email,
          nivel_acesso: profile?.nivel_acesso,
          isAdmin,
          canCreateContent
        });

        loadedRef.current = true;
        setPermissions({
          isAdmin,
          isMaster,
          isCS,
          isGestorProjetos,
          canCreateContent,
          canManageBudgets,
          canManageReferences,
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        loadedRef.current = true;
        setPermissions({
          isAdmin: false,
          isMaster: false,
          isCS: false,
          isGestorProjetos: false,
          canCreateContent: false,
          canManageBudgets: false,
          canManageReferences: false,
          loading: false,
        });
      }
    };

    checkUserPermissions();
  }, []);

  return permissions;
};