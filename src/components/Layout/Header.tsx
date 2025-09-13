import { Users, Calendar, FileText, LayoutDashboard, LogOut, User, Settings, CalendarDays, UserCheck, Palette, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/Auth/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
export const Header = ({
  activeTab,
  onTabChange
}: HeaderProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    userData
  } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  }, {
    id: 'colaboradores',
    label: 'Colaboradores',
    icon: Users
  }, {
    id: 'clientes',
    label: 'Clientes',
    icon: Calendar
  }, {
    id: 'assistente',
    label: 'Assistente',
    icon: UserCheck
  }, {
    id: 'treinamentos',
    label: 'Treinamentos',
    icon: CalendarDays
  }, {
    id: 'ferramentas',
    label: 'Ferramentas',
    icon: Rocket
  }];
  return <header className="bg-gradient-subtle border-b border-border shadow-card">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="p-1 sm:p-2">
              <img src="/lovable-uploads/04b4bc6e-c3c0-4f8e-9819-9f578ec4da19.png" alt="BNOads Logo" className="h-8 w-8 sm:h-12 sm:w-12 object-contain rounded-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                BNOads
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Sistema interno</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-1 xl:space-x-2">
              {tabs.map(tab => {
              const Icon = tab.icon;
              return <Button 
                key={tab.id} 
                variant={activeTab === tab.id ? "hero" : "ghost"} 
                size="sm"
                onClick={() => onTabChange(tab.id)} 
                className="flex items-center space-x-1 xl:space-x-2 px-2 xl:px-3 text-xs xl:text-sm"
              >
                    <Icon className="h-3 w-3 xl:h-4 xl:w-4 flex-shrink-0" />
                    <span className="hidden xl:inline truncate">{tab.label}</span>
                  </Button>;
            })}
            </nav>

            {/* Mobile Navigation */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1 px-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 sm:w-48">
                  {tabs.map(tab => {
                  const Icon = tab.icon;
                  return <DropdownMenuItem 
                    key={tab.id} 
                    onClick={() => onTabChange(tab.id)} 
                    className={`flex items-center space-x-2 text-sm ${activeTab === tab.id ? "bg-accent" : ""}`}
                  >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </DropdownMenuItem>;
                })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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
                  <span className="hidden md:inline text-xs sm:text-sm truncate max-w-20 lg:max-w-32">
                    {userData?.nome?.split(' ')[0] || user?.email?.split('@')[0]}
                  </span>
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