import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import bnoadsLogo from "@/assets/bnoads-logo-new.png";

interface PublicLogoProps {
  className?: string;
  showLoginButton?: boolean;
}

export const PublicLogo = ({ className = "", showLoginButton = true }: PublicLogoProps) => {
  const navigate = useNavigate();

  return (
    <div className={`bg-background border-b border-border shadow-sm ${className}`}>
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src={bnoadsLogo} 
              alt="BNOads" 
              className="h-12 w-12 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                BNOads
              </h1>
              <p className="text-sm text-muted-foreground">
                Agência de Tráfego Pago
              </p>
            </div>
          </div>
          
          {showLoginButton && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')} 
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Fazer Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};