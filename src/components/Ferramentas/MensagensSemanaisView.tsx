import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Eye, Filter, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface MensagemSemanal {
  id: string;
  cliente_id: string;
  gestor_id: string;
  cs_id: string;
  semana_referencia: string;
  mensagem: string;
  enviado: boolean;
  enviado_por: string;
  enviado_em: string;
  enviado_gestor_em: string;
  enviado_cs_em: string;
  historico_envios: any[];
  created_at: string;
  updated_at: string;
  cliente_nome: string;
  gestor_nome: string;
  cs_nome: string;
}

export function MensagensSemanaisView() {
  const [mensagens, setMensagens] = useState<MensagemSemanal[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<MensagemSemanal | null>(null);
  
  // Filtros
  const [filtroSemana, setFiltroSemana] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [filtroGestor, setFiltroGestor] = useState("all");
  const [filtroCliente, setFiltroCliente] = useState("all");
  const [filtroCS, setFiltroCS] = useState("all");
  const [filtroEnviado, setFiltroEnviado] = useState("all");

  const { toast } = useToast();
  const { isCS, isAdmin } = useUserPermissions();

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarMensagens();
  }, [filtroSemana, filtroGestor, filtroCliente, filtroCS, filtroEnviado]);

  // Auto-selecionar CS quando cliente for selecionado
  useEffect(() => {
    if (filtroCliente && filtroCliente !== "all") {
      const clienteSelecionado = clientes.find(c => c.id === filtroCliente);
      if (clienteSelecionado?.cs_id && filtroCS === "all") {
        setFiltroCS(clienteSelecionado.cs_id);
      }
    }
  }, [filtroCliente, clientes]);

  const carregarDados = async () => {
    try {
      // Carregar clientes
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nome, cs_id")
        .eq("ativo", true)
        .order("nome");

      // Carregar colaboradores
      const { data: colaboradoresData } = await supabase
        .from("colaboradores")
        .select("id, nome, user_id")
        .eq("ativo", true)
        .order("nome");

      setClientes(clientesData || []);
      setColaboradores(colaboradoresData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const carregarMensagens = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("mensagens_semanais")
        .select(`
          *,
          clientes!inner(nome, cs_id),
          gestor:colaboradores!mensagens_semanais_gestor_id_fkey(nome),
          cs:colaboradores!mensagens_semanais_cs_id_fkey(nome)
        `)
        .order("semana_referencia", { ascending: false })
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (filtroSemana) {
        query = query.eq("semana_referencia", filtroSemana);
      }
      if (filtroGestor && filtroGestor !== "all") {
        query = query.eq("gestor_id", filtroGestor);
      }
      if (filtroCliente && filtroCliente !== "all") {
        query = query.eq("cliente_id", filtroCliente);
      }
      if (filtroCS && filtroCS !== "all") {
        query = query.eq("cs_id", filtroCS);
      }
      if (filtroEnviado && filtroEnviado !== "all") {
        query = query.eq("enviado", filtroEnviado === "true");
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transformar dados para o formato esperado
      const mensagensFormatadas = data?.map((item: any) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        gestor_id: item.gestor_id,
        cs_id: item.cs_id,
        semana_referencia: item.semana_referencia,
        mensagem: item.mensagem,
        enviado: item.enviado,
        enviado_por: item.enviado_por,
        enviado_em: item.enviado_em,
        enviado_gestor_em: item.enviado_gestor_em,
        enviado_cs_em: item.enviado_cs_em,
        historico_envios: item.historico_envios || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
        cliente_nome: item.clientes?.nome || "Cliente não encontrado",
        gestor_nome: item.gestor?.nome || "Gestor não encontrado",
        cs_nome: item.cs?.nome || "CS não definido",
      })) || [];

      setMensagens(mensagensFormatadas);
    } catch (error: any) {
      console.error("Erro ao carregar mensagens:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens semanais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarEnvio = async (mensagemId: string, enviado: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      const agora = new Date().toISOString();

      // Buscar mensagem atual para adicionar ao histórico
      const { data: mensagemAtual } = await supabase
        .from("mensagens_semanais")
        .select("historico_envios")
        .eq("id", mensagemId)
        .single();

      const novoHistorico = {
        tipo: enviado ? 'cs_enviado' : 'cs_marcado_pendente',
        data: agora,
        user_id: user.data.user?.id,
        detalhes: enviado ? 'Mensagem enviada para o cliente pela CS' : 'Mensagem marcada como pendente pela CS'
      };

      const dadosAtualizacao: any = {
        enviado,
        updated_at: agora,
        historico_envios: JSON.stringify([...(Array.isArray(mensagemAtual?.historico_envios) ? mensagemAtual?.historico_envios : []), novoHistorico]),
      };

      if (enviado) {
        dadosAtualizacao.enviado_por = user.data.user?.id;
        dadosAtualizacao.enviado_em = agora;
        dadosAtualizacao.enviado_cs_em = agora;
      } else {
        dadosAtualizacao.enviado_por = null;
        dadosAtualizacao.enviado_em = null;
        dadosAtualizacao.enviado_cs_em = null;
      }

      const { error } = await supabase
        .from("mensagens_semanais")
        .update(dadosAtualizacao)
        .eq("id", mensagemId);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: `Mensagem marcada como ${enviado ? "enviada" : "pendente"}`,
      });

      // Recarregar mensagens
      carregarMensagens();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status de envio",
        variant: "destructive",
      });
    }
  };

  const previewMensagem = (mensagem: string) => {
    if (mensagem.length <= 100) return mensagem;
    return mensagem.substring(0, 100) + "...";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mensagens Semanais</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe as mensagens semanais dos clientes
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="filtro-semana">Semana</Label>
              <Input
                id="filtro-semana"
                type="date"
                value={filtroSemana}
                onChange={(e) => setFiltroSemana(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="filtro-gestor">Gestor</Label>
              <Select value={filtroGestor} onValueChange={setFiltroGestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os gestores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os gestores</SelectItem>
                  {colaboradores.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filtro-cliente">Cliente</Label>
              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filtro-cs">CS</Label>
              <Select value={filtroCS} onValueChange={setFiltroCS}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os CS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os CS</SelectItem>
                  {colaboradores.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filtro-enviado">Status de Envio</Label>
              <Select value={filtroEnviado} onValueChange={setFiltroEnviado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="true">Enviado</SelectItem>
                  <SelectItem value="false">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mensagens ({mensagens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando mensagens...</div>
          ) : mensagens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem encontrada para os filtros selecionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>Semana</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>CS</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensagens.map((mensagem) => (
                    <TableRow key={mensagem.id}>
                      <TableCell className="font-medium">
                        {mensagem.cliente_nome}
                      </TableCell>
                      <TableCell>{mensagem.gestor_nome}</TableCell>
                      <TableCell>
                        {format(new Date(mensagem.semana_referencia), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">
                          {previewMensagem(mensagem.mensagem)}
                        </div>
                      </TableCell>
                      <TableCell>{mensagem.cs_nome}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {mensagem.enviado_gestor_em && (
                            <div>✅ Gestor: {format(new Date(mensagem.enviado_gestor_em), "dd/MM HH:mm", { locale: ptBR })}</div>
                          )}
                          {mensagem.enviado_cs_em && (
                            <div>📤 CS: {format(new Date(mensagem.enviado_cs_em), "dd/MM HH:mm", { locale: ptBR })}</div>
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMensagemSelecionada(mensagem)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {(isCS || isAdmin) && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => marcarEnvio(mensagem.id, true)}
                                disabled={mensagem.enviado}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => marcarEnvio(mensagem.id, false)}
                                disabled={!mensagem.enviado}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
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
            <DialogTitle>Mensagem Semanal - {mensagemSelecionada?.cliente_nome}</DialogTitle>
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
                  <span className="font-medium">Semana:</span> {format(new Date(mensagemSelecionada.semana_referencia), "dd/MM/yyyy", { locale: ptBR })}
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

              {/* Histórico de Envios */}
              <div>
                <h4 className="font-medium mb-2">Histórico de Envios:</h4>
                <div className="space-y-2">
                  {mensagemSelecionada.enviado_gestor_em && (
                    <div className="text-sm bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                      <div className="font-medium text-blue-800">✅ Salva pelo Gestor</div>
                      <div className="text-blue-600">
                        {format(new Date(mensagemSelecionada.enviado_gestor_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  )}
                  {mensagemSelecionada.enviado_cs_em && (
                    <div className="text-sm bg-green-50 p-2 rounded border-l-4 border-green-500">
                      <div className="font-medium text-green-800">📤 Enviada pela CS</div>
                      <div className="text-green-600">
                        {format(new Date(mensagemSelecionada.enviado_cs_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  )}
                  {mensagemSelecionada.historico_envios?.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Histórico Completo:</h5>
                      {mensagemSelecionada.historico_envios.map((evento, index) => (
                        <div key={index} className="text-xs text-muted-foreground p-1 bg-muted rounded mb-1">
                          <div className="font-medium">{evento.detalhes}</div>
                          <div>{format(new Date(evento.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}