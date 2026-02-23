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
import { MessageSquare, Eye, Filter, Check, X, ArrowUpDown, RefreshCw, Plus, Pencil, Trash2, Copy, MoreHorizontal, Wand2, Trash, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, getWeek, getYear, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumosSistemaTab } from "./ResumosSistemaTab";
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
  mensagem_ia?: string;
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
  const [mensagensSelecionadasIds, setMensagensSelecionadasIds] = useState<string[]>([]);
  const [clientesPendentesNomes, setClientesPendentesNomes] = useState<string[]>([]);

  // Filtros
  const TIMEZONE = "America/Sao_Paulo";
  const getCurrentWeekStart = () => {
    const now = toZonedTime(new Date(), TIMEZONE);
    return startOfWeek(now, {
      weekStartsOn: 1
    });
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
  const [novoTexto, setNovoTexto] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  // Estados para edição
  const [editarClienteId, setEditarClienteId] = useState("");
  const [editarWeekStart, setEditarWeekStart] = useState<string>("");
  const [editarTexto, setEditarTexto] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoMensagem, setExcluindoMensagem] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  const [modalTextoCompleto, setModalTextoCompleto] = useState<{
    mostrar: boolean;
    conteudo: string;
  }>({
    mostrar: false,
    conteudo: ""
  });
  const [mensagemExpandida, setMensagemExpandida] = useState(false);
  const {
    toast
  } = useToast();
  const {
    isCS,
    isAdmin
  } = useUserPermissions();

  const gerarVersaoIABackground = async (mensagemId: string, textoBase: string, clienteId: string) => {
    try {
      console.log("Iniciando geração de versão IA em background para mensagem:", mensagemId);
      setLoadingAi(true);

      const clienteSelecionado = clientes.find(c => c.id === clienteId);
      const nomeParaIA = clienteSelecionado?.nome || "Cliente";

      const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
        body: {
          cliente_nome: nomeParaIA,
          rascunho: textoBase
        },
      });

      if (error) throw error;

      if (data?.mensagemFormato) {
        // Atualizar o registro com a versão gerada pela IA
        const { error: updateError } = await supabase
          .from("mensagens_semanais")
          .update({ mensagem_ia: data.mensagemFormato })
          .eq("id", mensagemId);

        if (updateError) throw updateError;
        console.log("Versão IA gerada e salva com sucesso em background.");
        carregarMensagens(); // Recarregar silenciosamente atrás

        // Se estivermos visualizando essa mensagem, atualiza o estado local para exibir na hora
        setMensagemSelecionada(prev =>
          prev && prev.id === mensagemId
            ? { ...prev, mensagem_ia: data.mensagemFormato }
            : prev
        );
      }
    } catch (error) {
      console.error("Erro na geração da IA em background:", error);
      toast({
        title: "Erro ao formatar",
        description: "Não foi possível gerar a mensagem com Inteligência Artificial agora.",
        variant: "destructive"
      });
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    const inicializar = async () => {
      await carregarDados();

      // Get current user
      const user = await supabase.auth.getUser();
      setCurrentUser(user);

      // Initialize week from URL params or current week
      // Configurar semana inicial da URL ou a atual
      const urlParams = new URLSearchParams(window.location.search);
      const weekStartParam = urlParams.get('week_start');
      if (weekStartParam) {
        const weekYear = getYear(new Date(weekStartParam));
        const weekNumber = getWeek(new Date(weekStartParam), {
          weekStartsOn: 1
        });
        setFiltroWeekStart(weekStartParam);
        setFiltroWeekYear(weekYear);
        setFiltroWeekNumber(weekNumber);
      } else {
        // Auto-select current week
        const currentWeekStart = getCurrentWeekStart();
        const weekStart = format(currentWeekStart, "yyyy-MM-dd");
        const weekYear = getYear(currentWeekStart);
        const weekNumber = getWeek(currentWeekStart, {
          weekStartsOn: 1
        });
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
    const buscarPendentes = async () => {
      if (!filtroWeekStart) return;
      try {
        let queryClientes = supabase.from("clientes")
          .select("id, nome")
          .eq("ativo", true)
          .eq("is_active", true)
          .is("deleted_at", null);

        if (filtroGestor && filtroGestor !== "all") {
          const gestorColab = colaboradores.find(c => c.id === filtroGestor);
          if (gestorColab?.user_id) {
            queryClientes = queryClientes.eq("primary_gestor_user_id", gestorColab.user_id);
          }
        }

        const { data: clientesDoFiltro } = await queryClientes;
        if (!clientesDoFiltro || clientesDoFiltro.length === 0) {
          setClientesPendentesNomes([]);
          return;
        }

        const weekStartDate = parse(filtroWeekStart, "yyyy-MM-dd", new Date());
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
        const weekEnd = format(weekEndDate, "yyyy-MM-dd");

        let queryMensagens = supabase.from("mensagens_semanais")
          .select("cliente_id, enviado")
          .gte("semana_referencia", filtroWeekStart)
          .lte("semana_referencia", weekEnd);
        // Nao limito por enviado = true AQUI, pego todos. 

        if (filtroGestor && filtroGestor !== "all") {
          const gestorColab = colaboradores.find(c => c.id === filtroGestor);
          if (gestorColab) {
            queryMensagens = queryMensagens.eq("gestor_id", gestorColab.id);
          }
        }

        const { data: mensagensNaSemana } = await queryMensagens;
        const clientesComMensagem = new Set(
          mensagensNaSemana?.map(m => m.cliente_id) || []
        );

        const nomesPendentes = clientesDoFiltro
          .filter(c => !clientesComMensagem.has(c.id))
          .map(c => c.nome);

        setClientesPendentesNomes(nomesPendentes);
      } catch (err) {
        console.error("Erro ao buscar clientes pendentes", err);
      }
    };

    // Roda quando muda semana, gestor, carrega as mensagens ou os colaboradores
    if (colaboradores.length > 0) {
      buscarPendentes();
    }
  }, [filtroWeekStart, filtroGestor, mensagens, colaboradores]);

  useEffect(() => {
    carregarMensagens();
  }, [filtroWeekStart, filtroGestor, filtroCliente, filtroEnviado, ordenarPor, ordenarDirecao]);

  const carregarDados = async () => {
    try {
      // Carregar clientes
      const {
        data: clientesData
      } = await supabase.from("clientes").select("id, nome, cs_id").eq("ativo", true).order("nome");

      // Carregar colaboradores
      const {
        data: colaboradoresData
      } = await supabase.from("colaboradores").select("id, nome, user_id").eq("ativo", true).order("nome");
      setClientes(clientesData || []);
      setColaboradores(colaboradoresData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };
  const carregarMensagens = async () => {
    // Não carregar se o filtro de semana ainda não foi definido
    if (!filtroWeekStart) {
      return;
    }

    setLoading(true);
    try {
      let query = supabase.from("mensagens_semanais").select(`
          *,
          clientes!inner(nome),
          gestor:colaboradores!mensagens_semanais_gestor_id_fkey(nome)
        `);

      // Ordenar no banco apenas por colunas reais da tabela
      const colunasOrdenaveisDB = ["semana_referencia", "enviado", "created_at", "updated_at"] as const;
      if (colunasOrdenaveisDB.includes(ordenarPor as any)) {
        query = (query as any).order(ordenarPor, {
          ascending: ordenarDirecao === "asc"
        });
      }

      // Aplicar filtros - usar parse para evitar problemas de timezone
      // Parse a data como string "yyyy-MM-dd" sem considerar timezone
      const weekStartDate = parse(filtroWeekStart, "yyyy-MM-dd", new Date());
      const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
      const weekEnd = format(weekEndDate, "yyyy-MM-dd");

      // Filtrar mensagens que estejam dentro do intervalo da semana
      query = query
        .gte("semana_referencia", filtroWeekStart)
        .lte("semana_referencia", weekEnd);

      if (filtroGestor && filtroGestor !== "all") {
        query = query.eq("gestor_id", filtroGestor);
      }
      if (filtroCliente && filtroCliente !== "all") {
        query = query.eq("cliente_id", filtroCliente);
      }
      if (filtroEnviado && filtroEnviado !== "all") {
        query = query.eq("enviado", filtroEnviado === "true");
      }
      const {
        data,
        error
      } = await query;
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
        mensagem_ia: item.mensagem_ia,
        enviado: item.enviado,
        enviado_por: item.enviado_por,
        enviado_em: item.enviado_em,
        enviado_gestor_em: item.enviado_gestor_em,
        enviado_cs_em: item.enviado_cs_em,
        historico_envios: Array.isArray(item.historico_envios) ? item.historico_envios : typeof item.historico_envios === 'string' ? item.historico_envios ? JSON.parse(item.historico_envios) : [] : item.historico_envios || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: item.created_by,
        cliente_nome: item.clientes?.nome || "Cliente não encontrado",
        gestor_nome: item.gestor?.nome || "Gestor não encontrado"
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
        variant: "destructive"
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
      const {
        data: mensagemAtual
      } = await supabase.from("mensagens_semanais").select("historico_envios").eq("id", mensagemId).single();
      const novoHistorico = {
        tipo: enviado ? 'cs_enviado' : 'cs_marcado_pendente',
        data: agora,
        user_id: user.data.user?.id,
        detalhes: enviado ? 'Mensagem enviada para o cliente pela CS' : 'Mensagem marcada como pendente pela CS'
      };
      const dadosAtualizacao: any = {
        enviado,
        updated_at: agora,
        historico_envios: JSON.stringify([...(Array.isArray(mensagemAtual?.historico_envios) ? mensagemAtual?.historico_envios : []), novoHistorico])
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
      const {
        error
      } = await supabase.from("mensagens_semanais").update(dadosAtualizacao).eq("id", mensagemId);
      if (error) {
        throw error;
      }
      toast({
        title: "Sucesso",
        description: `Mensagem marcada como ${enviado ? "enviada" : "pendente"}`
      });

      // Recarregar mensagens
      carregarMensagens();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status de envio",
        variant: "destructive"
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
  const IconeOrdenacao = ({
    coluna
  }: {
    coluna: string;
  }) => {
    if (ordenarPor !== coluna) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return <ArrowUpDown className={`h-4 w-4 ${ordenarDirecao === "asc" ? "rotate-180" : ""} text-primary`} />;
  };
  const criarNovaMensagem = async () => {
    if (!novoClienteId || !novoTexto.trim()) {
      toast({
        title: "Erro",
        description: "Selecione um cliente e digite a mensagem",
        variant: "destructive"
      });
      return;
    }

    // Calcular a semana de referência baseada na data atual
    const currentWeekStart = getCurrentWeekStart();
    const weekStart = format(currentWeekStart, "yyyy-MM-dd");
    setSalvandoNova(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("Usuário não autenticado");
      }

      // Buscar o colaborador atual
      const {
        data: colaborador,
        error: colaboradorError
      } = await supabase.from("colaboradores").select("id").eq("user_id", user.data.user.id).maybeSingle();
      if (colaboradorError || !colaborador) {
        throw new Error("Colaborador não encontrado");
      }

      // Buscar CS do cliente
      const {
        data: cliente
      } = await supabase.from("clientes").select("cs_id").eq("id", novoClienteId).maybeSingle();
      const agora = new Date().toISOString();
      const novoHistorico = {
        tipo: 'gestor_salvo',
        data: agora,
        user_id: user.data.user.id,
        colaborador_id: colaborador.id,
        detalhes: 'Mensagem criada pela ferramenta'
      };
      const {
        error
      } = await supabase.from("mensagens_semanais").insert({
        cliente_id: novoClienteId,
        gestor_id: colaborador.id,
        cs_id: cliente?.cs_id || null,
        semana_referencia: weekStart,
        mensagem: novoTexto.trim(),
        created_by: user.data.user.id,
        enviado_gestor_em: agora,
        historico_envios: [novoHistorico]
      }).select("id").single();
      if (error) {
        throw error;
      }
      const newId = (data as any)?.id;
      toast({
        title: "Sucesso",
        description: "Mensagem criada com sucesso!"
      });

      if (newId) {
        gerarVersaoIABackground(newId, novoTexto.trim(), novoClienteId);
      }

      // Limpar formulário e fechar modal
      setNovoClienteId("");
      setNovoTexto("");
      setModalNovaMensagem(false);

      // Recarregar mensagens
      carregarMensagens();
    } catch (error: any) {
      console.error("Erro ao criar mensagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar mensagem",
        variant: "destructive"
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
        variant: "destructive"
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
      const {
        data: mensagemAtual
      } = await supabase.from("mensagens_semanais").select("historico_envios").eq("id", mensagemEditando.id).single();
      const novoHistorico = {
        tipo: 'editado',
        data: agora,
        user_id: user.data.user.id,
        detalhes: 'Mensagem editada'
      };
      const {
        error
      } = await supabase.from("mensagens_semanais").update({
        cliente_id: editarClienteId,
        semana_referencia: editarWeekStart,
        mensagem: editarTexto.trim(),
        updated_at: agora,
        historico_envios: JSON.stringify([...(Array.isArray(mensagemAtual?.historico_envios) ? mensagemAtual.historico_envios : []), novoHistorico])
      }).eq("id", mensagemEditando.id).select("id").single();
      if (error) {
        throw error;
      }
      const editedId = (data as any)?.id;
      toast({
        title: "Sucesso",
        description: "Mensagem atualizada com sucesso!"
      });

      if (editedId) {
        gerarVersaoIABackground(editedId, editarTexto.trim(), editarClienteId);
      }

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
        variant: "destructive"
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };
  const excluirMensagem = async () => {
    if (!mensagemExcluindo) return;
    setExcluindoMensagem(true);
    try {
      const {
        error
      } = await supabase.from("mensagens_semanais").delete().eq("id", mensagemExcluindo.id);
      if (error) {
        throw error;
      }
      toast({
        title: "Sucesso",
        description: "Mensagem excluída com sucesso!"
      });

      // Fechar modal e recarregar
      setMensagemExcluindo(null);
      carregarMensagens();
    } catch (error: any) {
      console.error("Erro ao excluir mensagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir mensagem",
        variant: "destructive"
      });
    } finally {
      setExcluindoMensagem(false);
    }
  };
  const copiarMensagem = async (mensagem: MensagemSemanal) => {
    const conteudoCompleto = `Cliente: ${mensagem.cliente_nome}
Semana: ${format(new Date(mensagem.semana_referencia), "dd/MM/yyyy", {
      locale: ptBR
    })}
Gestor: ${mensagem.gestor_nome}
Status: ${mensagem.enviado ? "Enviado" : "Pendente"}

Mensagem:
${mensagem.mensagem}`;
    try {
      await navigator.clipboard.writeText(conteudoCompleto);
      toast({
        title: "Copiado!",
        description: "Conteúdo copiado para a área de transferência"
      });
    } catch (error) {
      // Fallback: abrir modal com texto selecionável
      setModalTextoCompleto({
        mostrar: true,
        conteudo: conteudoCompleto
      });
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

  const toggleSelectMensagem = (id: string) => {
    setMensagensSelecionadasIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (mensagensSelecionadasIds.length === mensagens.length) {
      setMensagensSelecionadasIds([]);
    } else {
      setMensagensSelecionadasIds(mensagens.map(m => m.id));
    }
  };

  const acaoMassaMarcarEnvio = async (enviado: boolean) => {
    if (!mensagensSelecionadasIds.length) return;
    try {
      const agora = new Date().toISOString();
      const payload: any = {
        enviado: enviado,
        updated_at: agora
      };

      if (enviado) {
        payload.enviado_cs_em = agora;
        payload.enviado_por = currentUser?.data?.user?.id;
      }

      const { error } = await supabase
        .from("mensagens_semanais")
        .update(payload)
        .in("id", mensagensSelecionadasIds);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${mensagensSelecionadasIds.length} mensagens atualizadas com sucesso!`
      });
      setMensagensSelecionadasIds([]);
      carregarMensagens();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar mensagens em massa",
        variant: "destructive"
      });
    }
  };

  const acaoMassaGerarIA = async () => {
    if (!mensagensSelecionadasIds.length) return;
    setLoadingAi(true);
    let successCount = 0;

    try {
      // Create a copy of the selected IDs to process them in parallel
      const promessasIA = mensagensSelecionadasIds.map(async (msgId) => {
        const mensagemOriginal = mensagens.find(m => m.id === msgId);
        if (!mensagemOriginal) return null;

        const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
          body: {
            cliente_nome: mensagemOriginal.cliente_nome,
            rascunho: mensagemOriginal.mensagem
          },
        });

        if (error) throw error;

        if (data?.mensagemFormato) {
          const { error: updateError } = await supabase
            .from("mensagens_semanais")
            .update({ mensagem_ia: data.mensagemFormato })
            .eq("id", msgId);

          if (updateError) throw updateError;
          return true;
        }
        return false;
      });

      const resultados = await Promise.allSettled(promessasIA);
      successCount = resultados.filter(r => r.status === 'fulfilled' && r.value === true).length;

      if (successCount > 0) {
        toast({
          title: "Inteligência Artificial",
          description: `${successCount} mensagens geradas pela IA com sucesso!`
        });
        setMensagensSelecionadasIds([]);
        carregarMensagens();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao formatar",
        description: "Ocorreu um erro na geração em massa.",
        variant: "destructive"
      });
    } finally {
      setLoadingAi(false);
    }
  };

  const acaoMassaExcluir = async () => {
    if (!mensagensSelecionadasIds.length) return;
    if (!window.confirm(`Tem certeza que deseja excluir as ${mensagensSelecionadasIds.length} mensagens selecionadas?`)) return;

    setExcluindoMensagem(true);
    try {
      const { error } = await supabase
        .from("mensagens_semanais")
        .delete()
        .in("id", mensagensSelecionadasIds);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${mensagensSelecionadasIds.length} mensagens excluídas com sucesso!`
      });
      setMensagensSelecionadasIds([]);
      carregarMensagens();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir mensagens",
        variant: "destructive"
      });
    } finally {
      setExcluindoMensagem(false);
    }
  };

  const precisaCompactar = (texto: string) => {
    return texto.length > 600;
  };
  const obterTextoCompactado = (texto: string) => {
    if (!precisaCompactar(texto)) return texto;
    return texto.substring(0, 600);
  };
  return <Tabs defaultValue="mensagens" className="space-y-6 w-full">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <TabsList>
        <TabsTrigger value="mensagens" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Mensagens
        </TabsTrigger>
        <TabsTrigger value="resumos" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Resumos do Sistema
        </TabsTrigger>
      </TabsList>

      <div className="flex items-center gap-2">
        <Button variant="default" onClick={() => setModalNovaMensagem(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Mensagem
        </Button>
      </div>
    </div>

    <TabsContent value="mensagens" className="space-y-6">

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
              <WeekPicker value={filtroWeekStart} onChange={(weekStart, weekYear, weekNumber) => {
                setFiltroWeekStart(weekStart);
                setFiltroWeekYear(weekYear);
                setFiltroWeekNumber(weekNumber);

                // Update URL params
                const url = new URL(window.location.href);
                url.searchParams.set('week_start', weekStart);
                window.history.replaceState({}, '', url.toString());
              }} onClear={() => {
                setFiltroWeekStart("");
                setFiltroWeekYear(0);
                setFiltroWeekNumber(0);

                // Clear URL params
                const url = new URL(window.location.href);
                url.searchParams.delete('week_start');
                window.history.replaceState({}, '', url.toString());
              }} />
            </div>

            <div>
              <Label htmlFor="filtro-gestor">Gestor</Label>
              <Select value={filtroGestor} onValueChange={setFiltroGestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os gestores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os gestores</SelectItem>
                  {colaboradores
                    .filter(colaborador => colaborador.id && colaborador.id.trim() !== '')
                    .map(colaborador => <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome}
                    </SelectItem>)}
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
                  {clientes
                    .filter(cliente => cliente.id && cliente.id.trim() !== '')
                    .map(cliente => <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>)}
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
            <div className="space-y-4">

              {clientesPendentesNomes.length > 0 && (
                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                  <AlertCircle className="h-4 w-4 stroke-red-600" />
                  <AlertTitle className="text-red-800">Clientes com pendência de envio</AlertTitle>
                  <AlertDescription className="text-red-700/90 text-sm mt-1">
                    Existem {clientesPendentesNomes.length} clientes aguardando envio definitivo para esta semana:
                    <span className="font-semibold block mt-1">
                      {clientesPendentesNomes.join(", ")}
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {mensagensSelecionadasIds.length > 0 && (
                <div className="bg-muted p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border">
                  <div className="text-sm font-medium">
                    {mensagensSelecionadasIds.length} mensagem(s) selecionada(s)
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMensagensSelecionadasIds([])} className="text-muted-foreground mr-2">
                      Cancelar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => acaoMassaMarcarEnvio(true)} className="text-green-600 hover:text-green-700 bg-green-50/50">
                      <Check className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => acaoMassaMarcarEnvio(false)} className="text-red-600 hover:text-red-700 bg-red-50/50">
                      <X className="h-4 w-4 mr-2" />
                      Pendentes
                    </Button>
                    <Button variant="outline" size="sm" onClick={acaoMassaGerarIA} disabled={loadingAi} className="text-blue-600 hover:text-blue-700 bg-blue-50/50">
                      <Wand2 className={`h-4 w-4 mr-2 ${loadingAi ? 'animate-spin' : ''}`} />
                      Gerar IA
                    </Button>
                    <Button variant="destructive" size="sm" onClick={acaoMassaExcluir}>
                      <Trash className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={mensagens.length > 0 && mensagensSelecionadasIds.length === mensagens.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecionar todas as mensagens"
                        />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("cliente_nome")}>
                        <div className="flex items-center gap-2">
                          Cliente
                          <IconeOrdenacao coluna="cliente_nome" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("gestor_nome")}>
                        <div className="flex items-center gap-2">
                          Gestor
                          <IconeOrdenacao coluna="gestor_nome" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("semana_referencia")}>
                        <div className="flex items-center gap-2">
                          Semana
                          <IconeOrdenacao coluna="semana_referencia" />
                        </div>
                      </TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("created_at")}>
                        <div className="flex items-center gap-2">
                          Histórico
                          <IconeOrdenacao coluna="created_at" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("enviado")}>
                        <div className="flex items-center gap-2">
                          Status
                          <IconeOrdenacao coluna="enviado" />
                        </div>
                      </TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mensagens.map(mensagem => <TableRow key={mensagem.id} className={mensagensSelecionadasIds.includes(mensagem.id) ? "bg-muted/50" : ""}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={mensagensSelecionadasIds.includes(mensagem.id)}
                          onCheckedChange={() => toggleSelectMensagem(mensagem.id)}
                          aria-label={`Selecionar mensagem de ${mensagem.cliente_nome}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {mensagem.cliente_nome}
                      </TableCell>
                      <TableCell>{mensagem.gestor_nome}</TableCell>
                      <TableCell>
                        {format(new Date(mensagem.semana_referencia), "dd/MM/yyyy", {
                          locale: ptBR
                        })}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">
                          {previewMensagem(mensagem.mensagem)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {mensagem.enviado_gestor_em && <div>✅ Gestor: {format(new Date(mensagem.enviado_gestor_em), "dd/MM HH:mm", {
                            locale: ptBR
                          })}</div>}
                          {mensagem.enviado_cs_em && <div>📤 CS: {format(new Date(mensagem.enviado_cs_em), "dd/MM HH:mm", {
                            locale: ptBR
                          })}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mensagem.enviado ? "default" : "destructive"} className={mensagem.enviado ? "bg-green-100 text-green-800" : ""}>
                          {mensagem.enviado ? "✅ Enviado" : "❌ Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setMensagemSelecionada(mensagem)} title="Visualizar mensagem">
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Desktop: Botões lado a lado */}
                          <div className="hidden md:flex items-center gap-2">
                            {podeEditar(mensagem) && <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => gerarVersaoIABackground(mensagem.id, mensagem.mensagem, mensagem.cliente_id)}
                                title={mensagem.mensagem_ia ? "Regerar IA" : "Gerar com IA"}
                                disabled={loadingAi}
                                className={mensagem.mensagem_ia ? "text-blue-600 border-blue-200 hover:bg-blue-50" : ""}
                              >
                                <Wand2 className={`h-4 w-4 ${loadingAi ? 'animate-spin' : ''}`} />
                              </Button>
                            </>}
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
                                <DropdownMenuItem onClick={() => copiarMensagem(mensagem)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar
                                </DropdownMenuItem>
                                {podeEditar(mensagem) && <>
                                  <DropdownMenuItem onClick={() => gerarVersaoIABackground(mensagem.id, mensagem.mensagem, mensagem.cliente_id)} disabled={loadingAi}>
                                    <Wand2 className={`h-4 w-4 mr-2 ${loadingAi ? 'animate-spin' : ''}`} />
                                    {mensagem.mensagem_ia ? "Regerar IA" : "Gerar Versão IA"}
                                  </DropdownMenuItem>
                                </>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {(isCS || isAdmin) && <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => marcarEnvio(mensagem.id, true)} disabled={mensagem.enviado} className="text-green-600 hover:text-green-700" title="Marcar como enviado">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => marcarEnvio(mensagem.id, false)} disabled={!mensagem.enviado} className="text-red-600 hover:text-red-700" title="Marcar como pendente">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>}
                        </div>
                      </TableCell>
                    </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="resumos">
      <ResumosSistemaTab />
    </TabsContent>

    {/* Modal de Visualização */}
    <Dialog open={!!mensagemSelecionada} onOpenChange={() => {
      setMensagemSelecionada(null);
      setMensagemExpandida(false);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Mensagem Semanal - {mensagemSelecionada?.cliente_nome}</DialogTitle>

            {mensagemSelecionada && <div className="flex items-center gap-2">
              {/* Desktop: Botões lado a lado */}
              <div className="hidden md:flex items-center gap-2">
                {podeEditar(mensagemSelecionada) && <>
                  <Button variant="outline" size="sm" onClick={() => {
                    iniciarEdicao(mensagemSelecionada);
                    setMensagemSelecionada(null);
                  }} title="Editar mensagem" className="text-blue-600 hover:text-blue-700">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copiarMensagem(mensagemSelecionada)} title="Copiar mensagem" className="text-gray-600 hover:text-gray-700">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setMensagemExcluindo(mensagemSelecionada);
                    setMensagemSelecionada(null);
                  }} title="Excluir mensagem" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>}
                {!podeEditar(mensagemSelecionada) && <Button variant="outline" size="sm" onClick={() => copiarMensagem(mensagemSelecionada)} title="Copiar mensagem" className="text-gray-600 hover:text-gray-700">
                  <Copy className="h-4 w-4" />
                </Button>}
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
                    {podeEditar(mensagemSelecionada) && <>
                      <DropdownMenuItem onClick={() => {
                        iniciarEdicao(mensagemSelecionada);
                        setMensagemSelecionada(null);
                      }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copiarMensagem(mensagemSelecionada)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setMensagemExcluindo(mensagemSelecionada);
                        setMensagemSelecionada(null);
                      }} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </>}
                    {!podeEditar(mensagemSelecionada) && <DropdownMenuItem onClick={() => copiarMensagem(mensagemSelecionada)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>}
          </div>
        </DialogHeader>

        {mensagemSelecionada && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Gestor:</span> {mensagemSelecionada.gestor_nome}
            </div>
            <div>
              <span className="font-medium">Semana:</span> {format(new Date(mensagemSelecionada.semana_referencia), "dd/MM/yyyy", {
                locale: ptBR
              })}
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <Badge variant={mensagemSelecionada.enviado ? "default" : "destructive"} className={`ml-2 ${mensagemSelecionada.enviado ? "bg-green-100 text-green-800" : ""}`}>
                {mensagemSelecionada.enviado ? "✅ Enviado" : "❌ Pendente"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna 1: Gestor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-muted-foreground">Rascunho (Gestor)</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(mensagemSelecionada.mensagem);
                    toast({ description: "Rascunho copiado!" });
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm" style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>
                {precisaCompactar(mensagemSelecionada.mensagem) ? <>
                  {mensagemExpandida ? <>
                    {mensagemSelecionada.mensagem}
                    <div className="mt-3">
                      <Button variant="link" size="sm" onClick={() => setMensagemExpandida(false)} className="p-0 h-auto text-primary text-xs">
                        Ler menos
                      </Button>
                    </div>
                  </> : <>
                    {obterTextoCompactado(mensagemSelecionada.mensagem)}...
                    <div className="mt-3">
                      <Button variant="link" size="sm" onClick={() => setMensagemExpandida(true)} className="p-0 h-auto text-primary text-xs">
                        Ler mais
                      </Button>
                    </div>
                  </>}
                </> : mensagemSelecionada.mensagem}
              </div>
            </div>

            {/* Coluna 2: Inteligência Artificial */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Wand2 className="h-4 w-4" />
                  Sugestão IA
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  onClick={() => {
                    if (mensagemSelecionada.mensagem_ia) {
                      navigator.clipboard.writeText(mensagemSelecionada.mensagem_ia);
                      toast({ description: "Sugestão IA copiada!" });
                    }
                  }}
                  disabled={!mensagemSelecionada.mensagem_ia}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-lg whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm" style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>
                {mensagemSelecionada.mensagem_ia ? (
                  <>
                    {precisaCompactar(mensagemSelecionada.mensagem_ia) ? <>
                      {mensagemExpandida ? <>
                        {mensagemSelecionada.mensagem_ia}
                        <div className="mt-3">
                          <Button variant="link" size="sm" onClick={() => setMensagemExpandida(false)} className="p-0 h-auto text-blue-600 dark:text-blue-400 text-xs">
                            Ler menos
                          </Button>
                        </div>
                      </> : <>
                        {obterTextoCompactado(mensagemSelecionada.mensagem_ia)}...
                        <div className="mt-3">
                          <Button variant="link" size="sm" onClick={() => setMensagemExpandida(true)} className="p-0 h-auto text-blue-600 dark:text-blue-400 text-xs">
                            Ler mais
                          </Button>
                        </div>
                      </>}
                    </> : mensagemSelecionada.mensagem_ia}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-80 pt-4 pb-2">
                    <span className="italic mb-4 text-center">Nenhuma versão de IA gerada para esta mensagem.</span>
                    <Button
                      variant="outline"
                      onClick={() => gerarVersaoIABackground(mensagemSelecionada.id, mensagemSelecionada.mensagem, mensagemSelecionada.cliente_id)}
                      disabled={loadingAi}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      <Wand2 className={`h-4 w-4 mr-2 ${loadingAi ? 'animate-spin' : ''}`} />
                      {loadingAi ? "Gerando IA..." : "Gerar Versão IA Agora"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Histórico de Envios */}
          <div>
            <h4 className="font-medium mb-2">Histórico de Envios:</h4>
            <div className="space-y-2">
              {mensagemSelecionada.enviado_gestor_em && <div className="text-sm bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                <div className="font-medium text-blue-800">✅ Salva pelo Gestor</div>
                <div className="text-blue-600">
                  {format(new Date(mensagemSelecionada.enviado_gestor_em), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR
                  })}
                </div>
              </div>}
              {mensagemSelecionada.enviado_cs_em && <div className="text-sm bg-green-50 p-2 rounded border-l-4 border-green-500">
                <div className="font-medium text-green-800">📤 Enviada pela CS</div>
                <div className="text-green-600">
                  {format(new Date(mensagemSelecionada.enviado_cs_em), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR
                  })}
                </div>
              </div>}
              {Array.isArray(mensagemSelecionada.historico_envios) && mensagemSelecionada.historico_envios.length > 0 && <div className="mt-3">
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Histórico Completo:</h5>
                {mensagemSelecionada.historico_envios.map((evento, index) => <div key={index} className="text-xs text-muted-foreground p-1 bg-muted rounded mb-1">
                  <div className="font-medium">{evento.detalhes || 'Ação registrada'}</div>
                  <div>{evento.data ? format(new Date(evento.data), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR
                  }) : 'Data não disponível'}</div>
                </div>)}
              </div>}
            </div>
          </div>
        </div>}
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
                {clientes
                  .filter(cliente => cliente.id && cliente.id.trim() !== '')
                  .map(cliente => <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="novo-texto">Mensagem / Rascunho</Label>
            <Textarea id="novo-texto" placeholder="Digite os dados brutos ou a mensagem semanal para o cliente..." value={novoTexto} onChange={e => setNovoTexto(e.target.value)} rows={10} className="mt-1 resize-y min-h-[150px]" />
            <p className="text-xs text-muted-foreground mt-1">
              Dica: Jogue os números soltos aqui e salve. Uma versão de leitura amigável será sugerida pela Inteligência Artificial automaticamente.
            </p>
          </div>

          {novoClienteId && <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
            <strong>Cliente selecionado:</strong> {clientes.find(c => c.id === novoClienteId)?.nome}
            <br />
            <strong>CS:</strong> {colaboradores.find(c => c.id === clientes.find(cl => cl.id === novoClienteId)?.cs_id)?.nome || "CS não definido"}
          </div>}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalNovaMensagem(false)} disabled={salvandoNova}>
              Cancelar
            </Button>
            <Button onClick={criarNovaMensagem} disabled={salvandoNova}>
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
                {clientes
                  .filter(cliente => cliente.id && cliente.id.trim() !== '')
                  .map(cliente => <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="editar-semana">Semana de Referência</Label>
            <WeekPicker value={editarWeekStart} onChange={weekStart => {
              setEditarWeekStart(weekStart);
            }} placeholder="Selecionar semana" />
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="editar-texto">Mensagem / Rascunho</Label>
            <Textarea id="editar-texto" placeholder="Digite os dados brutos ou a mensagem semanal..." value={editarTexto} onChange={e => setEditarTexto(e.target.value)} rows={10} className="resize-y min-h-[150px]" />
            <p className="text-xs text-muted-foreground mt-1">
              Dica: Edite os números soltos aqui e salve. Uma versão de leitura amigável será resugerida pela Inteligência Artificial automaticamente.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setModalEditarMensagem(false);
              setMensagemEditando(null);
              setEditarClienteId("");
              setEditarWeekStart("");
              setEditarTexto("");
            }}>
              Cancelar
            </Button>
            <Button onClick={editarMensagem} disabled={salvandoEdicao}>
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
          <AlertDialogAction onClick={excluirMensagem} disabled={excluindoMensagem} className="bg-red-600 hover:bg-red-700">
            {excluindoMensagem ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Modal de Texto Completo (Fallback para cópia) */}
    <Dialog open={modalTextoCompleto.mostrar} onOpenChange={open => setModalTextoCompleto({
      mostrar: open,
      conteudo: ""
    })}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copiar Mensagem Completa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Não foi possível copiar automaticamente. Selecione todo o texto abaixo e copie manualmente:
          </p>

          <div id="texto-completo" className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm select-all" style={{
            userSelect: 'all'
          }}>
            {modalTextoCompleto.conteudo}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalTextoCompleto({
              mostrar: false,
              conteudo: ""
            })}>
              Fechar
            </Button>
            <Button onClick={selecionarTudo}>
              Selecionar Tudo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </Tabs>;
}