import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface FunnelStatusToggleProps {
  clienteId: string;
  currentStatus: boolean;
  isPublicView?: boolean;
  onStatusChange?: (newStatus: boolean) => void;
}

export const FunnelStatusToggle = ({ 
  clienteId, 
  currentStatus, 
  isPublicView = false,
  onStatusChange 
}: FunnelStatusToggleProps) => {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin, canCreateContent } = useUserPermissions();

  // Apenas equipe interna pode alterar o status
  const canEdit = !isPublicView && (isAdmin || canCreateContent);

  const handleToggle = async (newStatus: boolean) => {
    if (!canEdit || loading) return;

    setLoading(true);

    try {
      // Atualizar o status no banco via edge function
      const { data, error } = await supabase.functions.invoke('update-funnel-status', {
        body: {
          cliente_id: clienteId,
          funnel_status: newStatus
        }
      });

      if (error) throw error;

      setStatus(newStatus);
      onStatusChange?.(newStatus);

      toast({
        title: "✅ Atualizado",
        description: `Funil marcado como ${newStatus ? 'Ativo' : 'Inativo'}`,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar status do funil:', error);
      toast({
        title: "❗ Erro",
        description: "Não foi possível atualizar o status do funil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusText = () => {
    return status ? 'Funil Ativo' : 'Funil Inativo';
  };

  const getTooltipText = () => {
    if (!canEdit) return 'Apenas a equipe interna pode alterar o status';
    return status ? 'O funil está ativo no momento.' : 'O funil está inativo no momento.';
  };

  const getStatusColor = () => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {canEdit && (
              <Switch
                checked={status}
                onCheckedChange={handleToggle}
                disabled={loading}
                className="ml-2"
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};