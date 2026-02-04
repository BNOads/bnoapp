import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

export const CategoriesManager = ({ open, onOpenChange, onUpdated }: { open: boolean; onOpenChange: (o: boolean) => void; onUpdated?: () => void }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [color, setColor] = useState('#6B7280');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('client_categories').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Erro carregando categorias:', err);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

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
        const { error } = await supabase.from('client_categories').update({ label, color }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Categoria atualizada');
      } else {
        const { error } = await supabase.from('client_categories').insert({ key, label, color }).select();
        if (error) throw error;
        toast.success('Categoria criada');
      }
      resetForm();
      load();
      onUpdated?.();
    } catch (err: any) {
      console.error('Erro salvando categoria:', err);
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleEdit = (cat: any) => {
    setEditing(cat);
    setLabel(cat.label);
    setKey(cat.key);
    setColor(cat.color || '#6B7280');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir categoria? Essa ação removerá apenas a definição, não os clientes.')) return;
    try {
      const { error } = await supabase.from('client_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('Categoria removida');
      load();
      onUpdated?.();
    } catch (err: any) {
      console.error('Erro removendo categoria:', err);
      toast.error('Erro ao remover');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="col-span-1">
              <Label>Key</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} disabled={!!editing} placeholder="negocio_local" />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Negócio Local" />
            </div>
            <div>
              <Label>Cor</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm}>Limpar</Button>
            <Button onClick={handleSave}>{editing ? 'Atualizar' : 'Criar'} <Plus className="ml-2" /></Button>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Categorias Existentes</h4>
            <div className="space-y-2">
              {loading ? <div>Carregando...</div> : (
                categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 16, height: 16, background: cat.color }} className="rounded" />
                      <div>
                        <div className="font-medium">{cat.label}</div>
                        <div className="text-xs text-muted-foreground">{cat.key}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}><Edit3 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoriesManager;
