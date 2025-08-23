import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Shield } from "lucide-react";

interface ViewOnlyBadgeProps {
  className?: string;
}

export const ViewOnlyBadge = ({ className = "" }: ViewOnlyBadgeProps) => {
  return (
    <Card className={`p-3 bg-muted/50 border-muted ${className}`}>
      <div className="flex items-center space-x-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Modo Visualização
        </span>
        <Badge variant="secondary" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Somente Leitura
        </Badge>
      </div>
    </Card>
  );
};