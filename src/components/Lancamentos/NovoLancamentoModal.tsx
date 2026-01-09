import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CriativoSelector } from './CriativoSelector';

interface NovoLancamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLancamentoCriado: () => void;
}

const NovoLancamentoModal: React.FC<NovoLancamentoModalProps> = ({
  open,
  onOpenChange,
  onLancamentoCriado
}) => {
  const [formData, setFormData] = useState({
    nome_lancamento: '',
    descricao: '',
    cliente_id: '',
    gestor_responsavel_id: '',
    status_lancamento: 'em_captacao' as const,
    tipo_lancamento: '',
    data_inicio_captacao: '',
    data_fim_captacao: '',
    investimento_total: '',
    meta_investimento: '',
    link_dashboard: '',
    link_briefing: '',
    observacoes: ''
  });

  const [clientes, setClientes] = useState<Array<{ id: string, nome: string, slug: string, aliases: string[], primary_gestor_user_id: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCriativos, setSelectedCriativos] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchClientes();
    }
  }, [open]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id, 
          nome, 
          slug, 
          aliases,
          client_roles!inner(user_id, role, is_primary)
        `)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Processar clientes para extrair gestor primário
      const clientesComGestor = (data || []).map(cliente => {
        const gestorRole = (cliente as any).client_roles?.find(
          (r: any) => r.role === 'gestor' && r.is_primary
        );
        return {
          ...cliente,
          primary_gestor_user_id: gestorRole?.user_id || null
        };
      });

      setClientes(clientesComGestor);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  // Função para identificar cliente pelo nome do lançamento
  const identificarCliente = async (nomeLancamento: string) => {
    if (!nomeLancamento || clientes.length === 0) {
      return;
    }

    const nomeNormalizado = nomeLancamento.toLowerCase().trim();
    const palavrasLancamento = nomeNormalizado.split(/[\s\-_|]+/).filter(p => p.length > 2);

    // Função auxiliar para verificar match de palavras
    const temMatchPalavras = (texto: string, palavras: string[]): boolean => {
      const textoLower = texto.toLowerCase().trim();
      const palavrasTexto = textoLower.split(/[\s\-_|]+/).filter(p => p.length > 2);
      return palavrasTexto.some(pt => palavras.includes(pt));
    };

    // 1ª Prioridade: Match exato do nome do cliente
    let clienteEncontrado = clientes.find(cliente => {
      const nomeClienteLower = cliente.nome.toLowerCase().trim();
      return temMatchPalavras(nomeClienteLower, palavrasLancamento);
    });

    // 2ª Prioridade: Match exato com aliases
    if (!clienteEncontrado) {
      clienteEncontrado = clientes.find(cliente => {
        if (!cliente.aliases || !Array.isArray(cliente.aliases)) return false;
        return cliente.aliases.some(alias =>
          temMatchPalavras(alias, palavrasLancamento)
        );
      });
    }

    // 3ª Prioridade: Match parcial (contains)
    if (!clienteEncontrado) {
      clienteEncontrado = clientes.find(cliente => {
        // Verificar pelo slug
        if (cliente.slug && nomeNormalizado.includes(cliente.slug.toLowerCase())) {
          return true;
        }

        // Verificar pelo nome do cliente
        const nomeCliente = cliente.nome.toLowerCase();
        if (nomeNormalizado.includes(nomeCliente)) {
          return true;
        }

        // Verificar pelos aliases
        if (cliente.aliases && Array.isArray(cliente.aliases)) {
          return cliente.aliases.some(alias =>
            nomeNormalizado.includes(alias.toLowerCase())
          );
        }

        return false;
      });
    }

    if (clienteEncontrado) {
      let gestorId = '';

      // Buscar colaborador.id baseado no user_id do gestor primário
      if (clienteEncontrado.primary_gestor_user_id) {
        const { data: gestor } = await supabase
          .from('colaboradores')
          .select('id, nome')
          .eq('user_id', clienteEncontrado.primary_gestor_user_id)
          .maybeSingle();

        if (gestor) {
          gestorId = gestor.id;
        }
      }

      setFormData(prev => ({
        ...prev,
        cliente_id: clienteEncontrado.id,
        gestor_responsavel_id: gestorId
      }));

      toast({
        title: "Cliente identificado!",
        description: `${clienteEncontrado.nome}${gestorId ? ' → Gestor associado ✓' : ''}`,
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Quando o nome do lançamento muda, tentar identificar o cliente
    if (field === 'nome_lancamento') {
      identificarCliente(value);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_lancamento: '',
      descricao: '',
      cliente_id: '',
      gestor_responsavel_id: '',
      status_lancamento: 'em_captacao' as const,
      tipo_lancamento: '',
      data_inicio_captacao: '',
      data_fim_captacao: '',
      investimento_total: '',
      meta_investimento: '',
      link_dashboard: '',
      link_briefing: '',
      observacoes: ''
    });
    setSelectedCriativos([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const lancamentoData = {
        nome_lancamento: formData.nome_lancamento,
        descricao: formData.descricao || null,
        cliente_id: formData.cliente_id || null,
        gestor_responsavel_id: formData.gestor_responsavel_id || null,
        status_lancamento: formData.status_lancamento as any,
        tipo_lancamento: formData.tipo_lancamento as any,
        data_inicio_captacao: formData.data_inicio_captacao,
        data_fim_captacao: formData.data_fim_captacao || null,
        investimento_total: parseFloat(formData.investimento_total) || 0,
        meta_investimento: formData.meta_investimento ? parseFloat(formData.meta_investimento) : null,
        link_dashboard: formData.link_dashboard || null,
        link_briefing: formData.link_briefing || null,
        observacoes: formData.observacoes || null,
        created_by: userData.user.id
      };

      const { data: novoLancamento, error } = await supabase
        .from('lancamentos')
        .insert(lancamentoData)
        .select()
        .single();

      if (error) throw error;

      // Se houver criativos selecionados, vincular ao lançamento
      if (selectedCriativos.length > 0 && novoLancamento) {
        const criativosLinks = selectedCriativos.map(criativoId => ({
          lancamento_id: novoLancamento.id,
          criativo_id: criativoId
        }));

        const { error: linksError } = await supabase
          .from('lancamento_criativos')
          .insert(criativosLinks);

        if (linksError) {
          console.error('Erro ao vincular criativos:', linksError);
          toast({
            title: "Aviso",
            description: "Lançamento criado, mas houve erro ao vincular alguns criativos.",
            variant: "warning",
          });
        }
      }

      // Criar notificação para a equipe (Admins + Gestor)
      try {
        // 1. Buscar IDs dos Administradores
        const { data: admins } = await supabase
          .from('colaboradores')
          .select('user_id')
          .eq('nivel_acesso', 'admin')
          .not('user_id', 'is', null);

        const adminIds = admins?.map(a => a.user_id).filter(Boolean) as string[] || [];

        // 2. Buscar ID do Gestor Responsável (se houver)
        let gestorUserId: string | null = null;
        if (formData.gestor_responsavel_id) {
          const { data: gestor } = await supabase
            .from('colaboradores')
            .select('user_id')
            .eq('id', formData.gestor_responsavel_id)
            .single();
          
          if (gestor?.user_id) {
            gestorUserId = gestor.user_id;
          }
        }

        // 3. Montar lista de destinatários única
        const destinatarios = Array.from(new Set([
          ...adminIds,
          gestorUserId
        ])).filter(Boolean) as string[];

        if (destinatarios.length > 0) {
          await supabase.from('avisos').insert({
            titulo: `Novo Lançamento: ${formData.nome_lancamento}`,
            conteudo: `Um novo lançamento foi criado.\nCliente: ${clientes.find(c => c.id === formData.cliente_id)?.nome || 'Não informado'}\nTipo: ${formData.tipo_lancamento}\nInício Captação: ${new Date(formData.data_inicio_captacao).toLocaleDateString('pt-BR')}`,
            tipo: 'info',
            prioridade: 'normal',
            destinatarios: destinatarios,
            data_inicio: new Date().toISOString(),
            created_by: userData.user.id,
            ativo: true
          });
        }
      } catch (notifyError) {
        console.error('Erro ao criar notificação:', notifyError);
      }

      onLancamentoCriado();
      resetForm();

      toast({
        title: "Lançamento criado",
        description: "O lançamento foi criado com sucesso.",
      });

    } catch (error: any) {
      console.error('Erro ao criar lançamento:', error);
      toast({
        title: "Erro ao criar lançamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
          <DialogDescription>
            Cadastre um novo lançamento no sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_lancamento">Nome do Lançamento *</Label>
              <Input
                id="nome_lancamento"
                value={formData.nome_lancamento}
                onChange={(e) => handleInputChange('nome_lancamento', e.target.value)}
                placeholder="Ex: Lançamento Produto X"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente_id">
                Cliente *
                {formData.cliente_id && ' ✅'}
                {formData.gestor_responsavel_id && ' → Gestor associado ✓'}
              </Label>
              <Select
                value={formData.cliente_id}
                onValueChange={async (value) => {
                  handleInputChange('cliente_id', value);
                  // Ao selecionar manualmente, buscar o gestor via colaboradores
                  const clienteSelecionado = clientes.find(c => c.id === value);
                  if (clienteSelecionado?.primary_gestor_user_id) {
                    const { data: gestor } = await supabase
                      .from('colaboradores')
                      .select('id')
                      .eq('user_id', clienteSelecionado.primary_gestor_user_id)
                      .maybeSingle();

                    if (gestor) {
                      handleInputChange('gestor_responsavel_id', gestor.id);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.cliente_id && (
              <div className="space-y-2 md:col-span-2 border-t pt-4 mt-2">
                <Label>Criativos deste Lançamento</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Selecione as pastas de criativos que serão utilizadas neste lançamento.
                </div>
                <CriativoSelector
                  clienteId={formData.cliente_id}
                  selectedIds={selectedCriativos}
                  onSelectionChange={setSelectedCriativos}
                  className="max-h-[300px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tipo_lancamento">Tipo de Lançamento *</Label>
              <Select
                value={formData.tipo_lancamento}
                onValueChange={(value) => handleInputChange('tipo_lancamento', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semente">Semente</SelectItem>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                  <SelectItem value="perpetuo">Perpétuo</SelectItem>
                  <SelectItem value="flash">Flash</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="tradicional">Lançamento Tradicional</SelectItem>
                  <SelectItem value="captacao_simples">Captação simples</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descrição do lançamento..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio_captacao">Data de Início da Captação *</Label>
              <Input
                id="data_inicio_captacao"
                type="date"
                value={formData.data_inicio_captacao}
                onChange={(e) => handleInputChange('data_inicio_captacao', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim_captacao">Data de Fim da Captação</Label>
              <Input
                id="data_fim_captacao"
                type="date"
                value={formData.data_fim_captacao}
                onChange={(e) => handleInputChange('data_fim_captacao', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investimento_total">Investimento Total *</Label>
              <Input
                id="investimento_total"
                type="number"
                step="0.01"
                value={formData.investimento_total}
                onChange={(e) => handleInputChange('investimento_total', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_investimento">Meta de Investimento</Label>
              <Input
                id="meta_investimento"
                type="number"
                step="0.01"
                value={formData.meta_investimento}
                onChange={(e) => handleInputChange('meta_investimento', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="link_dashboard">Link do Dashboard</Label>
              <Input
                id="link_dashboard"
                type="url"
                value={formData.link_dashboard}
                onChange={(e) => handleInputChange('link_dashboard', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_briefing">Link do Briefing</Label>
              <Input
                id="link_briefing"
                type="url"
                value={formData.link_briefing}
                onChange={(e) => handleInputChange('link_briefing', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Lançamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoLancamentoModal;