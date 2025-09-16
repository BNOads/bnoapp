import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

export function HistoricoMensagensCliente({ clienteId }: HistoricoMensagensClienteProps) {
  const [mensagens, setMensagens] = useState<MensagemHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<MensagemHistorico | null>(null);

  useEffect(() => {
    carregarHistorico();
  }, [clienteId]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Mensagens Semanais
          </CardTitle>
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
                    <TableHead>Gestor</TableHead>
                    <TableHead>CS</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell className="text-sm">{mensagem.gestor_nome}</TableCell>
                      <TableCell className="text-sm">{mensagem.cs_nome}</TableCell>
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
                      <TableCell>
                        <Badge 
                          variant={mensagem.enviado ? "default" : "destructive"}
                          className={mensagem.enviado ? "bg-green-100 text-green-800" : ""}
                        >
                          {mensagem.enviado ? "✅ Enviado" : "❌ Pendente"}
                        </Badge>
                      </TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Mensagem Semanal - {mensagemSelecionada && format(new Date(mensagemSelecionada.semana_referencia), "dd/MM/yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          
          {mensagemSelecionada && (
            <div className="space-y-4">
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
              
              <div>
                <h4 className="font-medium mb-2">Mensagem:</h4>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                  {mensagemSelecionada.mensagem}
                </div>
              </div>

              {/* Timeline de Envios */}
              <div>
                <h4 className="font-medium mb-3">Timeline de Envios:</h4>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}