import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarClock, ArrowLeft, Save, Edit, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lancamento {
  id: string;
  nome_lancamento: string;
  promessa: string | null;
  status_lancamento: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao: string | null;
  data_inicio_cpl: string | null;
  data_fim_cpl: string | null;
  data_inicio_carrinho: string | null;
  data_fim_carrinho: string | null;
  data_fechamento: string | null;
  ticket_produto: number | null;
  tipo_aulas: string;
  leads_desejados: number | null;
  investimento_total: number;
  publico_alvo: string | null;
  meta_custo_lead: number | null;
  distribuicao_plataformas: any;
  distribuicao_fases: any;
  metas_investimentos: any;
  links_uteis: any[];
  observacoes: string | null;
  cliente_id: string | null;
  gestor_responsavel_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string } | null;
  gestor?: { id: string; nome: string } | null;
}

export default function LancamentoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lancamento, setLancamento] = useState<Lancamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'calendario' | 'gantt'>('calendario');

  useEffect(() => {
    fetchLancamento();
  }, [id]);

  const fetchLancamento = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('lancamentos')
        .select(`
          *,
          clientes:cliente_id(nome),
          gestor:gestor_responsavel_id(id, nome)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Lançamento não encontrado');
        navigate('/lancamentos');
        return;
      }

      setLancamento(data as Lancamento);
    } catch (error) {
      console.error('Erro ao buscar lançamento:', error);
      toast.error('Erro ao carregar lançamento');
      navigate('/lancamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lancamento) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({
          nome_lancamento: lancamento.nome_lancamento,
          promessa: lancamento.promessa,
          ticket_produto: lancamento.ticket_produto,
          leads_desejados: lancamento.leads_desejados,
          publico_alvo: lancamento.publico_alvo,
          meta_custo_lead: lancamento.meta_custo_lead,
          observacoes: lancamento.observacoes,
          data_inicio_cpl: lancamento.data_inicio_cpl,
          data_fim_cpl: lancamento.data_fim_cpl,
          data_inicio_carrinho: lancamento.data_inicio_carrinho,
          data_fim_carrinho: lancamento.data_fim_carrinho,
          data_fechamento: lancamento.data_fechamento,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Lançamento salvo com sucesso');
      setEditing(false);
      fetchLancamento();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar lançamento');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Não definido';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'em_captacao': 'bg-blue-100 text-blue-800',
      'em_cpl': 'bg-yellow-100 text-yellow-800',
      'em_carrinho': 'bg-orange-100 text-orange-800',
      'finalizado': 'bg-green-100 text-green-800',
      'pausado': 'bg-gray-100 text-gray-800',
      'cancelado': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderTimeline = () => {
    const events = [
      { label: 'Início Captação', date: lancamento?.data_inicio_captacao },
      { label: 'Fim Captação', date: lancamento?.data_fim_captacao },
      { label: 'Início CPL', date: lancamento?.data_inicio_cpl },
      { label: 'Fim CPL', date: lancamento?.data_fim_cpl },
      { label: 'Início Carrinho', date: lancamento?.data_inicio_carrinho },
      { label: 'Fim Carrinho', date: lancamento?.data_fim_carrinho },
      { label: 'Fechamento', date: lancamento?.data_fechamento }
    ].filter(event => event.date);

    return (
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <div>
              <p className="font-medium">{event.label}</p>
              <p className="text-sm text-muted-foreground">{formatDate(event.date!)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  if (!lancamento) {
    return <div className="text-center py-8">Lançamento não encontrado</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/lancamentos')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lancamento.nome_lancamento}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(lancamento.status_lancamento)}>
                {lancamento.status_lancamento.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {lancamento.tipo_lancamento.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'calendario' | 'gantt')}>
        <TabsList>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cronograma
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Informações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cronograma do Lançamento</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTimeline()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome do Lançamento</Label>
                  {editing ? (
                    <Input
                      value={lancamento.nome_lancamento}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        nome_lancamento: e.target.value
                      })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{lancamento.nome_lancamento}</p>
                  )}
                </div>

                <div>
                  <Label>Promessa</Label>
                  {editing ? (
                    <Textarea
                      value={lancamento.promessa || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        promessa: e.target.value
                      })}
                      placeholder="Descreva a promessa do lançamento"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.promessa || 'Não informado'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Tipo de Aulas</Label>
                  <p className="text-sm text-muted-foreground">
                    {lancamento.tipo_aulas === 'ao_vivo' ? 'Ao Vivo' : 'Gravadas'}
                  </p>
                </div>

                <div>
                  <Label>Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    {lancamento.clientes?.nome || 'Não vinculado'}
                  </p>
                </div>

                <div>
                  <Label>Gestor Responsável</Label>
                  <p className="text-sm text-muted-foreground">
                    {lancamento.gestor?.nome || 'Não atribuído'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Métricas e Metas */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas e Metas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ticket do Produto</Label>
                  {editing ? (
                    <Input
                      type="number"
                      value={lancamento.ticket_produto || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        ticket_produto: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="R$ 0,00"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.ticket_produto ? 
                        `R$ ${lancamento.ticket_produto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                        'Não informado'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <Label>Leads Desejados</Label>
                  {editing ? (
                    <Input
                      type="number"
                      value={lancamento.leads_desejados || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        leads_desejados: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="Ex: 1000"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.leads_desejados || 'Não informado'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Investimento Previsto</Label>
                  <p className="text-sm text-muted-foreground">
                    R$ {lancamento.investimento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <Label>Meta de Custo por Lead</Label>
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={lancamento.meta_custo_lead || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        meta_custo_lead: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="R$ 0,00"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.meta_custo_lead ? 
                        `R$ ${lancamento.meta_custo_lead.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                        'Não informado'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <Label>Público-alvo</Label>
                  {editing ? (
                    <Textarea
                      value={lancamento.publico_alvo || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        publico_alvo: e.target.value
                      })}
                      placeholder="Descreva o público-alvo"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.publico_alvo || 'Não informado'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Datas */}
            <Card>
              <CardHeader>
                <CardTitle>Datas do Cronograma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Início CPL</Label>
                    {editing ? (
                      <Input
                        type="date"
                        value={lancamento.data_inicio_cpl || ''}
                        onChange={(e) => setLancamento({
                          ...lancamento,
                          data_inicio_cpl: e.target.value || null
                        })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(lancamento.data_inicio_cpl)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Fim CPL</Label>
                    {editing ? (
                      <Input
                        type="date"
                        value={lancamento.data_fim_cpl || ''}
                        onChange={(e) => setLancamento({
                          ...lancamento,
                          data_fim_cpl: e.target.value || null
                        })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(lancamento.data_fim_cpl)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Início Carrinho</Label>
                    {editing ? (
                      <Input
                        type="date"
                        value={lancamento.data_inicio_carrinho || ''}
                        onChange={(e) => setLancamento({
                          ...lancamento,
                          data_inicio_carrinho: e.target.value || null
                        })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(lancamento.data_inicio_carrinho)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Fim Carrinho</Label>
                    {editing ? (
                      <Input
                        type="date"
                        value={lancamento.data_fim_carrinho || ''}
                        onChange={(e) => setLancamento({
                          ...lancamento,
                          data_fim_carrinho: e.target.value || null
                        })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(lancamento.data_fim_carrinho)}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label>Data de Fechamento</Label>
                    {editing ? (
                      <Input
                        type="date"
                        value={lancamento.data_fechamento || ''}
                        onChange={(e) => setLancamento({
                          ...lancamento,
                          data_fechamento: e.target.value || null
                        })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(lancamento.data_fechamento)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={lancamento.observacoes || ''}
                    onChange={(e) => setLancamento({
                      ...lancamento,
                      observacoes: e.target.value
                    })}
                    placeholder="Adicione observações sobre o lançamento"
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {lancamento.observacoes || 'Nenhuma observação adicionada'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}