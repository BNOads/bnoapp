import { useState } from 'react';
import { Plus, Edit, Trash2, FlaskConical, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTesteTemplates } from '@/hooks/useLaboratorioTestes';
import { useToast } from '@/hooks/use-toast';
import type { TesteTemplate, TipoTesteLab, CanalTesteLab, MetricaPrincipalLab } from '@/types/laboratorio-testes';
import { TIPO_LABELS, CANAL_LABELS, METRICA_LABELS } from '@/types/laboratorio-testes';

export const TemplatesManager = () => {
  const { templates, loading, createTemplate, updateTemplate } = useTesteTemplates();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TesteTemplate | null>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [tipoTeste, setTipoTeste] = useState<TipoTesteLab>('criativo');
  const [canal, setCanal] = useState<CanalTesteLab | ''>('');
  const [hipotese, setHipotese] = useState('');
  const [metricaPrincipal, setMetricaPrincipal] = useState<MetricaPrincipalLab | ''>('');
  const [metaMetrica, setMetaMetrica] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setNome('');
    setTipoTeste('criativo');
    setCanal('');
    setHipotese('');
    setMetricaPrincipal('');
    setMetaMetrica('');
    setChecklistItems([]);
    setNewChecklistItem('');
    setShowModal(true);
  };

  const openEdit = (template: TesteTemplate) => {
    setEditing(template);
    setNome(template.nome);
    setTipoTeste(template.tipo_teste);
    setCanal(template.canal || '');
    setHipotese(template.hipotese || '');
    setMetricaPrincipal(template.metrica_principal || '');
    setMetaMetrica(template.meta_metrica?.toString() || '');
    setChecklistItems(template.checklist?.map(c => c.item) || []);
    setNewChecklistItem('');
    setShowModal(true);
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklistItems(prev => [...prev, newChecklistItem.trim()]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: 'Erro', description: 'Nome do template é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const templateData = {
      nome: nome.trim(),
      tipo_teste: tipoTeste,
      canal: canal || null,
      hipotese: hipotese || null,
      metrica_principal: metricaPrincipal || null,
      meta_metrica: metaMetrica ? parseFloat(metaMetrica) : null,
      checklist: checklistItems.map(item => ({ item, checked: false })),
    };

    let success: boolean;
    if (editing) {
      success = await updateTemplate(editing.id, templateData);
    } else {
      success = await createTemplate(templateData as any);
    }

    setSaving(false);
    if (success) {
      setShowModal(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await updateTemplate(id, { ativo: false });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Templates pré-configurados para agilizar a criação de novos testes.
        </p>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {templates.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Métrica</TableHead>
              <TableHead>Checklist</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell>{TIPO_LABELS[t.tipo_teste]}</TableCell>
                <TableCell>{t.canal ? CANAL_LABELS[t.canal] : '-'}</TableCell>
                <TableCell>{t.metrica_principal ? METRICA_LABELS[t.metrica_principal] : '-'}</TableCell>
                <TableCell>
                  {t.checklist?.length > 0 && (
                    <Badge variant="outline">{t.checklist.length} itens</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(t.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum template criado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Templates ajudam a padronizar tipos comuns de testes.</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome do Template *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Teste de criativo educacional" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Teste *</Label>
                <Select value={tipoTeste} onValueChange={v => setTipoTeste(v as TipoTesteLab)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canal</Label>
                <Select value={canal || 'none'} onValueChange={v => setCanal(v === 'none' ? '' : v as CanalTesteLab)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Object.entries(CANAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Hipótese Base</Label>
              <Textarea value={hipotese} onChange={e => setHipotese(e.target.value)} rows={2} placeholder="Hipótese padrão para este tipo de teste" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Métrica Principal</Label>
                <Select value={metricaPrincipal || 'none'} onValueChange={v => setMetricaPrincipal(v === 'none' ? '' : v as MetricaPrincipalLab)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {Object.entries(METRICA_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meta da Métrica</Label>
                <Input type="number" value={metaMetrica} onChange={e => setMetaMetrica(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div>
              <Label>Checklist de Evidências</Label>
              <div className="space-y-2 mt-1">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <span className="text-sm flex-1">{item}</span>
                    <button onClick={() => removeChecklistItem(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newChecklistItem}
                    onChange={e => setNewChecklistItem(e.target.value)}
                    placeholder="Adicionar item ao checklist"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  />
                  <Button variant="outline" size="sm" onClick={addChecklistItem} disabled={!newChecklistItem.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar' : 'Criar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
