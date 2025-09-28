import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface FunnelStatusToggleProps {
  clienteId: string;
  initialStatus: boolean;
  isPublicView?: boolean;
  onStatusChange?: (newStatus: boolean) => void;
}

export const FunnelStatusToggle = ({ 
  clienteId, 
  initialStatus, 
  isPublicView = false,
  onStatusChange 
}: FunnelStatusToggleProps) => {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { canCreateContent, isAdmin } = useUserPermissions();
  
  // Only internal team can toggle (admin, gestor_trafego, cs)
  const canToggle = !isPublicView && (isAdmin || canCreateContent);

  const handleToggle = async (newStatus: boolean) => {
    if (!canToggle || isLoading) return;

    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('update-funnel-status', {
        body: { active: newStatus },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao atualizar status');
      }

      setStatus(newStatus);
      onStatusChange?.(newStatus);
      
      toast({
        title: "✔ Atualizado",
        description: `Funil ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });

    } catch (error: any) {
      console.error('Erro ao atualizar status do funil:', error);
      
      toast({
        title: "❗ Erro",
        description: "Não foi possível atualizar o status do funil.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusIcon = status ? (
    <CheckCircle className="h-3 w-3 text-green-600" />
  ) : (
    <XCircle className="h-3 w-3 text-destructive" />
  );

  const statusText = status ? "Funil Ativo" : "Funil Inativo";
  const tooltipText = status 
    ? "O funil está ativo no momento." 
    : "O funil está inativo no momento.";

  const badgeVariant = status ? "default" : "secondary";
  const badgeClassName = status 
    ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" 
    : "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2 py-1">
            <Badge 
              variant={badgeVariant} 
              className={`${badgeClassName} flex items-center gap-1.5 text-xs font-medium`}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                statusIcon
              )}
              <span>{statusText}</span>
            </Badge>
            
            {canToggle && (
            <Switch
                checked={status}
                onCheckedChange={handleToggle}
                disabled={isLoading}
                className="ml-1 scale-90"
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
          {isLoading && <p className="text-xs text-muted-foreground mt-1">Salvando...</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};