import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ColumnModalProps {
  isOpen: boolean;
  column: any;
  onClose: () => void;
  onSave: () => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#10b981', // Green
  '#ef4444', // Red
  '#6b7280', // Gray
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export const ColumnModal = ({ isOpen, column, onClose, onSave }: ColumnModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
    column_sla_days: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (column?.id) {
      setFormData({
        name: column.name,
        color: column.color,
        column_sla_days: column.column_sla_days || ''
      });
    } else {
      setFormData({
        name: '',
        color: '#6366f1',
        column_sla_days: ''
      });
    }
  }, [column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSave = {
        name: formData.name,
        color: formData.color,
        column_sla_days: formData.column_sla_days ? parseInt(formData.column_sla_days) : null
      };

      if (column?.id) {
        const { error } = await supabase
          .from('crm_columns')
          .update(dataToSave)
          .eq('id', column.id);

        if (error) throw error;

        toast({
          title: 'Coluna atualizada',
          description: 'As alterações foram salvas com sucesso'
        });
      } else {
        // Buscar a maior ordem atual
        const { data: columns, error: countError } = await supabase
          .from('crm_columns')
          .select('order')
          .order('order', { ascending: false })
          .limit(1);

        if (countError) throw countError;

        const maxOrder = columns && columns.length > 0 ? columns[0].order : -1;

        const { error } = await supabase
          .from('crm_columns')
          .insert([{
            ...dataToSave,
            order: maxOrder + 1
          }]);

        if (error) throw error;

        toast({
          title: 'Coluna criada',
          description: 'Nova coluna adicionada com sucesso'
        });
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar coluna:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a coluna',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!column?.id) return;

    setIsLoading(true);

    try {
      // Verificar se há cards nesta coluna
      const { data: cards, error: cardsError } = await supabase
        .from('crm_cards')
        .select('id')
        .eq('column_id', column.id);

      if (cardsError) throw cardsError;

      if (cards && cards.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Mova ou exclua os cards desta coluna antes de excluí-la',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('crm_columns')
        .delete()
        .eq('id', column.id);

      if (error) throw error;

      toast({
        title: 'Coluna excluída',
        description: 'Coluna removida com sucesso'
      });

      onSave();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a coluna',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {column?.id ? 'Editar Coluna' : 'Nova Coluna'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Coluna *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ex: Qualificação"
              />
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="sla">SLA (dias)</Label>
              <Input
                id="sla"
                type="number"
                value={formData.column_sla_days}
                onChange={(e) => setFormData({ ...formData, column_sla_days: e.target.value })}
                placeholder="Ex: 2 (prazo em dias para ação)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Prazo sugerido para ação quando um card chegar nesta coluna
              </p>
            </div>

            <DialogFooter className="flex justify-between">
              <div>
                {column?.id && !column.is_default && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coluna?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Certifique-se de que não há cards nesta coluna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};