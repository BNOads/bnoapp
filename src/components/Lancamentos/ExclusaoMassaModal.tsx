import React, { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
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
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [confirmationText, setConfirmationText] = useState('');
  const { toast } = useToast();

  const lancamentosSelecionados = lancamentos.filter(l => selectedIds.includes(l.id));

  useEffect(() => {
    if (open) {
      setConfirmStep(1);
      setConfirmationText('');
    }
  }, [open]);

  const handleExcluir = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Lançamentos excluídos",
        description: `${selectedIds.length} lançamentos foram apagados definitivamente.`,
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
            Esta ação não pode ser desfeita. Os lançamentos serão removidos definitivamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {confirmStep === 1 && (
            <>
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
            </>
          )}

          {confirmStep === 2 && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertDescription>
                  Segunda confirmação: digite <strong>EXCLUIR</strong> para apagar definitivamente.
                </AlertDescription>
              </Alert>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder='Digite EXCLUIR'
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {confirmStep === 1 ? (
            <>
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
                onClick={() => setConfirmStep(2)}
                disabled={loading || selectedIds.length === 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Continuar Exclusão
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmStep(1)}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleExcluir}
                disabled={loading || confirmationText !== 'EXCLUIR'}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {loading ? 'Excluindo...' : 'Apagar Definitivamente'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExclusaoMassaModal;
