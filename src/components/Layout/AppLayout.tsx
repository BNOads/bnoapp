import { useLocation } from "react-router-dom";
import { FloatingNoteButton } from "@/components/ui/FloatingNoteButton";
import { Header } from "@/components/Layout/Header";
import { useRecentTabs } from "@/hooks/useRecentTabs";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
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
    '/funil/publico'
  ];
  
  const shouldShowHeader = !hideHeaderRoutes.some(route => 
    location.pathname.startsWith(route)
  );
  
  const shouldShowFAB = shouldShowHeader;

  return (
    <div className="min-h-screen bg-background">
      {shouldShowHeader && <Header />}
      <main className={shouldShowHeader ? "container mx-auto px-6 py-8" : ""}>
        {children}
      </main>
      {shouldShowFAB && <FloatingNoteButton />}
    </div>
  );
}