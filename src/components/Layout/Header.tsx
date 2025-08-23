import { Users, Calendar, FileText, LayoutDashboard, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/Auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { userData } = useCurrentUser();
  const navigate = useNavigate();
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'colaboradores', label: 'Colaboradores', icon: Users },
    { id: 'clientes', label: 'Painéis Clientes', icon: Calendar },
    { id: 'treinamentos', label: 'Treinamentos', icon: FileText },
  ];

  return (
    <header className="bg-gradient-subtle border-b border-border shadow-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2">
              <img src="/lovable-uploads/04b4bc6e-c3c0-4f8e-9819-9f578ec4da19.png" alt="BNOads Logo" className="h-12 w-12 object-contain rounded-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                BNOads
              </h1>
              <p className="text-sm text-muted-foreground">
                Sistema de Gestão Interno
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <nav className="flex space-x-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "hero" : "ghost"}
                    size="default"
                    onClick={() => onTabChange(tab.id)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </Button>
                );
              })}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    {userData?.avatar_url && (
                      <AvatarImage 
                        src={userData.avatar_url} 
                        alt={userData.nome || "Avatar"} 
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {userData?.nome ? 
                        userData.nome.split(' ').map(n => n[0]).join('').substring(0, 2) : 
                        user?.email?.charAt(0).toUpperCase() || 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">
                    {userData?.nome?.split(' ')[0] || user?.email?.split('@')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => navigate('/perfil')}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={signOut}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};