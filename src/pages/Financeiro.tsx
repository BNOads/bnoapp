import { Helmet } from 'react-helmet';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { useFinanceiroAccess } from '@/hooks/useFinanceiroAccess';
import { FinanceiroAccessModal } from '@/components/Financeiro/FinanceiroAccessModal';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardAnual } from '@/components/Financeiro/DashboardAnual';
import { ClientesAtivos } from '@/components/Financeiro/ClientesAtivos';
import { ResumoMes } from '@/components/Financeiro/ResumoMes';
import { ConfiguracaoSheets } from '@/components/Financeiro/ConfiguracaoSheets';

const Financeiro = () => {
  const { isAuthenticated, isLoading, attempts, authenticate } = useFinanceiroAccess();

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
        <title>Financeiro - BNOads</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <ProtectedRoute>
        {!isAuthenticated ? (
          <FinanceiroAccessModal
            isOpen={true}
            attempts={attempts}
            onAuthenticate={authenticate}
          />
        ) : (
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Financeiro BNOads</h1>
              <p className="text-muted-foreground mt-2">Gestão financeira completa e análises detalhadas</p>
            </div>

            <Tabs defaultValue="dashboard" className="space-y-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="clientes">Clientes Ativos</TabsTrigger>
                <TabsTrigger value="mes">Resumo do Mês</TabsTrigger>
                <TabsTrigger value="config">Configuração</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                <DashboardAnual />
              </TabsContent>

              <TabsContent value="clientes" className="space-y-6">
                <ClientesAtivos />
              </TabsContent>

              <TabsContent value="mes" className="space-y-6">
                <ResumoMes />
              </TabsContent>

              <TabsContent value="config" className="space-y-6">
                <ConfiguracaoSheets />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </ProtectedRoute>
    </>
  );
};

export default Financeiro;
