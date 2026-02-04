import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

const FIELD_NAMES = {
  'situacao_cliente': 'Situação do Cliente',
  'etapa_onboarding': 'Etapa Onboarding',
  'etapa_trafego': 'Etapas de Tráfego'
};

type FieldKey = keyof typeof FIELD_NAMES;

export const FieldOptionsManager = ({ open, onOpenChange, onUpdated }: { open: boolean; onOpenChange: (o: boolean) => void; onUpdated?: () => void }) => {
  const [selectedField, setSelectedField] = useState<FieldKey>('situacao_cliente');
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [color, setColor] = useState('#6B7280');

  const loadOptions = async (field: FieldKey) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_field_options')
        .select('*')
        .eq('field_key', field)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setOptions(data || []);
    } catch (err: any) {
      console.error('Erro carregando opções:', err);
      toast.error('Erro ao carregar opções');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadOptions(selectedField);
  }, [open, selectedField]);

  const resetForm = () => {
    setEditing(null);
    setLabel('');
    setKey('');
    setColor('#6B7280');
  };

  const handleSave = async () => {
    if (!label || !key) {
      toast.error('Preencha label e key');
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase
          .from('client_field_options')
          .update({ option_label: label, color })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Opção atualizada');
      } else {
        const { error } = await supabase
          .from('client_field_options')
          .insert({
            field_key: selectedField,
            option_key: key,
            option_label: label,
            color
          })
          .select();
        if (error) throw error;
        toast.success('Opção criada');
      }
      resetForm();
      loadOptions(selectedField);
      onUpdated?.();
    } catch (err: any) {
      console.error('Erro salvando opção:', err);
      toast.error('Erro ao salvar opção');
    }
  };

  const handleEdit = (opt: any) => {
    setEditing(opt);
    setLabel(opt.option_label);
    setKey(opt.option_key);
    setColor(opt.color || '#6B7280');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir opção?')) return;
    try {
      const { error } = await supabase.from('client_field_options').delete().eq('id', id);
      if (error) throw error;
      toast.success('Opção removida');
      loadOptions(selectedField);
      onUpdated?.();
    } catch (err: any) {
      console.error('Erro removendo opção:', err);
      toast.error('Erro ao remover');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Opções de Campos</DialogTitle>
          <DialogDescription>Editar labels e cores de todas as opções de dropdown</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Field Selector */}
          <div className="space-y-2">
            <Label>Campo</Label>
            <Select value={selectedField} onValueChange={(v) => setSelectedField(v as FieldKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_NAMES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Form para criar/editar */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">
              {editing ? 'Editar Opção' : 'Criar Opção'}
            </h4>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-1">
                <Label className="text-xs">Key</Label>
                <Input value={key} onChange={(e) => setKey(e.target.value)} disabled={!!editing} placeholder="nao_iniciado" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Não Iniciado" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Cor</Label>
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}>Limpar</Button>
              <Button size="sm" onClick={handleSave}>{editing ? 'Atualizar' : 'Criar'}</Button>
            </div>
          </div>

          {/* Lista de opções */}
          <div>
            <h4 className="text-sm font-medium mb-2">Opções Existentes</h4>
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : options.length > 0 ? (
                options.map(opt => (
                  <div key={opt.id} className="flex items-center justify-between p-2 border rounded bg-muted/30 hover:bg-muted/50 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div style={{ width: 20, height: 20, background: opt.color }} className="rounded flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{opt.option_label}</div>
                        <div className="text-xs text-muted-foreground">{opt.option_key}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(opt)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(opt.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhuma opção encontrada</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FieldOptionsManager;
