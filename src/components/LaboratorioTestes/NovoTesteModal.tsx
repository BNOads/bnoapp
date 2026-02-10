import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTesteTemplates } from '@/hooks/useLaboratorioTestes';
import { useToast } from '@/hooks/use-toast';
import type { TesteFormData, TesteTemplate } from '@/types/laboratorio-testes';
import { DEFAULT_FORM_DATA, TIPO_LABELS, CANAL_LABELS, STATUS_LABELS, METRICA_LABELS } from '@/types/laboratorio-testes';
import { ClientSelect } from '@/components/Clientes/ClientSelect';

interface Gestor {
  id: string;
  user_id: string;
  nome: string;
  avatar_url?: string;
}

interface NovoTesteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  createTeste: (formData: TesteFormData) => Promise<string | null>;
  currentColaboradorId?: string;
  initialData?: Partial<TesteFormData>;
}

export const NovoTesteModal = ({
  open,
  onOpenChange,
  onSuccess,
  createTeste,
  currentColaboradorId,
  initialData,
}: NovoTesteModalProps) => {
  const { toast } = useToast();
  const { templates } = useTesteTemplates();

  const [formData, setFormData] = useState<TesteFormData>({
    ...DEFAULT_FORM_DATA,
    gestor_responsavel_id: currentColaboradorId || '',
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [funis, setFunis] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadGestores();
      setFormData({
        ...DEFAULT_FORM_DATA,
        gestor_responsavel_id: currentColaboradorId || '',
        ...initialData,
      });
    }
  }, [open, currentColaboradorId, initialData]);

  useEffect(() => {
    if (formData.cliente_id) {
      supabase
        .from('orcamentos_funil')
        .select('nome_funil')
        .eq('cliente_id', formData.cliente_id)
        .eq('ativo', true)
        .order('nome_funil')
        .then(({ data }) => {
          const uniqueFunis = [...new Set((data || []).map(d => d.nome_funil).filter(Boolean))];
          setFunis(uniqueFunis);
        });
    } else {
      setFunis([]);
      setFormData(prev => ({ ...prev, funil: '' }));
    }
  }, [formData.cliente_id]);

  const loadGestores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, user_id, nome, avatar_url')
        .order('nome');

      if (error) throw error;
      setGestores(data || []);
    } catch (error) {
      console.error('Erro ao carregar gestores:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        tipo_teste: template.tipo_teste,
        canal: template.canal || prev.canal,
        hipotese: template.hipotese || prev.hipotese,
        metrica_principal: template.metrica_principal || prev.metrica_principal,
        meta_metrica: template.meta_metrica?.toString() || prev.meta_metrica,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome do teste é obrigatório', variant: 'destructive' });
      return;
    }
    if (!formData.cliente_id) {
      toast({ title: 'Erro', description: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const id = await createTeste(formData);
    setLoading(false);
    if (id) {
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            Novo Teste
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template selector */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Usar template (opcional)</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Identificacao */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Identificacao
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente *</Label>
                <ClientSelect
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="funil">Funil</Label>
                <Select
                  value={formData.funil}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, funil: value }))}
                  disabled={!formData.cliente_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.cliente_id ? 'Selecione um cliente primeiro' : 'Selecione o funil'} />
                  </SelectTrigger>
                  <SelectContent>
                    {funis.map(funil => (
                      <SelectItem key={funil} value={funil}>
                        {funil}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ou digite um funil personalizado"
                  value={formData.funil}
                  onChange={(e) => setFormData(prev => ({ ...prev, funil: e.target.value }))}
                  disabled={!formData.cliente_id}
                  className="mt-1"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="nome">Nome do teste *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Teste de criativo - carrossel vs imagem estática"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="gestor">Gestor responsavel</Label>
                <Select
                  value={formData.gestor_responsavel_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gestor_responsavel_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    {gestores.map(gestor => (
                      <SelectItem key={gestor.id} value={gestor.id}>
                        {gestor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Classificacao */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Classificacao
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de teste</Label>
                <Select
                  value={formData.tipo_teste}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_teste: value as TesteFormData['tipo_teste'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_LABELS) as [string, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Canal</Label>
                <Select
                  value={formData.canal}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, canal: value as TesteFormData['canal'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CANAL_LABELS) as [string, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Execucao */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Execucao
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as TesteFormData['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejado">{STATUS_LABELS.planejado}</SelectItem>
                    <SelectItem value="rodando">{STATUS_LABELS.rodando}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div />

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de inicio</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Validacao */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Validacao
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metrica principal</Label>
                <Select
                  value={formData.metrica_principal}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, metrica_principal: value as TesteFormData['metrica_principal'] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a metrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(METRICA_LABELS) as [string, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_metrica">Meta da metrica</Label>
                <Input
                  id="meta_metrica"
                  type="number"
                  value={formData.meta_metrica}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_metrica: e.target.value }))}
                  placeholder="Ex: 2.5"
                />
              </div>
            </div>
          </div>

          {/* Conteudo */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Conteudo
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hipotese">Hipotese</Label>
                <Textarea
                  id="hipotese"
                  rows={3}
                  value={formData.hipotese}
                  onChange={(e) => setFormData(prev => ({ ...prev, hipotese: e.target.value }))}
                  placeholder="Descreva a hipotese do teste..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="o_que_foi_alterado">O que sera alterado</Label>
                <Textarea
                  id="o_que_foi_alterado"
                  rows={2}
                  value={formData.o_que_foi_alterado}
                  onChange={(e) => setFormData(prev => ({ ...prev, o_que_foi_alterado: e.target.value }))}
                  placeholder="Descreva o que sera alterado no teste..."
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <FlaskConical className="mr-2 h-4 w-4" />
                Criar Teste
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
