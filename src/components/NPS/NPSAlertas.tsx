import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Eye, PlayCircle } from "lucide-react";

export function NPSAlertas() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertaSelecionado, setAlertaSelecionado] = useState<any>(null);
  const [observacoes, setObservacoes] = useState('');
  const [resolvendo, setResolvendo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarAlertas();
  }, []);

  const carregarAlertas = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('nps_alertas' as any)
        .select(`
          *,
          cliente:clientes(nome),
          resposta:nps_respostas(nota_nps, satisfacao_semanal, motivo_nps, motivo_satisfacao_baixa, data_resposta)
        `)
        .order('created_at', { ascending: false });

      setAlertas(data || []);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarTarefaAutomatica = async (alertaId: string) => {
    try {
      const { error } = await supabase.functions.invoke('nps-criar-tarefa-alerta', {
        body: { alerta_id: alertaId }
      });

      if (error) throw error;

      toast({
        title: "✅ Tarefa criada",
        description: "Uma tarefa foi criada automaticamente para este alerta"
      });

      carregarAlertas();
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a tarefa",
        variant: "destructive"
      });
    }
  };

  const resolverAlerta = async () => {
    if (!alertaSelecionado) return;

    setResolvendo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('nps_alertas' as any)
        .update({
          resolvido: true,
          resolvido_por: user?.id,
          resolvido_em: new Date().toISOString(),
          observacoes
        })
        .eq('id', alertaSelecionado.id);

      if (error) throw error;

      toast({
        title: "✅ Alerta resolvido",
        description: "O alerta foi marcado como resolvido"
      });

      setAlertaSelecionado(null);
      setObservacoes('');
      carregarAlertas();
    } catch (error: any) {
      console.error('Erro ao resolver alerta:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível resolver o alerta",
        variant: "destructive"
      });
    } finally {
      setResolvendo(false);
    }
  };

  const getTipoAlertaBadge = (tipo: string) => {
    if (tipo === 'nota_baixa') return <Badge variant="destructive">NPS Baixo</Badge>;
    if (tipo === 'satisfacao_baixa') return <Badge variant="destructive" className="bg-orange-600">Satisfação Baixa</Badge>;
    if (tipo === 'tendencia_negativa') return <Badge variant="destructive" className="bg-red-700">Tendência Negativa</Badge>;
    return <Badge>{tipo}</Badge>;
  };

  if (loading) return <div>Carregando alertas...</div>;

  const alertasPendentes = alertas.filter(a => !a.resolvido);
  const alertasResolvidos = alertas.filter(a => a.resolvido);

  return (
    <div className="space-y-6">
      {/* Alertas Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Alertas Pendentes ({alertasPendentes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasPendentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              Nenhum alerta pendente! 🎉
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertasPendentes.map((alerta) => (
                  <TableRow key={alerta.id}>
                    <TableCell className="font-medium">{alerta.cliente?.nome}</TableCell>
                    <TableCell>{getTipoAlertaBadge(alerta.tipo_alerta)}</TableCell>
                    <TableCell className="max-w-md">
                      {alerta.tipo_alerta === 'nota_baixa' && (
                        <span>NPS: {alerta.resposta?.nota_nps}/10</span>
                      )}
                      {alerta.tipo_alerta === 'satisfacao_baixa' && (
                        <span>Satisfação: {'⭐'.repeat(alerta.resposta?.satisfacao_semanal || 0)}</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(alerta.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAlertaSelecionado(alerta)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!alerta.tarefa_id && (
                          <Button
                            size="sm"
                            onClick={() => criarTarefaAutomatica(alerta.id)}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Criar Tarefa
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alertas Resolvidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Alertas Resolvidos ({alertasResolvidos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasResolvidos.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum alerta resolvido ainda
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {alertasResolvidos.slice(0, 10).map((alerta) => (
                <div key={alerta.id} className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-medium">{alerta.cliente?.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      Resolvido em {new Date(alerta.resolvido_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  {getTipoAlertaBadge(alerta.tipo_alerta)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!alertaSelecionado} onOpenChange={() => setAlertaSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Alerta</DialogTitle>
          </DialogHeader>
          {alertaSelecionado && (
            <div className="space-y-4">
              <div>
                <span className="font-medium">Cliente:</span> {alertaSelecionado.cliente?.nome}
              </div>
              <div>
                <span className="font-medium">Tipo:</span> {getTipoAlertaBadge(alertaSelecionado.tipo_alerta)}
              </div>
              {alertaSelecionado.resposta && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div><strong>Nota NPS:</strong> {alertaSelecionado.resposta.nota_nps}/10</div>
                  {alertaSelecionado.resposta.satisfacao_semanal && (
                    <div><strong>Satisfação Semanal:</strong> {'⭐'.repeat(alertaSelecionado.resposta.satisfacao_semanal)}</div>
                  )}
                  {alertaSelecionado.resposta.motivo_nps && (
                    <div>
                      <strong>Motivo NPS:</strong>
                      <p className="mt-1 text-sm">{alertaSelecionado.resposta.motivo_nps}</p>
                    </div>
                  )}
                  {alertaSelecionado.resposta.motivo_satisfacao_baixa && (
                    <div>
                      <strong>Motivo Satisfação:</strong>
                      <p className="mt-1 text-sm">{alertaSelecionado.resposta.motivo_satisfacao_baixa}</p>
                    </div>
                  )}
                </div>
              )}

              {!alertaSelecionado.resolvido && (
                <>
                  <div>
                    <label className="font-medium block mb-2">Observações da Resolução:</label>
                    <Textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Descreva as ações tomadas para resolver este alerta..."
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={resolverAlerta}
                    disabled={resolvendo}
                    className="w-full"
                  >
                    {resolvendo ? 'Resolvendo...' : 'Marcar como Resolvido'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
