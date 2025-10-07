import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Eye, Copy, Check, Brain, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface MensagemHistorico {
  id: string;
  semana_referencia: string;
  mensagem: string;
  enviado: boolean;
  enviado_em: string;
  enviado_gestor_em: string;
  enviado_cs_em: string;
  historico_envios: any[];
  gestor_nome: string;
  cs_nome: string;
  created_at: string;
}

interface HistoricoMensagensClienteProps {
  clienteId: string;
  clienteNome?: string;
  isPublicView?: boolean;
}

interface ResumoInteligente {
  panorama: string;
  mudancas: string;
  alertas: string;
  proximos_passos: string;
}

export function HistoricoMensagensCliente({ clienteId, clienteNome, isPublicView = false }: HistoricoMensagensClienteProps) {
  const [mensagens, setMensagens] = useState<MensagemHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<MensagemHistorico | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [resumoModal, setResumoModal] = useState(false);
  const [resumo, setResumo] = useState<ResumoInteligente | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarHistorico();
  }, [clienteId]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      // Use public client for public view
      let dbClient = supabase;
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        dbClient = createPublicSupabaseClient();
      }

      const { data, error } = await dbClient
        .from("mensagens_semanais")
        .select(`
          *,
          gestor:colaboradores!mensagens_semanais_gestor_id_fkey(nome),
          cs:colaboradores!mensagens_semanais_cs_id_fkey(nome)
        `)
        .eq("cliente_id", clienteId)
        .order("semana_referencia", { ascending: false });

      if (error) {
        throw error;
      }

      const mensagensFormatadas = data?.map((item: any) => ({
        id: item.id,
        semana_referencia: item.semana_referencia,
        mensagem: item.mensagem,
        enviado: item.enviado,
        enviado_em: item.enviado_em,
        enviado_gestor_em: item.enviado_gestor_em,
        enviado_cs_em: item.enviado_cs_em,
        historico_envios: item.historico_envios || [],
        gestor_nome: item.gestor?.nome || "Gestor não encontrado",
        cs_nome: item.cs?.nome || "CS não definido",
        created_at: item.created_at,
      })) || [];

      setMensagens(mensagensFormatadas);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const previewMensagem = (mensagem: string) => {
    if (mensagem.length <= 150) return mensagem;
    return mensagem.substring(0, 150) + "...";
  };

  const copiarMensagem = async () => {
    if (!mensagemSelecionada) return;
    
    try {
      await navigator.clipboard.writeText(mensagemSelecionada.mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar mensagem:", error);
    }
  };

  const gerarResumoInteligente = async () => {
    if (!mensagens || mensagens.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma mensagem disponível para análise",
        variant: "destructive"
      });
      return;
    }

    setLoadingResumo(true);
    setResumoModal(true);
    
    try {
      // Pegar últimas 8 mensagens (mais recentes)
      const mensagensParaAnalise = mensagens.slice(0, 8).map(msg => ({
        data: format(new Date(msg.semana_referencia), "dd/MM/yyyy", { locale: ptBR }),
        texto: msg.mensagem
      }));

      console.log('📊 Enviando mensagens para análise:', mensagensParaAnalise.length);

      const { data, error } = await supabase.functions.invoke('resumo-inteligente-mensagens', {
        body: {
          cliente_nome: clienteNome || 'Cliente',
          mensagens: mensagensParaAnalise
        }
      });

      if (error) {
        console.error('Erro ao gerar resumo:', error);
        throw error;
      }

      console.log('✅ Resumo recebido:', data);
      setResumo(data);

    } catch (error: any) {
      console.error('Erro ao gerar resumo inteligente:', error);
      toast({
        title: "Erro ao gerar resumo",
        description: error.message || "Não foi possível gerar o resumo. Tente novamente.",
        variant: "destructive"
      });
      setResumoModal(false);
    } finally {
      setLoadingResumo(false);
    }
  };

  const copiarResumo = async () => {
    if (!resumo) return;
    
    const textoCompleto = `
📊 RESUMO INTELIGENTE - ${clienteNome || 'Cliente'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 PANORAMA GERAL
${resumo.panorama}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 PRINCIPAIS MUDANÇAS SEMANA A SEMANA
${resumo.mudancas}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ALERTAS
${resumo.alertas}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 PRÓXIMOS PASSOS RECOMENDADOS
${resumo.proximos_passos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
    `.trim();
    
    try {
      await navigator.clipboard.writeText(textoCompleto);
      toast({
        title: "✅ Copiado!",
        description: "Resumo copiado para a área de transferência"
      });
    } catch (error) {
      console.error("Erro ao copiar resumo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o resumo",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Mensagens Semanais
            </CardTitle>
            {!isPublicView && mensagens.length > 0 && (
              <Button
                onClick={gerarResumoInteligente}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={loadingResumo}
              >
                <Brain className="h-4 w-4" />
                Resumo Inteligente
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando histórico...</div>
          ) : mensagens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem semanal encontrada para este cliente
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead>Mensagem</TableHead>
                    {!isPublicView && <TableHead>Gestor</TableHead>}
                    {!isPublicView && <TableHead>CS</TableHead>}
                    {!isPublicView && <TableHead>Linha do Tempo</TableHead>}
                    {!isPublicView && <TableHead>Status</TableHead>}
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensagens.map((mensagem) => (
                    <TableRow key={mensagem.id}>
                      <TableCell>
                        {format(new Date(mensagem.semana_referencia), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">
                          {previewMensagem(mensagem.mensagem)}
                        </div>
                      </TableCell>
                      {!isPublicView && <TableCell className="text-sm">{mensagem.gestor_nome}</TableCell>}
                      {!isPublicView && <TableCell className="text-sm">{mensagem.cs_nome}</TableCell>}
                      {!isPublicView && (
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {mensagem.enviado_gestor_em && (
                              <div className="text-blue-600">
                                ✅ {format(new Date(mensagem.enviado_gestor_em), "dd/MM HH:mm", { locale: ptBR })}
                              </div>
                            )}
                            {mensagem.enviado_cs_em && (
                              <div className="text-green-600">
                                📤 {format(new Date(mensagem.enviado_cs_em), "dd/MM HH:mm", { locale: ptBR })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {!isPublicView && (
                        <TableCell>
                          <Badge 
                            variant={mensagem.enviado ? "default" : "destructive"}
                            className={mensagem.enviado ? "bg-green-100 text-green-800" : ""}
                          >
                            {mensagem.enviado ? "✅ Enviado" : "❌ Pendente"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMensagemSelecionada(mensagem)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Visualização */}
      <Dialog open={!!mensagemSelecionada} onOpenChange={() => setMensagemSelecionada(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              Mensagem Semanal - {mensagemSelecionada && format(new Date(mensagemSelecionada.semana_referencia), "dd/MM/yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          
          {mensagemSelecionada && (
            <div className="space-y-4 overflow-y-auto pr-2">
              {!isPublicView && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Gestor:</span> {mensagemSelecionada.gestor_nome}
                  </div>
                  <div>
                    <span className="font-medium">CS:</span> {mensagemSelecionada.cs_nome}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge 
                      variant={mensagemSelecionada.enviado ? "default" : "destructive"}
                      className={`ml-2 ${mensagemSelecionada.enviado ? "bg-green-100 text-green-800" : ""}`}
                    >
                      {mensagemSelecionada.enviado ? "✅ Enviado" : "❌ Pendente"}
                    </Badge>
                  </div>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Mensagem:</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copiarMensagem}
                    className="gap-2"
                  >
                    {copiado ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <div className={`bg-muted p-4 rounded-lg whitespace-pre-wrap overflow-y-auto ${isPublicView ? 'text-sm leading-relaxed max-h-[50vh]' : ''}`}>
                  {mensagemSelecionada.mensagem}
                </div>
              </div>

              {/* Timeline de Envios - Only for internal view */}
              {!isPublicView && (
                <div>
                  <h4 className="font-medium mb-3">Linha do Tempo de Envios:</h4>
                  <div className="space-y-3">
                    {mensagemSelecionada.enviado_gestor_em && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                        <div>
                          <div className="font-medium text-blue-800">Mensagem criada/atualizada pelo Gestor</div>
                          <div className="text-sm text-blue-600">
                            {format(new Date(mensagemSelecionada.enviado_gestor_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {mensagemSelecionada.enviado_cs_em && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                        <div>
                          <div className="font-medium text-green-800">Mensagem enviada para o cliente pela CS</div>
                          <div className="text-sm text-green-600">
                            {format(new Date(mensagemSelecionada.enviado_cs_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(!mensagemSelecionada.enviado_cs_em && mensagemSelecionada.enviado_gestor_em) && (
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                        <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">⏳</div>
                        <div>
                          <div className="font-medium text-yellow-800">Aguardando envio pela CS</div>
                          <div className="text-sm text-yellow-600">Mensagem pronta para ser enviada ao cliente</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Resumo Inteligente */}
      <Dialog open={resumoModal} onOpenChange={setResumoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Brain className="h-6 w-6 text-blue-600" />
              Resumo Inteligente - {clienteNome || 'Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          {loadingResumo ? (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-muted-foreground">Analisando mensagens semanais com IA...</p>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ) : resumo ? (
            <div className="space-y-6">
              {/* Botões de ação */}
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={copiarResumo}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Resumo
                </Button>
              </div>

              {/* Panorama Geral */}
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                  📊 PANORAMA GERAL
                </h3>
                <div className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                  {resumo.panorama}
                </div>
              </div>

              {/* Principais Mudanças */}
              <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
                  🔎 PRINCIPAIS MUDANÇAS SEMANA A SEMANA
                </h3>
                <div className="text-sm text-purple-800 whitespace-pre-wrap leading-relaxed">
                  {resumo.mudancas}
                </div>
              </div>

              {/* Alertas */}
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <h3 className="font-semibold text-yellow-900 flex items-center gap-2 mb-3">
                  ⚠️ ALERTAS
                </h3>
                <div className="text-sm text-yellow-800 whitespace-pre-wrap leading-relaxed">
                  {resumo.alertas}
                </div>
              </div>

              {/* Próximos Passos */}
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
                  🚀 PRÓXIMOS PASSOS RECOMENDADOS
                </h3>
                <div className="text-sm text-green-800 whitespace-pre-wrap leading-relaxed">
                  {resumo.proximos_passos}
                </div>
              </div>

              {/* Rodapé */}
              <div className="pt-4 border-t text-xs text-muted-foreground text-center">
                Resumo gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • Powered by Lovable AI (Gemini)
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}