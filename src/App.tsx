import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/Auth/AuthContext";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PDIDetalhes from "./pages/PDIDetalhes";
import PainelCliente from "./pages/PainelCliente";
import CriativosCliente from "./pages/CriativosCliente";
import CursoDetalhes from "./pages/CursoDetalhes";
import AulaDetalhes from "./pages/AulaDetalhes";
import Perfil from "./pages/Perfil";
import POPPublico from "./pages/POPPublico";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/pop/publico/:id" element={<POPPublico />} />
              <Route path="/pdi/:id" element={
                <ProtectedRoute>
                  <PDIDetalhes />
                </ProtectedRoute>
              } />
              <Route path="/painel/:clienteId" element={
                <ProtectedRoute>
                  <PainelCliente />
                </ProtectedRoute>
              } />
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
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
