import { useLocation } from "react-router-dom";
import { FloatingNoteButton } from "@/components/ui/FloatingNoteButton";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  // Don't show FAB on auth-related pages
  const hideOnRoutes = ['/auth', '/reset-password'];
  const shouldShowFAB = !hideOnRoutes.includes(location.pathname);

  return (
    <>
      {children}
      {shouldShowFAB && <FloatingNoteButton />}
    </>
  );
}