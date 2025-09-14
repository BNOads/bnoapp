import { useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { FloatingNoteButton } from "@/components/ui/FloatingNoteButton";
import { Header } from "@/components/Layout/Header";
import { PublicLogo } from "@/components/Layout/PublicLogo";
import { useRecentTabs } from "@/hooks/useRecentTabs";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { userData: user } = useCurrentUser();
  
  // Track page visits automatically
  useRecentTabs();
  
  // Don't show header and FAB on auth-related pages and public pages
  const hideHeaderRoutes = [
    '/auth', 
    '/reset-password',
    '/pop/publico',
    '/referencia/publica',
    '/debriefing/publico',
    '/mapa-mental/publico',
    '/funil/publico',
    '/painel'
  ];
  
  // Para rotas públicas e específicas de visualização, verificar se o usuário está logado
  const isPublicViewRoute = location.pathname.startsWith('/referencia/') && 
                           !location.pathname.startsWith('/referencia/publica');
  
  const shouldShowHeader = !hideHeaderRoutes.some(route => 
    location.pathname.startsWith(route)
  ) && !(isPublicViewRoute && !user);
  
  const shouldShowFAB = shouldShowHeader;

  return (
    <div className="min-h-screen bg-background">
      {shouldShowHeader ? (
        <Header />
      ) : user ? (
        // Usuário logado mas em página pública - mostrar header mesmo assim
        <Header />
      ) : (
        // Usuário não logado - mostrar apenas logo e botão de login
        <PublicLogo />
      )}
      <main className={shouldShowHeader || user ? "container mx-auto px-6 py-8" : ""}>
        {children}
      </main>
      {shouldShowFAB && <FloatingNoteButton />}
    </div>
  );
}