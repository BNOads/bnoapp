import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WeekPicker } from "@/components/ui/WeekPicker";
import { MessageSquare, Eye, Filter, Check, X, ArrowUpDown, RefreshCw, Plus, Pencil, Trash2, Copy, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, getWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
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
  created_by: string;
  cliente_nome: string;
  gestor_nome: string;
}

export function MensagensSemanaisView() {
  const [mensagens, setMensagens] = useState<MensagemSemanal[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<MensagemSemanal | null>(null);
  const [modalNovaMensagem, setModalNovaMensagem] = useState(false);
  const [modalEditarMensagem, setModalEditarMensagem] = useState(false);
  const [mensagemEditando, setMensagemEditando] = useState<MensagemSemanal | null>(null);
  const [mensagemExcluindo, setMensagemExcluindo] = useState<MensagemSemanal | null>(null);
  
  // Filtros
  const TIMEZONE = "America/Sao_Paulo";
  const getCurrentWeekStart = () => {
    const now = toZonedTime(new Date(), TIMEZONE);
    return startOfWeek(now, { weekStartsOn: 1 });
  };
  
  const [filtroWeekStart, setFiltroWeekStart] = useState<string>("");
  const [filtroWeekYear, setFiltroWeekYear] = useState<number>(0);
  const [filtroWeekNumber, setFiltroWeekNumber] = useState<number>(0);
  const [filtroGestor, setFiltroGestor] = useState("all");
  const [filtroCliente, setFiltroCliente] = useState("all");
  const [filtroEnviado, setFiltroEnviado] = useState("all");

  // Ordenação
  const [ordenarPor, setOrdenarPor] = useState<string>("semana_referencia");
  const [ordenarDirecao, setOrdenarDirecao] = useState<"asc" | "desc">("desc");
  

  // Estados para nova mensagem
  const [novoClienteId, setNovoClienteId] = useState("");
  const [novaWeekStart, setNovaWeekStart] = useState<string>("");
  const [novoTexto, setNovoTexto] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  // Estados para edição
  const [editarClienteId, setEditarClienteId] = useState("");
  const [editarWeekStart, setEditarWeekStart] = useState<string>("");
  const [editarTexto, setEditarTexto] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoMensagem, setExcluindoMensagem] = useState(false);
  const [modalTextoCompleto, setModalTextoCompleto] = useState<{ mostrar: boolean; conteudo: string }>({ mostrar: false, conteudo: "" });

  const { toast } = useToast();
  const { isCS, isAdmin } = useUserPermissions();

  useEffect(() => {
    const inicializar = async () => {
      await carregarDados();
      
      // Get current user
      const user = await supabase.auth.getUser();
      setCurrentUser(user);
      
      // Initialize week from URL params or current week
      const urlParams = new URLSearchParams(window.location.search);
      const weekStartParam = urlParams.get('week_start');
      
      if (weekStartParam) {
        const weekYear = getYear(new Date(weekStartParam));
        const weekNumber = getWeek(new Date(weekStartParam), { weekStartsOn: 1 });
        setFiltroWeekStart(weekStartParam);
        setFiltroWeekYear(weekYear);
        setFiltroWeekNumber(weekNumber);
      } else {
        // Auto-select current week
        const currentWeekStart = getCurrentWeekStart();
        const weekStart = format(currentWeekStart, "yyyy-MM-dd");
        const weekYear = getYear(currentWeekStart);
        const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
        
        setFiltroWeekStart(weekStart);
        setFiltroWeekYear(weekYear);
        setFiltroWeekNumber(weekNumber);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('week_start', weekStart);
        window.history.replaceState({}, '', url.toString());
      }
    };
    inicializar();
  }, []);

  useEffect(() => {
    carregarMensagens();
  }, [filtroWeekStart, filtroGestor, filtroCliente, filtroEnviado, ordenarPor, ordenarDirecao]);


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
          clientes!inner(nome),
          gestor:colaboradores!mensagens_semanais_gestor_id_fkey(nome)
        `);

      // Ordenar no banco apenas por colunas reais da tabela
      const colunasOrdenaveisDB = ["semana_referencia", "enviado", "created_at", "updated_at"] as const;
      if (colunasOrdenaveisDB.includes(ordenarPor as any)) {
        query = (query as any).order(ordenarPor, { ascending: ordenarDirecao === "asc" });
      }

      // Aplicar filtros
      if (filtroWeekStart) {
        // Calcular intervalo da semana em America/Sao_Paulo
        const TIMEZONE = "America/Sao_Paulo";
        
        // Parse da data como início da semana em SP
        const weekStartLocal = toZonedTime(new Date(filtroWeekStart + "T00:00:00"), TIMEZONE);
        const weekEndLocal = toZonedTime(endOfWeek(weekStartLocal, { weekStartsOn: 1 }), TIMEZONE);
        
        // Definir horários exatos em timezone local
        const weekStartWithTime = new Date(weekStartLocal);
        weekStartWithTime.setHours(0, 0, 0, 0);
        
        const weekEndWithTime = new Date(weekEndLocal); 
        weekEndWithTime.setHours(23, 59, 59, 999);
        
        // Converter para UTC para a query
        const weekStartUTC = fromZonedTime(weekStartWithTime, TIMEZONE);
        const weekEndUTC = fromZonedTime(weekEndWithTime, TIMEZONE);
        
        // Aplicar filtro inclusivo
        query = query.gte("created_at", weekStartUTC.toISOString())
                    .lte("created_at", weekEndUTC.toISOString());
      }
      if (filtroGestor && filtroGestor !== "all") {
        query = query.eq("gestor_id", filtroGestor);
      }
      if (filtroCliente && filtroCliente !== "all") {
        query = query.eq("cliente_id", filtroCliente);
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
        historico_envios: Array.isArray(item.historico_envios) ? item.historico_envios : 
                        (typeof item.historico_envios === 'string' ? 
                          (item.historico_envios ? JSON.parse(item.historico_envios) : []) : 
                          (item.historico_envios || [])),
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: item.created_by,
        cliente_nome: item.clientes?.nome || "Cliente não encontrado",
        gestor_nome: item.gestor?.nome || "Gestor não encontrado",
      })) || [];

      // Aplicar ordenação no frontend para campos derivados (nome dos colaboradores)
      const mensagensOrdenadas = mensagensFormatadas.sort((a, b) => {
        let valorA, valorB;
        
        switch (ordenarPor) {
          case "cliente_nome":
            valorA = a.cliente_nome.toLowerCase();
            valorB = b.cliente_nome.toLowerCase();
            break;
          case "gestor_nome":
            valorA = a.gestor_nome.toLowerCase();
            valorB = b.gestor_nome.toLowerCase();
            break;
          case "enviado":
            valorA = a.enviado ? 1 : 0;
            valorB = b.enviado ? 1 : 0;
            break;
          case "semana_referencia":
            valorA = new Date(a.semana_referencia);
            valorB = new Date(b.semana_referencia);
            break;
          case "created_at":
            valorA = new Date(a.created_at);
            valorB = new Date(b.created_at);
            break;
          default:
            return 0;
        }
        
        if (valorA < valorB) return ordenarDirecao === "asc" ? -1 : 1;
        if (valorA > valorB) return ordenarDirecao === "asc" ? 1 : -1;
        return 0;
      });

      setMensagens(mensagensOrdenadas);
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


  const handleOrdenar = (coluna: string) => {
    if (ordenarPor === coluna) {
      setOrdenarDirecao(ordenarDirecao === "asc" ? "desc" : "asc");
    } else {
      setOrdenarPor(coluna);
      setOrdenarDirecao("asc");
    }
  };

  const IconeOrdenacao = ({ coluna }: { coluna: string }) => {
    if (ordenarPor !== coluna) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return (
      <ArrowUpDown 
        className={`h-4 w-4 ${ordenarDirecao === "asc" ? "rotate-180" : ""} text-primary`} 
      />
    );
  };

  const criarNovaMensagem = async () => {
    if (!novoClienteId || !novoTexto.trim() || !novaWeekStart) {
      toast({
        title: "Erro",
        description: "Selecione um cliente, semana e digite a mensagem",
        variant: "destructive",
      });
      return;
    }

    setSalvandoNova(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("Usuário não autenticado");
      }

      // Buscar o colaborador atual
      const { data: colaborador, error: colaboradorError } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.data.user.id)
        .maybeSingle();

      if (colaboradorError || !colaborador) {
        throw new Error("Colaborador não encontrado");
      }

      // Buscar CS do cliente
      const { data: cliente } = await supabase
        .from("clientes")
        .select("cs_id")
        .eq("id", novoClienteId)
        .maybeSingle();

      const agora = new Date().toISOString();
      const novoHistorico = {
        tipo: 'gestor_salvo',
        data: agora,
        user_id: user.data.user.id,
        colaborador_id: colaborador.id,
        detalhes: 'Mensagem criada pela ferramenta'
      };

      const { error } = await supabase
        .from("mensagens_semanais")
        .insert({
          cliente_id: novoClienteId,
          gestor_id: colaborador.id,
          cs_id: cliente?.cs_id || null,
          semana_referencia: novaWeekStart,
          mensagem: novoTexto.trim(),
          created_by: user.data.user.id,
          enviado_gestor_em: agora,
          historico_envios: [novoHistorico],
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Mensagem criada com sucesso!",
      });

      // Limpar formulário e fechar modal
      setNovoClienteId("");
      setNovoTexto("");
      setNovaWeekStart("");
      setModalNovaMensagem(false);

      // Recarregar mensagens
      carregarMensagens();
    } catch (error: any) {
      console.error("Erro ao criar mensagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar mensagem",
        variant: "destructive",
      });
    } finally {
      setSalvandoNova(false);
    }
  };

  const previewMensagem = (mensagem: string) => {
    if (mensagem.length <= 100) return mensagem;
    return mensagem.substring(0, 100) + "...";
  };

  const iniciarEdicao = (mensagem: MensagemSemanal) => {
    setMensagemEditando(mensagem);
    setEditarClienteId(mensagem.cliente_id);
    setEditarWeekStart(mensagem.semana_referencia);
    setEditarTexto(mensagem.mensagem);
    setModalEditarMensagem(true);
  };

  const editarMensagem = async () => {
    if (!mensagemEditando || !editarClienteId || !editarTexto.trim() || !editarWeekStart) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSalvandoEdicao(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("Usuário não autenticado");
      }

      const agora = new Date().toISOString();
      
      // Buscar histórico atual para adicionar a edição
      const { data: mensagemAtual } = await supabase
        .from("mensagens_semanais")
        .select("historico_envios")
        .eq("id", mensagemEditando.id)
        .single();

      const novoHistorico = {
        tipo: 'editado',
        data: agora,
        user_id: user.data.user.id,
        detalhes: 'Mensagem editada'
      };

      const { error } = await supabase
        .from("mensagens_semanais")
        .update({
          cliente_id: editarClienteId,
          semana_referencia: editarWeekStart,
          mensagem: editarTexto.trim(),
          updated_at: agora,
          historico_envios: JSON.stringify([...(Array.isArray(mensagemAtual?.historico_envios) ? mensagemAtual.historico_envios : []), novoHistorico]),
        })
        .eq("id", mensagemEditando.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Mensagem atualizada com sucesso!",
      });

      // Limpar formulário e fechar modal
      setMensagemEditando(null);
      setEditarClienteId("");
      setEditarWeekStart("");
      setEditarTexto("");
      setModalEditarMensagem(false);

      // Recarregar mensagens
      carregarMensagens();
    } catch (error: any) {
      console.error("Erro ao editar mensagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao editar mensagem",
        variant: "destructive",
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const excluirMensagem = async () => {
    if (!mensagemExcluindo) return;

    setExcluindoMensagem(true);
    try {
      const { error } = await supabase
        .from("mensagens_semanais")
        .delete()
        .eq("id", mensagemExcluindo.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Mensagem excluída com sucesso!",
      });

      // Fechar modal e recarregar
      setMensagemExcluindo(null);
      carregarMensagens();
    } catch (error: any) {
      console.error("Erro ao excluir mensagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir mensagem",
        variant: "destructive",
      });
    } finally {
      setExcluindoMensagem(false);
    }
  };

  const copiarMensagem = async (mensagem: MensagemSemanal) => {
    const conteudoCompleto = `Cliente: ${mensagem.cliente_nome}
Semana: ${format(new Date(mensagem.semana_referencia), "dd/MM/yyyy", { locale: ptBR })}
Gestor: ${mensagem.gestor_nome}
Status: ${mensagem.enviado ? "Enviado" : "Pendente"}

Mensagem:
${mensagem.mensagem}`;

    try {
      await navigator.clipboard.writeText(conteudoCompleto);
      toast({
        title: "Copiado!",
        description: "Conteúdo copiado para a área de transferência",
      });
    } catch (error) {
      // Fallback: abrir modal com texto selecionável
      setModalTextoCompleto({ mostrar: true, conteudo: conteudoCompleto });
    }
  };

  const selecionarTudo = () => {
    const elemento = document.getElementById('texto-completo');
    if (elemento) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(elemento);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const podeEditar = (mensagem: MensagemSemanal) => {
    return isAdmin || mensagem.created_by === currentUser?.data?.user?.id;
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
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={() => setModalNovaMensagem(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Mensagem
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filtro-semana">Semana</Label>
              <WeekPicker
                value={filtroWeekStart}
                onChange={(weekStart, weekYear, weekNumber) => {
                  setFiltroWeekStart(weekStart);
                  setFiltroWeekYear(weekYear);
                  setFiltroWeekNumber(weekNumber);
                  
                  // Update URL params
                  const url = new URL(window.location.href);
                  url.searchParams.set('week_start', weekStart);
                  window.history.replaceState({}, '', url.toString());
                }}
                onClear={() => {
                  setFiltroWeekStart("");
                  setFiltroWeekYear(0);
                  setFiltroWeekNumber(0);
                  
                  // Clear URL params
                  const url = new URL(window.location.href);
                  url.searchParams.delete('week_start');
                  window.history.replaceState({}, '', url.toString());
                }}
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
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOrdenar("cliente_nome")}
                    >
                      <div className="flex items-center gap-2">
                        Cliente
                        <IconeOrdenacao coluna="cliente_nome" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOrdenar("gestor_nome")}
                    >
                      <div className="flex items-center gap-2">
                        Gestor
                        <IconeOrdenacao coluna="gestor_nome" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOrdenar("semana_referencia")}
                    >
                      <div className="flex items-center gap-2">
                        Semana
                        <IconeOrdenacao coluna="semana_referencia" />
                      </div>
                    </TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOrdenar("created_at")}
                    >
                      <div className="flex items-center gap-2">
                        Histórico
                        <IconeOrdenacao coluna="created_at" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOrdenar("enviado")}
                    >
                      <div className="flex items-center gap-2">
                        Status
                        <IconeOrdenacao coluna="enviado" />
                      </div>
                    </TableHead>
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
                              title="Visualizar mensagem"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Desktop: Botões lado a lado */}
                            <div className="hidden md:flex items-center gap-2">
                              {podeEditar(mensagem) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => iniciarEdicao(mensagem)}
                                    title="Editar mensagem"
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copiarMensagem(mensagem)}
                                    title="Copiar mensagem"
                                    className="text-gray-600 hover:text-gray-700"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMensagemExcluindo(mensagem)}
                                    title="Excluir mensagem"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {!podeEditar(mensagem) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copiarMensagem(mensagem)}
                                  title="Copiar mensagem"
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            {/* Mobile: Menu dropdown */}
                            <div className="md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" title="Mais ações">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {podeEditar(mensagem) && (
                                    <>
                                      <DropdownMenuItem onClick={() => iniciarEdicao(mensagem)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => copiarMensagem(mensagem)}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copiar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => setMensagemExcluindo(mensagem)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {!podeEditar(mensagem) && (
                                    <DropdownMenuItem onClick={() => copiarMensagem(mensagem)}>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copiar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {(isCS || isAdmin) && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => marcarEnvio(mensagem.id, true)}
                                  disabled={mensagem.enviado}
                                  className="text-green-600 hover:text-green-700"
                                  title="Marcar como enviado"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => marcarEnvio(mensagem.id, false)}
                                  disabled={!mensagem.enviado}
                                  className="text-red-600 hover:text-red-700"
                                  title="Marcar como pendente"
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
                  {Array.isArray(mensagemSelecionada.historico_envios) && mensagemSelecionada.historico_envios.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Histórico Completo:</h5>
                      {mensagemSelecionada.historico_envios.map((evento, index) => (
                        <div key={index} className="text-xs text-muted-foreground p-1 bg-muted rounded mb-1">
                          <div className="font-medium">{evento.detalhes || 'Ação registrada'}</div>
                          <div>{evento.data ? format(new Date(evento.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data não disponível'}</div>
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

      {/* Modal Nova Mensagem */}
      <Dialog open={modalNovaMensagem} onOpenChange={setModalNovaMensagem}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Mensagem Semanal</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="novo-cliente">Cliente</Label>
              <Select value={novoClienteId} onValueChange={setNovoClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
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

            <div>
              <Label htmlFor="nova-semana">Semana de Referência</Label>
              <WeekPicker
                value={novaWeekStart}
                onChange={(weekStart) => {
                  setNovaWeekStart(weekStart);
                }}
                placeholder="Selecionar semana"
              />
            </div>

            <div>
              <Label htmlFor="novo-texto">Mensagem</Label>
              <Textarea
                id="novo-texto"
                placeholder="Digite a mensagem semanal para o cliente..."
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                rows={6}
                className="mt-1"
              />
            </div>

            {novoClienteId && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                <strong>Cliente selecionado:</strong> {clientes.find(c => c.id === novoClienteId)?.nome}
                <br />
                <strong>CS:</strong> {colaboradores.find(c => c.id === clientes.find(cl => cl.id === novoClienteId)?.cs_id)?.nome || "CS não definido"}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setModalNovaMensagem(false)}
                disabled={salvandoNova}
              >
                Cancelar
              </Button>
              <Button
                onClick={criarNovaMensagem}
                disabled={salvandoNova}
              >
                {salvandoNova ? "Salvando..." : "Criar Mensagem"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={modalEditarMensagem} onOpenChange={setModalEditarMensagem}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Mensagem Semanal</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editar-cliente">Cliente</Label>
              <Select value={editarClienteId} onValueChange={setEditarClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
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

            <div>
              <Label htmlFor="editar-semana">Semana de Referência</Label>
              <WeekPicker
                value={editarWeekStart}
                onChange={(weekStart) => {
                  setEditarWeekStart(weekStart);
                }}
                placeholder="Selecionar semana"
              />
            </div>

            <div>
              <Label htmlFor="editar-texto">Mensagem</Label>
              <Textarea
                id="editar-texto"
                placeholder="Digite a mensagem semanal..."
                value={editarTexto}
                onChange={(e) => setEditarTexto(e.target.value)}
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModalEditarMensagem(false);
                  setMensagemEditando(null);
                  setEditarClienteId("");
                  setEditarWeekStart("");
                  setEditarTexto("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={editarMensagem}
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!mensagemExcluindo} onOpenChange={() => setMensagemExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta mensagem semanal para <strong>{mensagemExcluindo?.cliente_nome}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={excluirMensagem}
              disabled={excluindoMensagem}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindoMensagem ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Texto Completo (Fallback para cópia) */}
      <Dialog open={modalTextoCompleto.mostrar} onOpenChange={(open) => setModalTextoCompleto({ mostrar: open, conteudo: "" })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Copiar Mensagem Completa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Não foi possível copiar automaticamente. Selecione todo o texto abaixo e copie manualmente:
            </p>
            
            <div 
              id="texto-completo"
              className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm select-all"
              style={{ userSelect: 'all' }}
            >
              {modalTextoCompleto.conteudo}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalTextoCompleto({ mostrar: false, conteudo: "" })}>
                Fechar
              </Button>
              <Button onClick={selecionarTudo}>
                Selecionar Tudo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}