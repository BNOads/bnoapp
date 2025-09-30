import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OrcamentoStatusToggleProps {
  orcamentoId: string;
  currentStatus: boolean;
  onStatusChange: (newStatus: boolean) => void;
  disabled?: boolean;
}

export const OrcamentoStatusToggle = ({ 
  orcamentoId, 
  currentStatus, 
  onStatusChange,
  disabled = false 
}: OrcamentoStatusToggleProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (newStatus: boolean) => {
    if (disabled) return;
    
    setLoading(true);
    try {
      const userRes = await supabase.auth.getUser();
      const updatedBy = userRes.data.user?.id || null;

      const { error } = await supabase
        .from('orcamentos_funil')
        .update({ active: newStatus, ativo: newStatus, updated_at: new Date().toISOString(), updated_by: updatedBy })
        .eq('id', orcamentoId);

      if (error) throw error;

      onStatusChange(newStatus);
      
      toast({
        title: "Status atualizado",
        description: `Orçamento ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do orçamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (disabled) {
    return (
      <Badge 
        variant={currentStatus ? "default" : "secondary"} 
        className={`text-xs ${!currentStatus ? 'opacity-60' : ''}`}
      >
        {currentStatus ? 'Ativo' : 'Desativado'}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={currentStatus}
        onCheckedChange={handleToggle}
        disabled={loading}
        className="data-[state=checked]:bg-primary"
      />
      <Badge 
        variant={currentStatus ? "default" : "secondary"} 
        className="text-xs"
      >
        {currentStatus ? 'Ativo' : 'Desativado'}
      </Badge>
    </div>
  );
};