import { useState, useEffect } from "react";
import { Users, Calendar, FileText, LayoutDashboard, LogOut, User, Settings, Video, MessageCircle, Palette, Rocket, CheckSquare, Trophy, Calculator, Flag, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import bnoadsLogo from "@/assets/bnoads-logo-new.png";
import NotificationBell from "@/components/Notifications/NotificationBell";
import CreateNotificationModal from "@/components/Notifications/CreateNotificationModal";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import ThemeSwitch from "@/components/ui/theme-switch";
import { GlobalSearch } from "@/components/Dashboard/GlobalSearch";

interface HeaderProps { }

export const Header = ({ }: HeaderProps) => {
  // All hooks must be called unconditionally at the top
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { userData } = useCurrentUser();
  const { isAdmin } = useUserPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/auth';
  };
  const tabs = [
    {
      id: 'tarefas',
      label: 'Tarefas',
      icon: CheckSquare,
      path: '/tarefas'
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Calendar,
      path: '/clientes'
    },
    {
      id: 'atendimento',
      label: 'Atendimento',
      icon: Headset,
      path: '/atendimento'
    },
    {
      id: 'treinamentos',
      label: 'Treinamentos',
      icon: Video,
      path: '/treinamentos'
    },
    {
      id: 'ferramentas',
      label: 'Ferramentas',
      icon: Rocket,
      path: '/ferramentas'
    }
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;

    if (currentPath.startsWith('/tarefas')) {
      return 'tarefas';
    }
    if (currentPath.startsWith('/atendimento')) {
      return 'atendimento';
    }

    // Check for ferramentas sub-routes
    if (currentPath.startsWith('/ferramentas/projecoes')) {
      return 'projecoes';
    }
    if (currentPath.startsWith('/ferramentas')) {
      return 'ferramentas';
    }

    const tab = tabs.find(t => t.path === currentPath);
    return tab ? tab.id : 'dashboard';
  };

  const activeTab = getActiveTab();
  return <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
    <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link
            to="/"
            className="flex items-center space-x-2 sm:space-x-4 group"
          >
            <div className="p-1 sm:p-2">
              <img src={bnoadsLogo} alt="BNOads Logo" className="h-8 w-8 sm:h-12 sm:w-12 object-contain rounded-lg transition-transform group-hover:scale-105" />
            </div>
            <div className={`min-w-0 border-b-2 transition-colors duration-200 ${activeTab === 'dashboard' ? 'border-primary pb-0.5' : 'border-transparent group-hover:border-primary/30 pb-0.5'}`}>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                BNOads
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Sistema interno</p>
            </div>
          </Link>
          {/* Mobile Theme Switch */}
          <div className="sm:hidden ml-2">
            <ThemeSwitch className="scale-75 origin-left" />
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1 xl:space-x-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                asChild
                className={`flex items-center space-x-1 xl:space-x-2 px-2 xl:px-3 text-xs xl:text-sm transition-all duration-200 ${activeTab === tab.id
                  ? "bg-primary/10 text-primary font-semibold shadow-sm hover:bg-primary/15"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
              >
                <Link to={tab.path}>
                  <Icon className="h-3 w-3 xl:h-4 xl:w-4 flex-shrink-0" />
                  <span className="hidden xl:inline truncate">{tab.label}</span>
                </Link>
              </Button>;
            })}
          </nav>

          {/* Theme Switch */}
          <div className="hidden sm:block">
            <ThemeSwitch />
          </div>

          {location.pathname !== '/' && (
            <GlobalSearch isHeader={true} />
          )}

          {/* Admin Create Notification - Always render but conditionally display */}
          <CreateNotificationModal showButton={isAdmin} />

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2">
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8">
                  {userData?.avatar_url && <AvatarImage src={userData.avatar_url} alt={userData.nome || "Avatar"} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                    {userData?.nome ? userData.nome.split(' ').map(n => n[0]).join('').substring(0, 2) : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start px-1 text-left">
                  <span className="text-sm font-medium truncate max-w-28 xl:max-w-40 leading-none mb-1 text-foreground">
                    {userData?.nome?.split(' ')[0] || user?.email?.split('@')[0]}
                  </span>
                  {userData?.cargo_display && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-semibold truncate max-w-28 xl:max-w-40 border border-primary/20">
                      {userData.cargo_display}
                    </span>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 sm:w-48">
              <DropdownMenuItem
                onClick={() => {
                  const currentPath = location.pathname + location.search;
                  navigate('/perfil', { state: { from: currentPath } });
                }}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="flex items-center space-x-2 cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </header>;
};