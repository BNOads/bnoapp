import { Helmet } from 'react-helmet';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { CRMAccessModal } from '@/components/CRM/CRMAccessModal';
import { KanbanBoard } from '@/components/CRM/KanbanBoard';
import { Loader2 } from 'lucide-react';

const CRM = () => {
  const { isAuthenticated, isLoading, attempts, authenticate } = useCRMAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>CRM - BNOads</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <ProtectedRoute>
        {!isAuthenticated ? (
          <CRMAccessModal
            isOpen={true}
            attempts={attempts}
            onAuthenticate={authenticate}
          />
        ) : (
          <div className="container mx-auto px-6 py-8">
            <KanbanBoard />
          </div>
        )}
      </ProtectedRoute>
    </>
  );
};

export default CRM;