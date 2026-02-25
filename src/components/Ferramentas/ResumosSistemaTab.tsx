import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeekPicker } from "@/components/ui/WeekPicker";
import { supabase } from "@/integrations/supabase/client";
import { toZonedTime } from "date-fns-tz";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, MessageSquare, Calendar as CalendarIcon, Users, Eye, Check, X, Trash2, Wand2, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function ResumosSistemaTab() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [clienteSelecionado, setClienteSelecionado] = useState<string>("all");
    const [weekStart, setWeekStart] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [loadingAi, setLoadingAi] = useState(false);
    const [rawTextExpanded, setRawTextExpanded] = useState(false);
    const [resumosData, setResumosData] = useState<any[] | null>(null);
    const [selectedMensagens, setSelectedMensagens] = useState<string[]>([]);
    const { toast } = useToast();

    // Modal state for viewing a message
    const [mensagemSelecionada, setMensagemSelecionada] = useState<any>(null);

    // Sorting state
    const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({
        coluna: 'cliente_nome',
        direcao: 'asc'
    });

    const { isGestor, isCS, isAdmin } = useUserPermissions();

    const TIMEZONE = "America/Sao_Paulo";

    useEffect(() => {
        // Carregar clientes ativos
        supabase
            .from("clientes")
            .select(`
                id,
                nome,
                slug,
                primary_cs_user_id,
                primary_cs:colaboradores!clientes_primary_cs_user_id_fkey(id, nome, avatar_url)
            `)
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("nome")
            .then(({ data }) => setClientes(data || []));

        // Set semana atual
        const now = toZonedTime(new Date(), TIMEZONE);
        const start = startOfWeek(now, { weekStartsOn: 1 });
        setWeekStart(format(start, "yyyy-MM-dd"));
    }, []);

    const previewMensagem = (texto: string | null | undefined) => {
        if (!texto) return "-";
        return texto.length > 70 ? texto.substring(0, 70) + "..." : texto;
    };

    const gerarTextoVazioCheck = (resumoData: any) => {
        return (resumoData.tarefas && resumoData.tarefas.length > 0) ||
            (resumoData.tarefasPendentes && resumoData.tarefasPendentes.length > 0) ||
            (resumoData.lancamentos && resumoData.lancamentos.length > 0) ||
            (resumoData.reunioes && resumoData.reunioes.length > 0) ||
            (resumoData.gravacoes && resumoData.gravacoes.length > 0) ||
            (resumoData.diario && resumoData.diario.length > 0) ||
            (resumoData.orcamentos && resumoData.orcamentos.length > 0) ||
            (resumoData.mensagens && resumoData.mensagens.length > 0);
    }

    const gerarTextoWhatsapp = (resumoData: any) => {
        const { cliente, mensagens, diario, reunioes, gravacoes, lancamentos, orcamentos, tarefas, tarefasPendentes } = resumoData;

        let texto = `*Resumo Semanal - ${cliente.nome}* 📊\n\n`;

        if (tarefas && tarefas.length > 0) {
            texto += `*✅ Tarefas Concluídas:*\n`;
            tarefas?.forEach((t: any) => texto += `• ${t.title}\n`);
            texto += `\n`;
        }

        if (tarefasPendentes && tarefasPendentes.length > 0) {
            texto += `*⏳ Tarefas em Andamento/A Fazer:*\n`;
            tarefasPendentes?.forEach((t: any) => texto += `• ${t.title}\n`);
            texto += `\n`;
        }

        if (lancamentos && lancamentos.length > 0) {
            texto += `*🚀 Lançamentos Ativos:*\n`;
            lancamentos?.forEach((l: any) => texto += `• ${l.nome_lancamento} (${l.status_lancamento?.replace(/_/g, " ")})\n`);
            texto += `\n`;
        }

        if (orcamentos && orcamentos.length > 0) {
            texto += `*🎯 Funis Ativos:*\n`;
            orcamentos?.forEach((o: any) => texto += `• ${o.nome_funil} ${o.etapa_funil ? `(${o.etapa_funil})` : ''}\n`);
            texto += `\n`;
        }

        if ((reunioes && reunioes.length > 0) || (gravacoes && gravacoes.length > 0)) {
            texto += `*🎥 Reuniões & Gravações:*\n`;
            reunioes?.forEach((r: any) => texto += `• ${r.titulo}\n`);
            gravacoes?.forEach((g: any) => texto += `• ${g.titulo}\n`);
            texto += `\n`;
        }

        if (diario && diario.length > 0) {
            texto += `*📝 Atualizações do Painel:*\n`;
            diario?.forEach((d: any) => texto += `• ${d.texto}\n`);
            texto += `\n`;
        }

        return texto.trim();
    };

    const carregarDados = async (gerarParaTodos: boolean = false) => {
        if (!gerarParaTodos && clienteSelecionado === "all") {
            toast({
                title: "Selecione um cliente",
                description: "Você precisa selecionar um cliente específico ou usar a opção Gerar Todos.",
                variant: "destructive",
            });
            return;
        }

        if (!weekStart) return;

        setLoading(true);
        setResumosData(null);
        setSelectedMensagens([]);

        try {
            const clientesParaGerar = gerarParaTodos
                ? clientes
                : clientes.filter(c => c.id === clienteSelecionado);

            if (clientesParaGerar.length === 0) throw new Error("Nenhum cliente habilitado encontrado.");

            const start = new Date(`${weekStart}T00:00:00-03:00`);
            const end = endOfWeek(start, { weekStartsOn: 1 });
            const endDate = new Date(end.setHours(23, 59, 59, 999));

            const startStr = format(start, "yyyy-MM-dd", { locale: ptBR });
            const endStr = format(endDate, "yyyy-MM-dd", { locale: ptBR });

            const [resMensagens, resDiario, resReunioes, resGravacoes, resLancamentos, resOrcamentos, resAlocacoes] = await Promise.all([
                supabase.from("mensagens_semanais").select(`
                    *,
                    gestor:gestor_id(nome, avatar_url),
                    cs:cs_id(nome, avatar_url)
                `).eq("semana_referencia", weekStart).in("cliente_id", clientesParaGerar.map(c => c.id)),
                supabase.from("diario_bordo").select("texto, created_at, autor_id, cliente_id").in("cliente_id", clientesParaGerar.map(c => c.id)).gte("created_at", start.toISOString()).lte("created_at", endDate.toISOString()).order("created_at", { ascending: true }),
                supabase.from("reunioes").select("titulo, descricao, data, cliente_id").in("cliente_id", clientesParaGerar.map(c => c.id)).gte("data", start.toISOString()).lte("data", endDate.toISOString()),
                supabase.from("gravacoes").select("titulo, created_at, cliente_id").in("cliente_id", clientesParaGerar.map(c => c.id)).gte("created_at", start.toISOString()).lte("created_at", endDate.toISOString()),
                supabase.from("lancamentos").select("nome_lancamento, status_lancamento, cliente_id").eq("ativo", true).not("status_lancamento", "in", '("finalizado","cancelado")').in("cliente_id", clientesParaGerar.map(c => c.id)),
                supabase.from("orcamentos_funil").select("nome_funil, etapa_funil, cliente_id, ativo").eq("ativo", true).in("cliente_id", clientesParaGerar.map(c => c.id)),
                supabase.from("alocacoes").select(`
                    cliente_id,
                    gestor:gestor_id(id, nome, avatar_url),
                    cs:cs_id(id, nome, avatar_url)
                `).in("cliente_id", clientesParaGerar.map(c => c.id))
            ]);

            const { data: tarefas } = await supabase
                .from("tasks")
                .select("title, completed_at, description")
                .eq("completed", true)
                .gte("completed_at", start.toISOString())
                .lte("completed_at", endDate.toISOString());

            const { data: tarefasAbertas } = await supabase
                .from("tasks")
                .select("title, description")
                .eq("completed", false);

            const formataResumos = clientesParaGerar.map(cliente => {
                const m = (resMensagens.data || []).filter(x => {
                    if (x.cliente_id !== cliente.id) return false;
                    const hs = Array.isArray(x.historico_envios) ? x.historico_envios : (typeof x.historico_envios === 'string' && x.historico_envios ? JSON.parse(x.historico_envios) : []);
                    return hs.some((h: any) => h.tipo === 'sistema_gerado');
                });

                // Extract primary_cs safely
                const primary_cs_obj = Array.isArray(cliente.primary_cs) ? cliente.primary_cs[0] : cliente.primary_cs;
                cliente.primary_cs = primary_cs_obj;

                const d = (resDiario.data || []).filter(x => x.cliente_id === cliente.id);
                const r = (resReunioes.data || []).filter(x => x.cliente_id === cliente.id);
                const g = (resGravacoes.data || []).filter(x => x.cliente_id === cliente.id);
                const l = (resLancamentos.data || []).filter(x => x.cliente_id === cliente.id);
                const o = (resOrcamentos.data || []).filter(x => x.cliente_id === cliente.id);

                let alocacao = (resAlocacoes.data || []).find(x => x.cliente_id === cliente.id);
                if (alocacao) {
                    alocacao.gestor = Array.isArray(alocacao.gestor) ? alocacao.gestor[0] : alocacao.gestor;
                    alocacao.cs = Array.isArray(alocacao.cs) ? alocacao.cs[0] : alocacao.cs;
                }

                const nomeMatch = (cliente.nome || "").toLowerCase();
                const slugMatch = (cliente.slug || "").toLowerCase();

                const filterTaskFunction = (x: any) => {
                    const titleStr = (x.title || "").toLowerCase();
                    const descStr = (x.description || "").toLowerCase();
                    const checks = [];
                    if (nomeMatch) checks.push(nomeMatch);
                    if (slugMatch) checks.push(slugMatch);

                    if (checks.length === 0) return false;

                    return checks.some(check => titleStr.includes(check) || descStr.includes(check));
                };

                const t = (tarefas || []).filter(filterTaskFunction);
                const tp = (tarefasAbertas || []).filter(filterTaskFunction);

                return {
                    cliente,
                    periodo: { start, end: endDate },
                    mensagens: m,
                    diario: d,
                    reunioes: r,
                    gravacoes: g,
                    lancamentos: l,
                    orcamentos: o,
                    tarefas: t,
                    tarefasPendentes: tp,
                    alocacao
                };
            });

            // Salvar mensagens_semanais automaticamente para resumos válidos sem mensagens ainda nesta semana
            const resumosValidosSemMensagem = formataResumos.filter(r => gerarTextoVazioCheck(r) && r.mensagens.length === 0);

            if (resumosValidosSemMensagem.length > 0) {
                const { data: userData } = await supabase.auth.getUser();
                const userId = userData.user?.id;
                const agora = new Date().toISOString();

                const msgsToInsert = resumosValidosSemMensagem.map(r => ({
                    cliente_id: r.cliente.id,
                    gestor_id: r.alocacao?.gestor?.id || null,
                    cs_id: r.cliente.primary_cs?.id || null,
                    semana_referencia: weekStart,
                    mensagem: gerarTextoWhatsapp(r),
                    enviado: false,
                    created_by: userId,
                    historico_envios: [{
                        tipo: 'sistema_gerado',
                        data: agora,
                        user_id: userId,
                        detalhes: 'Resumo semanal salvo automaticamente no momento da geração.'
                    }]
                }));

                const { data: insertedMsgs, error: insertError } = await supabase
                    .from("mensagens_semanais")
                    .insert(msgsToInsert)
                    .select();

                if (!insertError && insertedMsgs) {
                    insertedMsgs.forEach(msg => {
                        const resumoTarget = formataResumos.find(r => r.cliente.id === msg.cliente_id);
                        if (resumoTarget) resumoTarget.mensagens = [msg];
                    });
                } else {
                    console.error("Erro inserindo mensagens em lote:", insertError);
                }
            }

            setResumosData([...formataResumos]);

        } catch (error: any) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Falha ao buscar dados para o resumo.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGerarResumo = () => carregarDados(false);
    const handleGerarTodos = () => carregarDados(true);

    const gerarVersaoIA = async (resumoData: any) => {
        const msgDb = resumoData.mensagens.length > 0 ? resumoData.mensagens[0] : null;

        if (!msgDb) {
            toast({ title: "Erro", description: "O resumo ainda não está salvo no banco de dados.", variant: "destructive" });
            return;
        }

        setLoadingAi(true);
        const toastId = toast({
            title: "Gerando com IA...",
            description: "Criando uma mensagem atraente baseada nas atividades do sistema.",
            duration: 10000,
        }).id;

        try {
            // Ignorar msgDb.mensagem propositalmente para não misturar contexto de anúncios (Ads) com atividades do sistema
            const textoContextoRaw = gerarTextoWhatsapp(resumoData);

            const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
                body: {
                    cliente_nome: resumoData.cliente.nome,
                    rascunho: textoContextoRaw,
                    tipo_resumo: 'sistema'
                }
            });

            if (error) throw error;

            toast({
                title: "Sucesso!",
                description: "Versão com IA gerada.",
            });

            const textoGerado = data?.mensagemFormato;

            // Salva de volta no banco
            if (textoGerado) {
                await supabase.from('mensagens_semanais').update({ mensagem_ia: textoGerado }).eq('id', msgDb.id);
            }

            // Atualiza localmente a interface
            const mensagemAtualizada = { ...msgDb, mensagem_ia: textoGerado };

            if (resumosData) {
                const newData = resumosData.map(resumo => {
                    if (resumo.cliente.id === resumoData.cliente.id) {
                        return { ...resumo, mensagens: [mensagemAtualizada] };
                    }
                    return resumo;
                });
                setResumosData(newData);
            }

            if (mensagemSelecionada && mensagemSelecionada.cliente.id === resumoData.cliente.id) {
                setMensagemSelecionada({ ...mensagemSelecionada, mensagens: [mensagemAtualizada] });
            }

        } catch (error: any) {
            console.error('Erro ao gerar IA:', error);
            toast({
                title: "Erro na geração",
                description: error.message || "Não foi possível gerar a versão com IA",
                variant: "destructive"
            });
        } finally {
            setLoadingAi(false);
        }
    }

    const marcarEnvio = async (resumoData: any, enviado: boolean) => {
        try {
            const user = await supabase.auth.getUser();
            const agora = new Date().toISOString();
            const msgDb = resumoData.mensagens.length > 0 ? resumoData.mensagens[0] : null;

            if (!msgDb) {
                toast({ title: "Erro", description: "Mensagem não encontrada no banco de dados.", variant: "destructive" });
                return;
            }

            const novoHistorico = {
                tipo: enviado ? 'cs_enviado' : 'cs_marcado_pendente',
                data: agora,
                user_id: user.data.user?.id,
                detalhes: enviado ? 'Resumo semanal marcado como enviado.' : 'Resumo semanal marcado como pendente.'
            };

            const dataAtualizacao: any = {
                enviado,
                enviado_cs_em: enviado ? agora : null,
                historico_envios: [...(msgDb.historico_envios || []), novoHistorico]
            };

            const { error, data } = await supabase.from("mensagens_semanais").update(dataAtualizacao).eq("id", msgDb.id).select().single();
            if (error) throw error;

            toast({
                title: "Sucesso",
                description: `Mensagem marcada como ${enviado ? 'enviada' : 'pendente'}.`
            });

            if (resumosData) {
                const newData = resumosData.map(resumo => {
                    if (resumo.cliente.id === resumoData.cliente.id) {
                        return { ...resumo, mensagens: [data] };
                    }
                    return resumo;
                });
                setResumosData(newData);
            }

            if (mensagemSelecionada && mensagemSelecionada.cliente.id === resumoData.cliente.id) {
                setMensagemSelecionada({ ...mensagemSelecionada, mensagens: [data] });
            }

        } catch (error: any) {
            console.error("Erro ao marcar envio:", error);
            toast({ title: "Erro", description: "Não foi possível atualizar o status da mensagem.", variant: "destructive" });
        }
    };

    const handleMassApprove = async () => {
        if (!selectedMensagens.length) return;
        setLoading(true);
        try {
            const user = await supabase.auth.getUser();
            const agora = new Date().toISOString();

            const msgsToUpdate = resumosData?.flatMap(r => r.mensagens).filter(m => selectedMensagens.includes(m.id)) || [];

            for (const msg of msgsToUpdate) {
                const novoHistorico = {
                    tipo: 'cs_enviado',
                    data: agora,
                    user_id: user.data.user?.id,
                    detalhes: 'Mensagem aprovada/marcada em massa como enviada pela CS'
                };

                await supabase.from("mensagens_semanais").update({
                    enviado: true,
                    enviado_cs_em: agora,
                    historico_envios: [...(msg.historico_envios || []), novoHistorico]
                }).eq("id", msg.id);
            }

            toast({ title: "Sucesso", description: `${selectedMensagens.length} mensagens marcadas como enviadas.` });
            setSelectedMensagens([]);

            // Reload local UI softly without full refetch
            if (resumosData) {
                const newData = resumosData.map(resumo => {
                    if (resumo.mensagens.length > 0 && selectedMensagens.includes(resumo.mensagens[0].id)) {
                        return { ...resumo, mensagens: [{ ...resumo.mensagens[0], enviado: true, enviado_cs_em: agora }] };
                    }
                    return resumo;
                });
                setResumosData(newData);
            }
        } catch (error) {
            console.error("Erro em massa:", error);
            toast({ title: "Erro", description: "Falha ao aprovar em massa.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleMassDelete = async () => {
        if (!selectedMensagens.length) return;

        if (!window.confirm(`Você tem certeza que quer excluir ${selectedMensagens.length} resumos salvos? (Eles serão recriados apenas se clicar em Gerar novamente)`)) {
            return;
        }

        setLoading(true);
        try {
            await supabase.from("mensagens_semanais").delete().in("id", selectedMensagens);
            toast({ title: "Sucesso", description: `${selectedMensagens.length} mensagens excluídas.` });
            setSelectedMensagens([]);
            carregarDados(resumosData?.length && resumosData.length > 1 ? true : false); // refetch
        } catch (error) {
            console.error("Erro excluir em massa:", error);
            toast({ title: "Erro", description: "Falha ao excluir mensagens em massa.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleMassGerarIA = async () => {
        if (!selectedMensagens.length) return;
        setLoadingAi(true);
        let successCount = 0;

        try {
            const promessasIA = selectedMensagens.map(async (msgId) => {
                const resumoRecord = resumosData?.find(r => r.mensagens.length > 0 && r.mensagens[0].id === msgId);
                if (!resumoRecord) return false;

                const textoContextoRaw = gerarTextoWhatsapp(resumoRecord);

                const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
                    body: {
                        cliente_nome: resumoRecord.cliente.nome,
                        rascunho: textoContextoRaw,
                        tipo_resumo: 'sistema'
                    },
                });

                if (error) throw error;

                if (data?.mensagemFormato) {
                    const { error: updateError } = await supabase
                        .from("mensagens_semanais")
                        .update({ mensagem_ia: data.mensagemFormato })
                        .eq("id", msgId);

                    if (updateError) throw updateError;
                    return { id: msgId, texto: data.mensagemFormato };
                }
                return false;
            });

            const resultados = await Promise.allSettled(promessasIA);

            const updatesLocais: any[] = [];
            resultados.forEach(r => {
                if (r.status === 'fulfilled' && r.value) {
                    successCount++;
                    updatesLocais.push(r.value);
                }
            });

            if (successCount > 0) {
                toast({
                    title: "Inteligência Artificial",
                    description: `${successCount} mensagens geradas pela IA com sucesso!`
                });
                setSelectedMensagens([]);

                // Update local state without full reload
                if (resumosData) {
                    const newData = resumosData.map(resumo => {
                        const msg = resumo.mensagens[0];
                        if (msg) {
                            const update = updatesLocais.find(u => u.id === msg.id);
                            if (update) {
                                return { ...resumo, mensagens: [{ ...msg, mensagem_ia: update.texto }] };
                            }
                        }
                        return resumo;
                    });
                    setResumosData(newData);
                }
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
    }

    const handleSingleGerarIA = async (msgId: string, clienteNome: string, rascunho: string) => {
        setLoadingAi(true);
        try {
            const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
                body: {
                    cliente_nome: clienteNome,
                    rascunho: rascunho,
                    tipo_resumo: 'sistema'
                },
            });

            if (error) throw error;

            if (data?.mensagemFormato) {
                const { error: updateError } = await supabase
                    .from("mensagens_semanais")
                    .update({ mensagem_ia: data.mensagemFormato })
                    .eq("id", msgId);

                if (updateError) throw updateError;

                toast({
                    title: "Sucesso",
                    description: "Resumo com IA gerado e salvo."
                });

                // update local state
                if (resumosData) {
                    const newData = resumosData.map(resumo => {
                        const msg = resumo.mensagens[0];
                        if (msg && msg.id === msgId) {
                            return { ...resumo, mensagens: [{ ...msg, mensagem_ia: data.mensagemFormato }] };
                        }
                        return resumo;
                    });
                    setResumosData(newData);
                }
            }
        } catch (error) {
            toast({
                title: "Erro",
                description: "Falha ao gerar IA.",
                variant: "destructive"
            });
        } finally {
            setLoadingAi(false);
        }
    }

    const handleSingleAprovar = async (msgId: string, isAprovar: boolean) => {
        try {
            const updateData: any = {
                enviado: isAprovar,
                enviado_em: isAprovar ? new Date().toISOString() : null
            };

            const { error } = await supabase
                .from("mensagens_semanais")
                .update(updateData)
                .eq("id", msgId);

            if (error) throw error;

            toast({
                title: isAprovar ? "Aprovado!" : "Voltado para pendente!",
                description: `Resumo atualizado com sucesso.`,
            });

            // Update local state directly to be reactive
            if (resumosData) {
                const newData = resumosData.map(resumo => {
                    const msg = resumo.mensagens[0];
                    if (msg && msg.id === msgId) {
                        return { ...resumo, mensagens: [{ ...msg, ...updateData }] };
                    }
                    return resumo;
                });
                setResumosData(newData);
            }
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive"
            });
        }
    }

    const handleSelectRow = (msgId: string, checked: boolean) => {
        if (checked) {
            setSelectedMensagens(prev => [...prev, msgId]);
        } else {
            setSelectedMensagens(prev => prev.filter(id => id !== msgId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (!resumosData) return;
        if (checked) {
            const allIds = resumosData
                .filter(gerarTextoVazioCheck)
                .map(r => r.mensagens?.[0]?.id)
                .filter(Boolean);
            setSelectedMensagens(allIds as string[]);
        } else {
            setSelectedMensagens([]);
        }
    };

    const handleCopiarResumo = (resumoData: any) => {
        if (!resumoData) return;
        const msg = resumoData.mensagens?.[0]?.mensagem_ia || resumoData.mensagens?.[0]?.mensagem || gerarTextoWhatsapp(resumoData);
        navigator.clipboard.writeText(msg);
        toast({
            title: "Copiado!",
            description: "Resumo copiado para a área de transferência.",
        });
    };

    const handleCopiarTodos = () => {
        if (!resumosData || resumosData.length === 0) return;

        let textoFinal = "";
        let copiados = 0;

        resumosOrdenados.forEach((res) => {
            if (gerarTextoVazioCheck(res) && res.mensagens.length > 0) {
                const text = res.mensagens[0]?.mensagem_ia || res.mensagens[0]?.mensagem; // IA refines > plain Whatsapp
                textoFinal += `*Resumo Semanal - ${res.cliente.nome}*\n` + text + "\n-------------------------------------------------\n\n";
                copiados++;
            }
        });

        if (!textoFinal.trim()) {
            toast({ title: "Nenhum dado", description: `Nenhum dos clientes possuía mensagens preenchidas para copiar nesta semana.`, variant: "destructive" });
            return;
        }

        textoFinal = textoFinal.replace(/-+\s+$/, "").trim();

        navigator.clipboard.writeText(textoFinal);
        toast({ title: "Sucesso!", description: `Copiado os resumos consolidados de ${copiados} clientes com sucesso.` });
    };

    const countEnviadas = resumosData ? resumosData.filter(r => r.mensagens.length > 0 && r.mensagens[0].enviado).length : 0;
    const countPendentes = resumosData ? resumosData.filter(r => r.mensagens.length > 0 && !r.mensagens[0].enviado).filter(gerarTextoVazioCheck).length : 0;

    // Sort logic
    const handleOrdenar = (coluna: string) => {
        setOrdenacao(prev => ({
            coluna,
            direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc'
        }));
    };

    const IconeOrdenacao = ({ coluna }: { coluna: string }) => {
        if (ordenacao.coluna !== coluna) return <ArrowUpDown className="h-4 w-4 text-muted-foreground/30 ml-1" />;
        return ordenacao.direcao === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
    };

    const resumosOrdenados = useMemo(() => {
        if (!resumosData) return [];
        let ordenado = [...resumosData].filter(gerarTextoVazioCheck);

        ordenado.sort((a, b) => {
            let valorA = "";
            let valorB = "";

            if (ordenacao.coluna === "cliente_nome") {
                valorA = a.cliente.nome.toLowerCase();
                valorB = b.cliente.nome.toLowerCase();
            } else if (ordenacao.coluna === "status") {
                valorA = a.mensagens.length > 0 && a.mensagens[0].enviado ? "1" : "0";
                valorB = b.mensagens.length > 0 && b.mensagens[0].enviado ? "1" : "0";
            } else if (ordenacao.coluna === "semana") {
                valorA = weekStart;
                valorB = weekStart;
            }

            if (valorA < valorB) return ordenacao.direcao === 'asc' ? -1 : 1;
            if (valorA > valorB) return ordenacao.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        return ordenado;
    }, [resumosData, ordenacao, weekStart]);

    // Validate if the user is checking all currently available msg IDs
    const allValidIds = resumosOrdenados.map(r => r.mensagens?.[0]?.id).filter(Boolean) || [];
    const isAllSelected = allValidIds.length > 0 && selectedMensagens.length === allValidIds.length;

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Cliente</label>
                            <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os clientes...</SelectItem>
                                    {clientes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Semana</label>
                            <WeekPicker
                                value={weekStart}
                                onChange={setWeekStart}
                                placeholder="Selecione a semana"
                                className="w-full"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
                            <Button onClick={handleGerarResumo} disabled={loading || clienteSelecionado === "all"} variant="outline" className="w-full sm:w-auto">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarIcon className="w-4 h-4 mr-2" />}
                                Gerar Individual
                            </Button>

                            <Button onClick={handleGerarTodos} disabled={loading} className="w-full sm:w-auto bg-primary text-primary-foreground">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                                Gerar & Salvar Resumos
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {resumosData && resumosOrdenados.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gerados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{resumosOrdenados.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Enviados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{countEnviadas}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                            {resumosData && resumosOrdenados.length > 0 && (
                                <Button variant="outline" size="sm" onClick={handleCopiarTodos} className="h-8">
                                    <Copy className="h-4 w-4 mr-2" /> Copiar Todos ({resumosOrdenados.length})
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{countPendentes}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Bulk Actions Menu */}
            {selectedMensagens.length > 0 && (
                <div className="bg-muted border p-3 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="text-sm font-medium ml-2">
                        {selectedMensagens.length} mensagem(ns) selecionada(s)
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 bg-white" onClick={handleMassApprove} disabled={loading}>
                            <Check className="h-4 w-4 mr-2" />
                            Aprovar Selecionados
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-white" onClick={handleMassDelete} disabled={loading || loadingAi}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Resumos
                        </Button>
                        <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-white border-blue-200" onClick={handleMassGerarIA} disabled={loading || loadingAi}>
                            <Wand2 className={`h-4 w-4 mr-2 ${loadingAi ? 'animate-spin' : ''}`} />
                            Gerar IA p/ Selecionados
                        </Button>
                    </div>
                </div>
            )}

            {resumosData && resumosOrdenados.length > 0 && (
                <Card className="border-t-4 border-t-primary">
                    <CardHeader>
                        <CardTitle className="text-lg">Tabela de Resumos ({format(new Date(weekStart), "MMM/yyyy", { locale: ptBR })})</CardTitle>
                        <div className="text-sm text-muted-foreground">Listagem de mensagens criadas no sistema que reúnem as atividades de cada cliente na respectiva semana.</div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center items-center">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Selecionar todos"
                                        />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("cliente_nome")}>
                                        <div className="flex items-center gap-2">
                                            Cliente
                                            <IconeOrdenacao coluna="cliente_nome" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Gestor</TableHead>
                                    <TableHead>CS</TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 w-[120px]" onClick={() => handleOrdenar("semana")}>
                                        <div className="flex items-center gap-2">
                                            Semana
                                            <IconeOrdenacao coluna="semana" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Mensagem Gerada</TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleOrdenar("status")}>
                                        <div className="flex items-center">
                                            Status
                                            <IconeOrdenacao coluna="status" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resumosOrdenados.map((resumoData, index) => {
                                    const msgDb = resumoData.mensagens.length > 0 ? resumoData.mensagens[0] : null;
                                    const isEnviado = msgDb?.enviado || false;
                                    const rawText = msgDb ? (msgDb.mensagem_ia || msgDb.mensagem) : gerarTextoWhatsapp(resumoData);

                                    return (
                                        <TableRow key={index} className="hover:bg-muted/30">
                                            <TableCell className="align-middle text-center">
                                                {msgDb ? (
                                                    <Checkbox
                                                        checked={selectedMensagens.includes(msgDb.id)}
                                                        onCheckedChange={(checked) => handleSelectRow(msgDb.id, checked as boolean)}
                                                        aria-label={`Selecionar resumo de ${resumoData.cliente.nome}`}
                                                    />
                                                ) : (
                                                    <div className="text-xs text-muted-foreground ml-1" title="Clique em 'Gerar Todos' novamente para resolver.">⚠️</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{resumoData.cliente.nome}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {resumoData.alocacao?.gestor?.nome && (
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={resumoData.alocacao?.gestor?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${resumoData.alocacao?.gestor?.nome}`} />
                                                            <AvatarFallback className="text-[10px]">{resumoData.alocacao.gestor.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <span className="font-medium text-sm text-foreground">
                                                        {resumoData.alocacao?.gestor?.nome || "-"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {resumoData.cliente.primary_cs?.nome && (
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={resumoData.cliente.primary_cs?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${resumoData.cliente.primary_cs?.nome}`} />
                                                            <AvatarFallback className="text-[10px]">{resumoData.cliente.primary_cs.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <span className="font-medium text-sm text-foreground">
                                                        {resumoData.cliente.primary_cs?.nome || "-"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{format(new Date(weekStart), "dd/MM/yy", { locale: ptBR })}</TableCell>
                                            <TableCell className="max-w-md">
                                                <div className="truncate text-muted-foreground text-sm">
                                                    {previewMensagem(rawText)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={isEnviado ? "default" : "destructive"} className={isEnviado ? "bg-green-100 text-green-800" : ""}>
                                                    {isEnviado ? "Enviado" : "Pendente"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setMensagemSelecionada(resumoData)} title="Visualizar mensagem">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleCopiarResumo(resumoData)} title="Copiar resumo">
                                                        <Copy className="h-4 w-4" />
                                                    </Button>

                                                    {msgDb && (
                                                        <>
                                                            <div className="hidden md:flex items-center gap-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleSingleGerarIA(msgDb.id, resumoData.cliente.nome, gerarTextoWhatsapp(resumoData))}
                                                                    disabled={loadingAi}
                                                                    className={msgDb.mensagem_ia ? "text-blue-600 border-blue-200 hover:bg-blue-50" : ""}
                                                                    title={msgDb.mensagem_ia ? "Regerar IA" : "Gerar com IA"}
                                                                >
                                                                    <Wand2 className={`h-4 w-4 ${loadingAi ? 'animate-spin' : ''}`} />
                                                                </Button>
                                                                {(isCS || isAdmin) && (
                                                                    <>
                                                                        <Button variant="outline" size="sm" onClick={() => handleSingleAprovar(msgDb.id, true)} disabled={msgDb.enviado} className="text-green-600 hover:text-green-700" title="Aprovar/Marcar como enviado">
                                                                            <Check className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" onClick={() => handleSingleAprovar(msgDb.id, false)} disabled={!msgDb.enviado} className="text-red-600 hover:text-red-700" title="Marcar como pendente">
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {resumosData && resumosOrdenados.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border">
                    Nenhuma atividade registrada para os clientes pesquisados nesta semana.
                </div>
            )}

            {/* Modal de Visualização da Mensagem */}
            <Dialog open={!!mensagemSelecionada} onOpenChange={(open) => {
                if (!open) {
                    setMensagemSelecionada(null);
                    setRawTextExpanded(false);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto w-full">
                    <DialogHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                            <div className="space-y-1">
                                <DialogTitle className="text-xl">Resumo - {mensagemSelecionada?.cliente.nome}</DialogTitle>
                                <div className="text-sm text-muted-foreground">Visualize ou gere uma mensagem baseada na matriz de atividades semanais.</div>
                            </div>

                            {mensagemSelecionada && (() => {
                                const msgDb = mensagemSelecionada.mensagens.length > 0 ? mensagemSelecionada.mensagens[0] : null;
                                const isEnviado = msgDb?.enviado || false;

                                return (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleCopiarResumo(mensagemSelecionada)}>
                                            <Copy className="h-4 w-4 mr-1" /> Copiar Texto
                                        </Button>
                                        {msgDb && (
                                            <>
                                                <Button variant="outline" size="sm" onClick={() => marcarEnvio(mensagemSelecionada, true)} disabled={isEnviado} className="text-green-600">
                                                    <Check className="h-4 w-4 mr-1" /> Marcar Enviado
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => marcarEnvio(mensagemSelecionada, false)} disabled={!isEnviado} className="text-red-600">
                                                    <X className="h-4 w-4 mr-1" /> Marcar Pendente
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </DialogHeader>

                    {mensagemSelecionada && (() => {
                        const msgDb = mensagemSelecionada.mensagens.length > 0 ? mensagemSelecionada.mensagens[0] : null;
                        const textoRaw = msgDb ? msgDb.mensagem : gerarTextoWhatsapp(mensagemSelecionada);
                        const isEnviado = msgDb?.enviado || false;

                        return (
                            <div className="space-y-6 mt-2 pt-2">
                                {!isEnviado && (
                                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md border border-yellow-200">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Check className="h-4 w-4" />
                                            Ação Necessária
                                        </h4>
                                        <p className="text-sm mt-1">
                                            Este resumo ainda está pendente de envio. Após enviá-lo ao cliente no WhatsApp, clique no botão "Marcar Enviado" acima.
                                        </p>
                                    </div>
                                )}

                                {msgDb && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                                <Wand2 className="h-4 w-4" />
                                                Assistente IA de Resumos
                                            </h3>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => gerarVersaoIA(mensagemSelecionada)}
                                                disabled={loadingAi}
                                                className="bg-primary text-primary-foreground shadow-sm"
                                            >
                                                {loadingAi ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                                                ) : (
                                                    <><Wand2 className="h-4 w-4 mr-2" /> {msgDb.mensagem_ia ? "Regerar Texto com IA" : "✨ Gerar Texto com IA"}</>
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground mr-4">
                                            Crie uma mensagem amigável e consolidada para o cliente com a ajuda da Inteligência Artificial. A IA irá transformar a matriz de dados em um texto final otimizado.
                                        </p>

                                        {msgDb.mensagem_ia && (
                                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap text-sm border shadow-sm mt-4">
                                                {msgDb.mensagem_ia}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 mt-6">
                                    <Collapsible open={rawTextExpanded} onOpenChange={setRawTextExpanded}>
                                        <CollapsibleTrigger asChild>
                                            <div className="flex items-center justify-between cursor-pointer border-b pb-2 hover:bg-muted/50 p-2 rounded-t-md transition-colors">
                                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4" />
                                                    Registro Matriz de Atividades (Extração Bruta)
                                                </h3>
                                                {rawTextExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-2">
                                            <div className="bg-muted/50 p-4 rounded-b-lg whitespace-pre-wrap text-sm border-x border-b font-mono max-h-[400px] overflow-y-auto">

                                                {textoRaw}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
