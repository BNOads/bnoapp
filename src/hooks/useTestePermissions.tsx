import { useUserPermissions } from './useUserPermissions';
import { useCurrentUser } from './useCurrentUser';

interface TestePermissions {
  canCreate: boolean;
  canEditAll: boolean;
  canEditOwn: boolean;
  canComment: boolean;
  canArchive: boolean;
  canManageTemplates: boolean;
  canViewReports: boolean;
  isViewOnly: boolean;
  currentUserId: string | undefined;
  currentColaboradorId: string | undefined;
  loading: boolean;
}

export const useTestePermissions = (): TestePermissions => {
  const { isAdmin, canManageBudgets, isCS, loading: permLoading } = useUserPermissions();
  const { userData, loading: userLoading } = useCurrentUser();

  return {
    canCreate: canManageBudgets,
    canEditAll: isAdmin,
    canEditOwn: canManageBudgets && !isAdmin,
    canComment: true,
    canArchive: isAdmin,
    canManageTemplates: isAdmin,
    canViewReports: isAdmin,
    isViewOnly: isCS && !isAdmin && !canManageBudgets,
    currentUserId: userData?.user_id,
    currentColaboradorId: userData?.id,
    loading: permLoading || userLoading,
  };
};
