import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ExclusaoMassaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  lancamentos: any[];
  onExclusaoCompleta: () => void;
}

export const ExclusaoMassaModal: React.FC<ExclusaoMassaModalProps> = ({
  open,
  onOpenChange,
  selectedIds,
  lancamentos,
  onExclusaoCompleta,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const lancamentosSelecionados = lancamentos.filter(l => selectedIds.includes(l.id));

  const handleExcluir = async () => {
    setLoading(true);
    try {
      // Soft delete: marcar como inativo
      const { error } = await supabase
        .from('lancamentos')
        .update({ ativo: false })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Lançamentos excluídos",
        description: `${selectedIds.length} lançamentos foram excluídos com sucesso.`,
      });

      onExclusaoCompleta();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao excluir lançamentos:', error);
      toast({
        title: "Erro ao excluir lançamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmar Exclusão em Massa
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Os lançamentos serão marcados como inativos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Você está prestes a excluir <strong>{selectedIds.length}</strong> lançamento(s).
            </AlertDescription>
          </Alert>

          {lancamentosSelecionados.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              <p className="text-sm font-medium">Lançamentos selecionados:</p>
              <ul className="text-sm space-y-1">
                {lancamentosSelecionados.map((lanc) => (
                  <li key={lanc.id} className="flex items-start gap-2">
                    <Trash2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="break-words">
                      {lanc.nome_lancamento}
                      {lanc.clientes?.nome && (
                        <span className="text-muted-foreground"> - {lanc.clientes.nome}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleExcluir}
            disabled={loading}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExclusaoMassaModal;
