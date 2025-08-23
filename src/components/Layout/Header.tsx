import { Users, Calendar, FileText, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import bnoadsLogo from "@/assets/bnoads-logo.png";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
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
            <div className="bg-gradient-primary p-3 rounded-xl shadow-glow">
              <img src={bnoadsLogo} alt="BNOads Logo" className="h-8 w-8 object-contain" />
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
        </div>
      </div>
    </header>
  );
};