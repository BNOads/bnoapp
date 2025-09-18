import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PanelManagerProps {
  debriefingId: string;
  panelId: string;
  panelTitle: string;
  isExcluded: boolean;
  onUpdate: () => void;
  onEdit?: () => void;
  isLoggedIn?: boolean;
}

export default function PanelManager({ 
  debriefingId, 
  panelId, 
  panelTitle, 
  isExcluded, 
  onUpdate, 
  onEdit,
  isLoggedIn = true 
}: PanelManagerProps) {
  const [processing, setProcessing] = useState(false);

  const handleTogglePanel = async () => {
    if (processing) return;
    
    setProcessing(true);
    try {
      // Buscar painéis excluídos atuais
      const { data: debriefingData, error: fetchError } = await supabase
        .from('debriefings')
        .select('paineis_excluidos')
        .eq('id', debriefingId)
        .single();

      if (fetchError) throw fetchError;

      const currentExcluded = Array.isArray(debriefingData?.paineis_excluidos) 
        ? debriefingData.paineis_excluidos as string[]
        : [];
      let newExcluded: string[];

      if (isExcluded) {
        // Remove do array de excluídos
        newExcluded = currentExcluded.filter((id: string) => id !== panelId);
        toast.success(`Painel "${panelTitle}" foi reativado`);
      } else {
        // Adiciona ao array de excluídos
        newExcluded = [...currentExcluded, panelId];
        toast.success(`Painel "${panelTitle}" foi ocultado`);
      }

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('debriefings')
        .update({ paineis_excluidos: newExcluded })
        .eq('id', debriefingId);

      if (updateError) throw updateError;

      onUpdate();
    } catch (error: any) {
      console.error('Erro ao atualizar painel:', error);
      toast.error(`Erro ao atualizar painel: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Não mostrar controles se não estiver logado
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {onEdit && (
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          disabled={processing}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-3 w-3" />
        </Button>
      )}
      
      <Button
        size="sm"
        variant="outline"
        onClick={handleTogglePanel}
        disabled={processing}
        className={`h-8 w-8 p-0 ${
          isExcluded 
            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
            : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
        }`}
      >
        {isExcluded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>
    </div>
  );
}