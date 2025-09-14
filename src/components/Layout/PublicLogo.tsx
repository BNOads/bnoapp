import bnoadsLogo from "@/assets/bnoads-logo.png";

interface PublicLogoProps {
  className?: string;
}

export const PublicLogo = ({ className = "" }: PublicLogoProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div className="flex items-center space-x-3">
        <img 
          src={bnoadsLogo} 
          alt="BNOads" 
          className="h-12 w-12 object-contain rounded-lg"
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
    </div>
  );
};