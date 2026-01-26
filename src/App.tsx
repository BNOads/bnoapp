import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/Auth/AuthContext";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ColaboradoresPage from "./pages/Colaboradores";
import ClientesPage from "./pages/Clientes";
import LancamentosPage from "./pages/Lancamentos";
import LancamentoDetalhes from "./pages/LancamentoDetalhes";
import AssistentePage from "./pages/Assistente";
import TreinamentosPage from "./pages/Treinamentos";
import FerramentasPage from "./pages/Ferramentas";
import PDIDetalhes from "./pages/PDIDetalhes";
import PainelCliente from "./pages/PainelCliente";
import PainelClienteNPS from "./pages/PainelClienteNPS";
import CriativosCliente from "./pages/CriativosCliente";
import CursoDetalhes from "./pages/CursoDetalhes";
import AulaDetalhes from "./pages/AulaDetalhes";
import Perfil from "./pages/Perfil";
import POPPublico from "./pages/POPPublico";
import { ReferenciaViewer } from "./pages/ReferenciaViewer";
import { ReferenciaPublica } from "./pages/ReferenciaPublica";
import Referencias from "./pages/Referencias";
import ReferenciaEdit from "./pages/ReferenciaEdit";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import DebriefingsView from "@/components/Debriefings/DebriefingsView";
import NovoDebriefing from "@/components/Debriefings/NovoDebriefing";
import DebriefingDetalhes from "@/components/Debriefings/DebriefingDetalhes";
import DebriefingPublico from "./pages/DebriefingPublico";
import LancamentoPublico from "./pages/LancamentoPublico";
import Gamificacao from "./pages/Gamificacao";
import NPS from "./pages/NPS";
import ArquivoReuniao from "./pages/ArquivoReuniao";
import CriadorCriativos from "./pages/CriadorCriativos";
import CRMPage from "./pages/CRM";
import { AppLayout } from "@/components/Layout/AppLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        storageKey="bnoads_theme"
        enableSystem={false}
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppLayout>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/pop/publico/:id" element={<POPPublico />} />
                  <Route path="/lancamento/:linkPublico" element={<LancamentoPublico />} />
                  <Route path="/r/:slug" element={<ReferenciaPublica />} />
                  <Route path="/referencia/publica/:slug" element={<ReferenciaPublica />} />
                  <Route path="/referencias" element={
                    <ProtectedRoute>
                      <Referencias />
                    </ProtectedRoute>
                  } />
                  <Route path="/referencias/:id" element={
                    <ProtectedRoute>
                      <ReferenciaEdit />
                    </ProtectedRoute>
                  } />
                  {/* Legacy routes - manter compatibilidade */}
                  <Route path="/referencia/:id" element={<ReferenciaViewer />} />
                  <Route path="/debriefing/publico/:id" element={<DebriefingPublico />} />
                  <Route path="/pdi/:id" element={
                    <ProtectedRoute>
                      <PDIDetalhes />
                    </ProtectedRoute>
                  } />
                  <Route path="/painel/:clienteId" element={<PainelCliente />} />
                  <Route path="/painel/:clienteSlug/nps" element={<PainelClienteNPS />} />
                  <Route path="/criativos/:clienteId" element={
                    <ProtectedRoute>
                      <CriativosCliente />
                    </ProtectedRoute>
                  } />
                  <Route path="/curso/:cursoId" element={
                    <ProtectedRoute>
                      <CursoDetalhes />
                    </ProtectedRoute>
                  } />
                  <Route path="/curso/:cursoId/aula/:aulaId" element={
                    <ProtectedRoute>
                      <AulaDetalhes />
                    </ProtectedRoute>
                  } />
                  <Route path="/perfil" element={
                    <ProtectedRoute>
                      <Perfil />
                    </ProtectedRoute>
                  } />
                  <Route path="/debriefings" element={
                    <ProtectedRoute>
                      <DebriefingsView />
                    </ProtectedRoute>
                  } />
                  <Route path="/debriefings/novo" element={
                    <ProtectedRoute>
                      <NovoDebriefing />
                    </ProtectedRoute>
                  } />
                  <Route path="/debriefings/:id" element={
                    <ProtectedRoute>
                      <DebriefingDetalhes />
                    </ProtectedRoute>
                  } />
                  <Route path="/colaboradores" element={
                    <ProtectedRoute>
                      <ColaboradoresPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/clientes" element={
                    <ProtectedRoute>
                      <ClientesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/lancamentos" element={
                    <ProtectedRoute>
                      <LancamentosPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/lancamentos/:id" element={<LancamentoDetalhes />} />
                  <Route path="/assistente" element={
                    <ProtectedRoute>
                      <AssistentePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/treinamentos" element={
                    <ProtectedRoute>
                      <TreinamentosPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/ferramentas" element={
                    <ProtectedRoute>
                      <FerramentasPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/ferramentas/:toolName" element={
                    <ProtectedRoute>
                      <FerramentasPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/gamificacao" element={
                    <ProtectedRoute>
                      <Gamificacao />
                    </ProtectedRoute>
                  } />
                  <Route path="/nps" element={
                    <ProtectedRoute>
                      <NPS />
                    </ProtectedRoute>
                  } />
                  <Route path="/arquivo-reuniao" element={
                    <ProtectedRoute>
                      <ArquivoReuniao />
                    </ProtectedRoute>
                  } />
                  <Route path="/criador-criativos" element={
                    <ProtectedRoute>
                      <CriadorCriativos />
                    </ProtectedRoute>
                  } />
                  <Route path="/crm" element={<CRMPage />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
