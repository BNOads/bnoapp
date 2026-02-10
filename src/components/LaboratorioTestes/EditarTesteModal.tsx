import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TesteFormData, TesteLaboratorio, ValidacaoTesteLab } from '@/types/laboratorio-testes';
import { TIPO_LABELS, CANAL_LABELS, STATUS_LABELS, VALIDACAO_LABELS, METRICA_LABELS } from '@/types/laboratorio-testes';

interface Cliente {
  id: string;
  nome: string;
}

interface Gestor {
  id: string;
  user_id: string;
  nome: string;
  avatar_url?: string;
}

interface EditarTesteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teste: TesteLaboratorio;
  onSuccess: () => void;
  updateTeste: (id: string, formData: Partial<TesteFormData>) => Promise<boolean>;
}

export const EditarTesteModal = ({
  open,
  onOpenChange,
  teste,
  onSuccess,
  updateTeste,
}: EditarTesteModalProps) => {
  const { toast } = useToast();

  const [formData, setFormData] = useState<TesteFormData>({
    cliente_id: '',
    funil: '',
    nome: '',
    gestor_responsavel_id: '',
    tipo_teste: 'criativo',
    canal: 'meta_ads',
    status: 'planejado',
    data_inicio: '',
    data_fim: '',
    metrica_principal: '',
    meta_metrica: '',
    resultado_observado: '',
    hipotese: '',
    o_que_foi_alterado: '',
    observacao_equipe: '',
    anotacoes: '',
    aprendizados: '',
    proximos_testes_sugeridos: '',
    link_anuncio: '',
    link_campanha: '',
    link_experimento: '',
  });
  const [validacao, setValidacao] = useState<ValidacaoTesteLab>('em_teste');
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [funis, setFunis] = useState<string[]>([]);

  useEffect(() => {
    if (teste && open) {
      setFormData({
        cliente_id: teste.cliente_id || '',
        funil: teste.funil || '',
        nome: teste.nome,
        gestor_responsavel_id: teste.gestor_responsavel_id,
        tipo_teste: teste.tipo_teste,
        canal: teste.canal,
        status: teste.status,
        data_inicio: teste.data_inicio || '',
        data_fim: teste.data_fim || '',
        metrica_principal: teste.metrica_principal || '',
        meta_metrica: teste.meta_metrica?.toString() || '',
        resultado_observado: teste.resultado_observado?.toString() || '',
        hipotese: teste.hipotese || '',
        o_que_foi_alterado: teste.o_que_foi_alterado || '',
        observacao_equipe: teste.observacao_equipe || '',
        anotacoes: teste.anotacoes || '',
        aprendizados: teste.aprendizados || '',
        proximos_testes_sugeridos: teste.proximos_testes_sugeridos || '',
        link_anuncio: teste.link_anuncio || '',
        link_campanha: teste.link_campanha || '',
        link_experimento: teste.link_experimento || '',
      });
      setValidacao(teste.validacao);
      loadClientes();
      loadGestores();
    }
  }, [teste, open]);

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

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

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

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome do teste é obrigatório', variant: 'destructive' });
      return;
    }

    // Check evidence if setting to concluido
    if (formData.status === 'concluido' && teste.status !== 'concluido') {
      const hasLinks = formData.link_anuncio || formData.link_campanha || formData.link_experimento;
      if (!hasLinks) {
        const { count } = await supabase
          .from('testes_laboratorio_evidencias')
          .select('id', { count: 'exact', head: true })
          .eq('teste_id', teste.id);
        if (!count || count === 0) {
          toast({
            title: 'Evidência obrigatória',
            description: 'É necessário pelo menos 1 evidência (imagem ou link) para concluir o teste.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    setLoading(true);

    // Build update payload including validacao (which is separate from TesteFormData)
    const updatePayload: any = { ...formData };

    // Also update validacao if changed (not part of TesteFormData, send directly)
    if (validacao !== teste.validacao) {
      const { error: valError } = await supabase
        .from('testes_laboratorio')
        .update({ validacao })
        .eq('id', teste.id);
      if (valError) {
        toast({ title: 'Erro', description: 'Erro ao atualizar validação: ' + valError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
    }

    const success = await updateTeste(teste.id, formData);
    setLoading(false);
    if (success) {
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Teste</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identificacao */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Identificacao
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cliente_id">Cliente *</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-funil">Funil</Label>
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
                <Label htmlFor="edit-nome">Nome do teste *</Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Teste de criativo - carrossel vs imagem estática"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-gestor">Gestor responsavel</Label>
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
                    {(Object.entries(STATUS_LABELS) as [string, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div />

              <div className="space-y-2">
                <Label htmlFor="edit-data_inicio">Data de inicio</Label>
                <Input
                  id="edit-data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-data_fim">Data de fim</Label>
                <Input
                  id="edit-data_fim"
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
                <Label>Validacao</Label>
                <Select
                  value={validacao}
                  onValueChange={(value) => setValidacao(value as ValidacaoTesteLab)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(VALIDACAO_LABELS) as [string, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Label htmlFor="edit-meta_metrica">Meta da metrica</Label>
                <Input
                  id="edit-meta_metrica"
                  type="number"
                  value={formData.meta_metrica}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_metrica: e.target.value }))}
                  placeholder="Ex: 2.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-resultado_observado">Resultado observado</Label>
                <Input
                  id="edit-resultado_observado"
                  type="number"
                  value={formData.resultado_observado}
                  onChange={(e) => setFormData(prev => ({ ...prev, resultado_observado: e.target.value }))}
                  placeholder="Ex: 3.1"
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
                <Label htmlFor="edit-hipotese">Hipotese</Label>
                <Textarea
                  id="edit-hipotese"
                  rows={3}
                  value={formData.hipotese}
                  onChange={(e) => setFormData(prev => ({ ...prev, hipotese: e.target.value }))}
                  placeholder="Descreva a hipotese do teste..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-o_que_foi_alterado">O que foi alterado</Label>
                <Textarea
                  id="edit-o_que_foi_alterado"
                  rows={2}
                  value={formData.o_que_foi_alterado}
                  onChange={(e) => setFormData(prev => ({ ...prev, o_que_foi_alterado: e.target.value }))}
                  placeholder="Descreva o que foi alterado no teste..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-observacao_equipe">Observacao da equipe</Label>
                <Textarea
                  id="edit-observacao_equipe"
                  rows={2}
                  value={formData.observacao_equipe}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao_equipe: e.target.value }))}
                  placeholder="Observacoes da equipe sobre o teste..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-anotacoes">Anotacoes</Label>
                <Textarea
                  id="edit-anotacoes"
                  rows={2}
                  value={formData.anotacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, anotacoes: e.target.value }))}
                  placeholder="Anotacoes gerais..."
                />
              </div>
            </div>
          </div>

          {/* Aprendizados */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Aprendizados
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-aprendizados">Aprendizados</Label>
                <Textarea
                  id="edit-aprendizados"
                  rows={3}
                  value={formData.aprendizados}
                  onChange={(e) => setFormData(prev => ({ ...prev, aprendizados: e.target.value }))}
                  placeholder="O que foi aprendido com este teste..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-proximos_testes_sugeridos">Proximos testes sugeridos</Label>
                <Textarea
                  id="edit-proximos_testes_sugeridos"
                  rows={2}
                  value={formData.proximos_testes_sugeridos}
                  onChange={(e) => setFormData(prev => ({ ...prev, proximos_testes_sugeridos: e.target.value }))}
                  placeholder="Sugestoes de proximos testes baseados nos aprendizados..."
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Links
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-link_anuncio">Link do anuncio</Label>
                <Input
                  id="edit-link_anuncio"
                  type="url"
                  value={formData.link_anuncio}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_anuncio: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-link_campanha">Link da campanha</Label>
                <Input
                  id="edit-link_campanha"
                  type="url"
                  value={formData.link_campanha}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_campanha: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-link_experimento">Link do experimento</Label>
                <Input
                  id="edit-link_experimento"
                  type="url"
                  value={formData.link_experimento}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_experimento: e.target.value }))}
                  placeholder="https://..."
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
                Salvando...
              </>
            ) : (
              'Salvar Alteracoes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
