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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const TIMEZONE = "America/Sao_Paulo";

export function MensagemSextouView() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [colaboradores, setColaboradores] = useState<any[]>([]);
    const [clienteSelecionado, setClienteSelecionado] = useState<string>("all");
    const [weekStart, setWeekStart] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [loadingAi, setLoadingAi] = useState(false);
    const [rawTextExpanded, setRawTextExpanded] = useState(false);
    const [resumosData, setResumosData] = useState<any[] | null>(null);
    const [selectedMensagens, setSelectedMensagens] = useState<string[]>([]);
    const [mensagemSelecionada, setMensagemSelecionada] = useState<any>(null);
    const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'cliente_nome', direcao: 'asc' });
    const { toast } = useToast();
    const { isCS, isAdmin } = useUserPermissions();

    // Auto-polling for IA generation
    useEffect(() => {
        if (!mensagemSelecionada) return;
        const msgDb = mensagemSelecionada.mensagens?.[0];
        if (!msgDb || msgDb.mensagem_ia) return;

        const interval = setInterval(async () => {
            const { data } = await supabase
                .from('mensagens_semanais')
                .select('id, mensagem_ia')
                .eq('id', msgDb.id)
                .single();

            if (data?.mensagem_ia) {
                clearInterval(interval);
                setMensagemSelecionada((prev: any) => ({
                    ...prev,
                    mensagens: [{ ...msgDb, mensagem_ia: data.mensagem_ia }]
                }));
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [mensagemSelecionada]);

    // Initialize week and fetch base data
    useEffect(() => {
        const now = toZonedTime(new Date(), TIMEZONE);
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        setWeekStart(format(currentWeekStart, "yyyy-MM-dd"));
        fetchBase();
    }, []);

    const fetchBase = async () => {
        const [{ data: clientesData }, { data: colabData }] = await Promise.all([
            supabase
                .from("clientes")
                .select(`
                    id, nome, slug, primary_gestor_user_id, primary_cs_user_id,
                    primary_cs:colaboradores!clientes_primary_cs_user_id_fkey(id, nome, avatar_url),
                    gestor:colaboradores!clientes_primary_gestor_user_id_fkey(id, nome, avatar_url)
                `)
                .eq("is_active", true)
                .is("deleted_at", null)
                .order("nome"),
            supabase
                .from("colaboradores")
                .select("id, nome, user_id, avatar_url")
                .eq("ativo", true)
                .order("nome")
        ]);
        setClientes(clientesData || []);
        setColaboradores(colabData || []);
    };

    // ---- Helpers ----

    const gerarTextoVazioCheck = (resumoData: any) =>
        (resumoData.tarefas?.length > 0) ||
        (resumoData.tarefasPendentes?.length > 0) ||
        (resumoData.lancamentos?.length > 0) ||
        (resumoData.reunioes?.length > 0) ||
        (resumoData.pautas?.length > 0) ||
        (resumoData.gravacoes?.length > 0) ||
        (resumoData.diario?.length > 0) ||
        (resumoData.orcamentos?.length > 0);

    const gerarTextoWhatsapp = (resumoData: any) => {
        const { cliente, diario, reunioes, pautas, gravacoes, lancamentos, orcamentos, tarefas, tarefasPendentes } = resumoData;

        const stripPrefix = (title: string) => {
            if (!title) return title;
            const sep = title.indexOf(' | ');
            return sep > 0 ? title.substring(sep + 3).trim() : title.trim();
        };

        const seen = new Set<string>();
        const dedup = (arr: any[]) => arr.filter(t => {
            const key = stripPrefix(t.title || '').toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const tarefasLimpas = dedup(tarefas || []);
        const tarefasPendentesLimpas = dedup(tarefasPendentes || []);

        let texto = `*Resumo Sextou - ${cliente.nome}* 🎉\n\n`;

        if (tarefasLimpas.length > 0) {
            texto += `✅ *O que fizemos esta semana:*\n`;
            tarefasLimpas.forEach((t: any) => { texto += `- ${stripPrefix(t.title)}\n`; });
            texto += `\n`;
        }
        if (tarefasPendentesLimpas.length > 0) {
            texto += `⏳ *Em andamento:*\n`;
            tarefasPendentesLimpas.forEach((t: any) => { texto += `- ${stripPrefix(t.title)}\n`; });
            texto += `\n`;
        }
        if (lancamentos?.length > 0) {
            texto += `🚀 *Lançamentos:*\n`;
            lancamentos.forEach((l: any) => { texto += `- ${l.nome_lancamento} (${l.status_lancamento?.replace(/_/g, " ")})\n`; });
            texto += `\n`;
        }
        if (orcamentos?.length > 0) {
            texto += `🎯 *Funis Ativos:*\n`;
            orcamentos.forEach((o: any) => { texto += `- ${o.nome_funil}${o.etapa_funil ? ` (${o.etapa_funil})` : ''}\n`; });
            texto += `\n`;
        }
        if ((reunioes?.length > 0) || (gravacoes?.length > 0)) {
            texto += `🎥 *Reuniões:*\n`;
            reunioes?.forEach((r: any) => { texto += `- ${r.titulo}\n`; });
            gravacoes?.forEach((g: any) => { texto += `- ${g.titulo}\n`; });
            texto += `\n`;
        }
        if (pautas?.length > 0) {
            texto += `📋 *Anotações de Reuniões:*\n`;
            pautas.forEach((p: any) => {
                texto += `- ${p.titulo_reuniao} (${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')})\n`;
                (p.blocos || [])
                    .filter((b: any) => b.titulo && !['titulo', 'participantes'].includes(b.tipo))
                    .forEach((b: any) => { texto += `  → ${b.titulo}\n`; });
            });
            texto += `\n`;
        }
        if (diario?.length > 0) {
            texto += `📝 *Diário de Bordo:*\n`;
            diario.forEach((d: any) => { texto += `- ${d.texto}\n`; });
            texto += `\n`;
        }

        return texto.trim();
    };

    const previewMensagem = (text: string) =>
        text?.length > 120 ? text.substring(0, 120) + "..." : text;

    // ---- Data loading ----

    const carregarDados = async (todos: boolean) => {
        if (!weekStart) {
            toast({ title: "Erro", description: "Selecione uma semana.", variant: "destructive" });
            return;
        }

        const clientesParaGerar = todos
            ? clientes
            : clientes.filter(c => c.id === clienteSelecionado);

        if (clientesParaGerar.length === 0) {
            toast({ title: "Aviso", description: "Nenhum cliente selecionado.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Use same timezone handling as original
            const start = new Date(`${weekStart}T00:00:00-03:00`);
            const end = endOfWeek(start, { weekStartsOn: 1 });
            const endDate = new Date(end.setHours(23, 59, 59, 999));
            const endStr = format(endDate, "yyyy-MM-dd");

            const isPautaNaSemana = (p: any) => {
                const pDate = new Date(p.ano, p.mes - 1, p.dia);
                return pDate >= start && pDate <= endDate;
            };

            const clienteIds = clientesParaGerar.map(c => c.id);

            const [
                resMensagens,
                resDiario,
                resReunioes,
                resPautas,
                resGravacoes,
                resLancamentos,
                resOrcamentos,
            ] = await Promise.all([
                // Use .eq on semana_referencia matching original
                supabase.from("mensagens_semanais")
                    .select("*")
                    .in("cliente_id", clienteIds)
                    .eq("semana_referencia", weekStart),

                supabase.from("diario_bordo").select("texto, created_at, autor_id, cliente_id")
                    .in("cliente_id", clienteIds)
                    .gte("created_at", start.toISOString())
                    .lte("created_at", endDate.toISOString())
                    .order("created_at", { ascending: true }),

                supabase.from("reunioes").select("titulo, descricao, cliente_id, data_hora")
                    .in("cliente_id", clienteIds)
                    .gte("data_hora", start.toISOString())
                    .lte("data_hora", endDate.toISOString()),

                supabase.from("reunioes_documentos")
                    .select(`titulo_reuniao, cliente_id, dia, mes, ano, reunioes_blocos(titulo, tipo, ordem)`)
                    .in("cliente_id", clienteIds)
                    .eq("ano", new Date(weekStart).getFullYear())
                    .in("mes", [new Date(start).getMonth() + 1, new Date(endDate).getMonth() + 1]),

                supabase.from("gravacoes").select("titulo, created_at, cliente_id")
                    .in("cliente_id", clienteIds)
                    .gte("created_at", start.toISOString())
                    .lte("created_at", endDate.toISOString()),

                supabase.from("lancamentos").select("nome_lancamento, status_lancamento, cliente_id")
                    .eq("ativo", true)
                    .not("status_lancamento", "in", '("finalizado","cancelado")')
                    .in("cliente_id", clienteIds),

                supabase.from("orcamentos_funil").select("nome_funil, etapa_funil, cliente_id, ativo")
                    .eq("ativo", true)
                    .in("cliente_id", clienteIds),
            ]);

            // Tasks: use "tasks" table like original, per client
            const tarefasResult = await Promise.all(clientesParaGerar.map(cliente =>
                Promise.all([
                    supabase.from("tasks")
                        .select("title, completed_at, description, cliente_id")
                        .eq("completed", true)
                        .eq("cliente_id", cliente.id)
                        .gte("completed_at", start.toISOString())
                        .lte("completed_at", endDate.toISOString()),
                    supabase.from("tasks")
                        .select("title, description, cliente_id")
                        .eq("completed", false)
                        .eq("cliente_id", cliente.id)
                ])
            ));

            // Separate into sextou-tagged vs other records
            const todasMensagens = resMensagens.data || [];
            const isSextouRecord = (x: any) => {
                const hs = Array.isArray(x.historico_envios) ? x.historico_envios : [];
                return hs.some((h: any) => h.tipo === 'sistema_gerado' || h.tipo === 'sextou_gerado');
            };

            const formataResumos = clientesParaGerar.map((cliente, idx) => {
                // Find any existing record for this client this week
                const existingAll = todasMensagens.filter(x => x.cliente_id === cliente.id);
                const existingSextou = existingAll.filter(isSextouRecord);

                // Use sextou record if exists, otherwise the first available record
                const m = existingSextou.length > 0 ? existingSextou : [];

                // Resolve gestor: try FK join first, then fallback to colaboradores by user_id
                let gestor_obj = Array.isArray(cliente.gestor) ? cliente.gestor[0] : cliente.gestor;
                if (!gestor_obj && cliente.primary_gestor_user_id) {
                    gestor_obj = colaboradores.find(c => c.user_id === cliente.primary_gestor_user_id) || null;
                }

                // Resolve CS: try FK join first, then fallback
                let primary_cs_obj = Array.isArray(cliente.primary_cs) ? cliente.primary_cs[0] : cliente.primary_cs;
                if (!primary_cs_obj && cliente.primary_cs_user_id) {
                    primary_cs_obj = colaboradores.find(c => c.user_id === cliente.primary_cs_user_id) || null;
                }

                const d = (resDiario.data || []).filter(x => x.cliente_id === cliente.id);
                const r = (resReunioes.data || []).filter((x: any) => x.cliente_id === cliente.id);
                const p = (resPautas.data || []).filter((x: any) => x.cliente_id === cliente.id && isPautaNaSemana(x)).map((p: any) => ({
                    ...p,
                    blocos: Array.isArray(p.reunioes_blocos) ? p.reunioes_blocos.sort((a: any, b: any) => a.ordem - b.ordem) : []
                }));
                const g = (resGravacoes.data || []).filter((x: any) => x.cliente_id === cliente.id);
                const l = (resLancamentos.data || []).filter((x: any) => x.cliente_id === cliente.id);
                const o = (resOrcamentos.data || []).filter((x: any) => x.cliente_id === cliente.id);

                const [tarefasConcluidas, tarefasAbertas] = tarefasResult[idx];
                const t = tarefasConcluidas.data || [];
                const tp = tarefasAbertas.data || [];

                return {
                    cliente,
                    periodo: { start, end: endDate },
                    mensagens: m,
                    diario: d,
                    reunioes: r,
                    pautas: p,
                    gravacoes: g,
                    lancamentos: l,
                    orcamentos: o,
                    tarefas: t,
                    tarefasPendentes: tp,
                    alocacao: { gestor: gestor_obj, cs: primary_cs_obj },
                    // Track what needs to happen
                    _existing: existingAll[0] || null,
                    _hasSextou: existingSextou.length > 0,
                };
            });

            // Process saves: ONLY INSERT new records. NEVER touch existing traffic records.
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;
            const agora = new Date().toISOString();

            // --- CLEANUP: revert any traffic records that were incorrectly tagged as sextou ---
            // A corrupted record has historico_envios with a sextou tag BUT mensagem_ia looks like traffic
            // Detection: has sistema_gerado with our specific detalhes AND has other historico entries
            const corruptedRecords = todasMensagens.filter(x => {
                const hs = Array.isArray(x.historico_envios) ? x.historico_envios : [];
                const hasSextouTag = hs.some((h: any) => h.detalhes === 'Mensagem Sextou gerada automaticamente.');
                const hasOtherEntries = hs.filter((h: any) => h.detalhes !== 'Mensagem Sextou gerada automaticamente.').length > 0;
                return hasSextouTag && hasOtherEntries; // Only ones that had pre-existing entries
            });

            for (const corrupted of corruptedRecords) {
                const cleanedHistorico = (corrupted.historico_envios || []).filter(
                    (h: any) => h.detalhes !== 'Mensagem Sextou gerada automaticamente.'
                );
                await supabase.from('mensagens_semanais')
                    .update({ historico_envios: cleanedHistorico })
                    .eq('id', corrupted.id);
                console.log(`🔧 Revertido registro de tráfego corrompido: ${corrupted.id}`);
                todasMensagens.splice(todasMensagens.indexOf(corrupted), 1);
            }
            // ---

            const gerarIA = (msgId: string, clienteNome: string, textoContexto: string) => {
                supabase.functions.invoke('formatar-mensagem-semanal', {
                    body: { cliente_nome: clienteNome, rascunho: textoContexto, tipo_resumo: 'sextou' }
                }).then(({ data: iaData, error: iaError }) => {
                    if (!iaError && iaData?.mensagemFormato) {
                        supabase.from('mensagens_semanais')
                            .update({ mensagem_ia: iaData.mensagemFormato })
                            .eq('id', msgId)
                            .then(() => console.log(`✅ IA Sextou para ${clienteNome}`));
                    } else {
                        console.error(`❌ IA erro para ${clienteNome}:`, iaError);
                    }
                });
            };

            for (const resumo of formataResumos) {
                if (!gerarTextoVazioCheck(resumo)) continue;

                const textoBase = gerarTextoWhatsapp(resumo);
                const sextouHistEntry = {
                    tipo: 'sistema_gerado',
                    data: agora,
                    user_id: userId,
                    detalhes: 'Mensagem Sextou gerada automaticamente.'
                };

                // Reload the sextou status after cleanup
                const existingAllNow = todasMensagens.filter(x => x.cliente_id === resumo.cliente.id);
                const existingSextouNow = existingAllNow.filter(isSextouRecord);

                if (existingSextouNow.length > 0) {
                    // Has existing sextou record — update the resumo.mensagens and generate IA if missing
                    resumo.mensagens = existingSextouNow;
                    const msgDb = existingSextouNow[0];
                    if (!msgDb.mensagem_ia) {
                        gerarIA(msgDb.id, resumo.cliente.nome, textoBase);
                    }
                } else if (existingAllNow.length === 0) {
                    // Truly no record for this client + week — do INSERT
                    if (!resumo.alocacao?.gestor?.id) {
                        console.warn(`⚠️ Sem gestor para ${resumo.cliente.nome}, pulando.`);
                        continue;
                    }

                    const { data: inserted, error: insertError } = await supabase
                        .from('mensagens_semanais')
                        .insert({
                            cliente_id: resumo.cliente.id,
                            gestor_id: resumo.alocacao.gestor.id,
                            cs_id: resumo.alocacao.cs?.id || null,
                            semana_referencia: weekStart,
                            mensagem: textoBase,
                            enviado: false,
                            created_by: userId,
                            historico_envios: [sextouHistEntry]
                        })
                        .select()
                        .single();

                    if (!insertError && inserted) {
                        resumo.mensagens = [inserted];
                        gerarIA(inserted.id, resumo.cliente.nome, textoBase);
                    } else {
                        console.warn(`⚠️ Não foi possível criar Sextou para ${resumo.cliente.nome}:`, insertError?.message);
                    }
                } else {
                    // Has existing traffic record only — SKIP, never corrupt it
                    console.log(`⏭️ ${resumo.cliente.nome} tem registro de tráfego, pulando Sextou.`);
                    resumo.mensagens = []; // Keep showing ⚠️ so user knows
                }
            }

            // Clean up internal tracking fields
            formataResumos.forEach((r: any) => { delete r._existing; delete r._hasSextou; });

            setResumosData([...formataResumos]);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao buscar dados.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleGerarResumo = () => carregarDados(false);
    const handleGerarTodos = () => carregarDados(true);

    // ---- IA ----

    const gerarVersaoIA = async (resumoData: any) => {
        const msgDb = resumoData.mensagens?.[0];
        if (!msgDb) {
            toast({ title: "Erro", description: "Resumo não salvo no banco.", variant: "destructive" });
            return;
        }

        setLoadingAi(true);
        try {
            const textoContextoRaw = gerarTextoWhatsapp(resumoData);
            const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
                body: {
                    cliente_nome: resumoData.cliente.nome,
                    rascunho: textoContextoRaw,
                    tipo_resumo: 'sextou'
                }
            });

            if (error) throw error;

            const textoGerado = data?.mensagemFormato;

            if (textoGerado) {
                await supabase.from('mensagens_semanais').update({ mensagem_ia: textoGerado }).eq('id', msgDb.id);
                const mensagemAtualizada = { ...msgDb, mensagem_ia: textoGerado };

                if (resumosData) {
                    const newData = resumosData.map(resumo =>
                        resumo.cliente.id === resumoData.cliente.id
                            ? { ...resumo, mensagens: [mensagemAtualizada] }
                            : resumo
                    );
                    setResumosData(newData);
                }

                if (mensagemSelecionada?.cliente.id === resumoData.cliente.id) {
                    setMensagemSelecionada({ ...mensagemSelecionada, mensagens: [mensagemAtualizada] });
                }

                toast({ title: "Sucesso!", description: "Mensagem Sextou gerada." });
            }
        } catch (error: any) {
            toast({ title: "Erro na geração", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAi(false);
        }
    };

    // Opens modal and immediately generates IA if needed
    const abrirModalComIA = async (resumoData: any) => {
        setMensagemSelecionada(resumoData);
        const msgDb = resumoData.mensagens?.[0];
        if (msgDb && !msgDb.mensagem_ia) {
            await gerarVersaoIA(resumoData);
        }
    };

    // ---- Marking sent ----

    const marcarEnvio = async (resumoData: any, enviado: boolean) => {
        const msgDb = resumoData.mensagens?.[0];
        if (!msgDb) return;

        try {
            const { data: userData } = await supabase.auth.getUser();
            const agora = new Date().toISOString();
            const novoHistorico = {
                tipo: enviado ? 'sextou_enviado' : 'sextou_pendente',
                data: agora,
                user_id: userData.user?.id,
                detalhes: enviado ? 'Mensagem Sextou marcada como enviada.' : 'Marcada como pendente.'
            };

            const { data, error } = await supabase.from("mensagens_semanais")
                .update({
                    enviado,
                    enviado_cs_em: enviado ? agora : null,
                    historico_envios: [...(msgDb.historico_envios || []), novoHistorico]
                })
                .eq("id", msgDb.id)
                .select()
                .single();

            if (error) throw error;

            toast({ title: "Sucesso", description: `Marcado como ${enviado ? 'enviado' : 'pendente'}.` });

            if (resumosData) {
                const newData = resumosData.map(r =>
                    r.cliente.id === resumoData.cliente.id ? { ...r, mensagens: [data] } : r
                );
                setResumosData(newData);
            }
            if (mensagemSelecionada?.cliente.id === resumoData.cliente.id) {
                setMensagemSelecionada({ ...mensagemSelecionada, mensagens: [data] });
            }
        } catch (error: any) {
            toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" });
        }
    };

    // ---- Mass actions ----

    const handleMassApprove = async () => {
        if (!selectedMensagens.length) return;
        setLoading(true);
        try {
            const agora = new Date().toISOString();
            for (const id of selectedMensagens) {
                await supabase.from("mensagens_semanais").update({
                    enviado: true,
                    enviado_cs_em: agora,
                }).eq("id", id);
            }
            toast({ title: "Sucesso", description: `${selectedMensagens.length} mensagens marcadas como enviadas.` });
            setSelectedMensagens([]);
            handleGerarTodos();
        } finally {
            setLoading(false);
        }
    };

    const handleMassDelete = async () => {
        if (!selectedMensagens.length) return;
        if (!window.confirm(`Excluir ${selectedMensagens.length} resumo(s)?`)) return;
        setLoading(true);
        try {
            await supabase.from("mensagens_semanais").delete().in("id", selectedMensagens);
            toast({ title: "Sucesso", description: "Resumos excluídos." });
            setSelectedMensagens([]);
            handleGerarTodos();
        } finally {
            setLoading(false);
        }
    };

    const handleMassGerarIA = async () => {
        if (!resumosData || !selectedMensagens.length) return;
        setLoadingAi(true);
        for (const resumo of resumosData) {
            const msgDb = resumo.mensagens?.[0];
            if (msgDb && selectedMensagens.includes(msgDb.id)) {
                await gerarVersaoIA(resumo);
            }
        }
        setLoadingAi(false);
    };

    const handleSingleGerarIA = async (msgId: string, clienteNome: string, textoBase: string) => {
        setLoadingAi(true);
        try {
            const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
                body: { cliente_nome: clienteNome, rascunho: textoBase, tipo_resumo: 'sextou' }
            });
            if (error) throw error;
            if (data?.mensagemFormato) {
                await supabase.from('mensagens_semanais').update({ mensagem_ia: data.mensagemFormato }).eq('id', msgId);
                if (resumosData) {
                    const newData = resumosData.map(r => {
                        if (r.mensagens?.[0]?.id === msgId) {
                            return { ...r, mensagens: [{ ...r.mensagens[0], mensagem_ia: data.mensagemFormato }] };
                        }
                        return r;
                    });
                    setResumosData(newData);
                }
                toast({ title: "IA gerada!" });
            }
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        } finally {
            setLoadingAi(false);
        }
    };

    const handleSingleAprovar = async (msgId: string, enviado: boolean) => {
        const resumo = resumosData?.find(r => r.mensagens?.[0]?.id === msgId);
        if (resumo) await marcarEnvio(resumo, enviado);
    };

    // ---- Selection ----

    const handleSelectRow = (msgId: string, checked: boolean) => {
        setSelectedMensagens(prev => checked ? [...prev, msgId] : prev.filter(id => id !== msgId));
    };

    const handleSelectAll = (checked: boolean) => {
        if (!resumosData) return;
        if (checked) {
            const allIds = resumosData.filter(gerarTextoVazioCheck).map(r => r.mensagens?.[0]?.id).filter(Boolean);
            setSelectedMensagens(allIds as string[]);
        } else {
            setSelectedMensagens([]);
        }
    };

    const handleCopiarResumo = (resumoData: any) => {
        const msg = resumoData.mensagens?.[0]?.mensagem_ia || resumoData.mensagens?.[0]?.mensagem || gerarTextoWhatsapp(resumoData);
        navigator.clipboard.writeText(msg);
        toast({ title: "Copiado!", description: "Mensagem copiada." });
    };

    // ---- Sort ----

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
        return [...resumosData].filter(gerarTextoVazioCheck).sort((a, b) => {
            const getVal = (r: any) => {
                if (ordenacao.coluna === "cliente_nome") return r.cliente.nome.toLowerCase();
                if (ordenacao.coluna === "status") return r.mensagens?.[0]?.enviado ? "1" : "0";
                return weekStart;
            };
            const vA = getVal(a), vB = getVal(b);
            if (vA < vB) return ordenacao.direcao === 'asc' ? -1 : 1;
            if (vA > vB) return ordenacao.direcao === 'asc' ? 1 : -1;
            return 0;
        });
    }, [resumosData, ordenacao, weekStart]);

    const countEnviadas = resumosData?.filter(r => r.mensagens?.[0]?.enviado).length ?? 0;
    const countPendentes = resumosData?.filter(r => r.mensagens.length > 0 && !r.mensagens[0].enviado).filter(gerarTextoVazioCheck).length ?? 0;
    const allValidIds = resumosOrdenados.map(r => r.mensagens?.[0]?.id).filter(Boolean);
    const isAllSelected = allValidIds.length > 0 && selectedMensagens.length === allValidIds.length;

    // ---- Render ----

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Cliente</label>
                            <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os clientes...</SelectItem>
                                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Semana</label>
                            <WeekPicker value={weekStart} onChange={setWeekStart} placeholder="Selecione a semana" className="w-full" />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
                            <Button onClick={handleGerarResumo} disabled={loading || clienteSelecionado === "all"} variant="outline">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarIcon className="w-4 h-4 mr-2" />}
                                Gerar Individual
                            </Button>
                            <Button onClick={handleGerarTodos} disabled={loading} className="bg-primary text-primary-foreground">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                                Gerar & Salvar Mensagens Sextou
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {resumosData && resumosOrdenados.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Total Gerados</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{resumosOrdenados.length}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Enviados 🎉</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-600">{countEnviadas}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold text-red-600">{countPendentes}</div></CardContent>
                    </Card>
                </div>
            )}

            {selectedMensagens.length > 0 && (
                <div className="bg-muted border p-3 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="text-sm font-medium ml-2">{selectedMensagens.length} mensagem(ns) selecionada(s)</div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-green-600 bg-white" onClick={handleMassApprove} disabled={loading}>
                            <Check className="h-4 w-4 mr-2" /> Aprovar Selecionados
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 bg-white" onClick={handleMassDelete} disabled={loading}>
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </Button>
                        <Button variant="outline" size="sm" className="text-blue-600 bg-white border-blue-200" onClick={handleMassGerarIA} disabled={loading || loadingAi}>
                            <Wand2 className={`h-4 w-4 mr-2 ${loadingAi ? 'animate-spin' : ''}`} /> Gerar IA p/ Selecionados
                        </Button>
                    </div>
                </div>
            )}

            {resumosData && resumosOrdenados.length > 0 && (
                <Card className="border-t-4 border-t-orange-500">
                    <CardHeader>
                        <CardTitle className="text-lg">🎉 Mensagens Sextou ({format(new Date(weekStart), "MMM/yyyy", { locale: ptBR })})</CardTitle>
                        <div className="text-sm text-muted-foreground">Resumo semanal de atividades para envio ao cliente toda sexta-feira.</div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center">
                                        <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Selecionar todos" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("cliente_nome")}>
                                        <div className="flex items-center gap-2">Cliente <IconeOrdenacao coluna="cliente_nome" /></div>
                                    </TableHead>
                                    <TableHead>Gestor</TableHead>
                                    <TableHead>CS</TableHead>
                                    <TableHead className="w-[120px]">Semana</TableHead>
                                    <TableHead>Mensagem Gerada</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleOrdenar("status")}>
                                        <div className="flex items-center">Status <IconeOrdenacao coluna="status" /></div>
                                    </TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resumosOrdenados.map((resumoData, index) => {
                                    const msgDb = resumoData.mensagens?.[0] ?? null;
                                    const isEnviado = msgDb?.enviado || false;
                                    const rawText = msgDb ? (msgDb.mensagem_ia || msgDb.mensagem) : gerarTextoWhatsapp(resumoData);

                                    return (
                                        <TableRow key={index} className="hover:bg-muted/30">
                                            <TableCell className="align-middle text-center">
                                                {msgDb ? (
                                                    <Checkbox
                                                        checked={selectedMensagens.includes(msgDb.id)}
                                                        onCheckedChange={(checked) => handleSelectRow(msgDb.id, checked as boolean)}
                                                    />
                                                ) : <div className="text-xs text-muted-foreground">⚠️</div>}
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
                                                    <span className="font-medium text-sm">{resumoData.alocacao?.gestor?.nome || "-"}</span>
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
                                                    <span className="font-medium text-sm">{resumoData.cliente.primary_cs?.nome || "-"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{format(new Date(weekStart), "dd/MM/yy", { locale: ptBR })}</TableCell>
                                            <TableCell className="max-w-md">
                                                <div className="truncate text-muted-foreground text-sm">{previewMensagem(rawText)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={isEnviado ? "default" : "destructive"} className={isEnviado ? "bg-green-100 text-green-800" : ""}>
                                                    {isEnviado ? "🎉 Enviado" : "Pendente"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => abrirModalComIA(resumoData)} title="Visualizar mensagem">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleCopiarResumo(resumoData)} title="Copiar">
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    {msgDb && (
                                                        <div className="hidden md:flex items-center gap-1">
                                                            <Button variant="outline" size="sm"
                                                                onClick={() => handleSingleGerarIA(msgDb.id, resumoData.cliente.nome, gerarTextoWhatsapp(resumoData))}
                                                                disabled={loadingAi}
                                                                className={msgDb.mensagem_ia ? "text-blue-600 border-blue-200 hover:bg-blue-50" : ""}
                                                                title={msgDb.mensagem_ia ? "Regerar IA" : "Gerar com IA"}
                                                            >
                                                                <Wand2 className={`h-4 w-4 ${loadingAi ? 'animate-spin' : ''}`} />
                                                            </Button>
                                                            {(isCS || isAdmin) && (
                                                                <>
                                                                    <Button variant="outline" size="sm" onClick={() => handleSingleAprovar(msgDb.id, true)} disabled={msgDb.enviado} className="text-green-600" title="Marcar como enviado">
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" onClick={() => handleSingleAprovar(msgDb.id, false)} disabled={!msgDb.enviado} className="text-red-600" title="Marcar como pendente">
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
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
                    Nenhuma atividade registrada nesta semana.
                </div>
            )}

            {/* Modal */}
            <Dialog open={!!mensagemSelecionada} onOpenChange={(open) => { if (!open) { setMensagemSelecionada(null); setRawTextExpanded(false); } }}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto w-full">
                    <DialogHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                            <div className="space-y-1">
                                <DialogTitle className="text-xl">🎉 Mensagem Sextou — {mensagemSelecionada?.cliente.nome}</DialogTitle>
                                <div className="text-sm text-muted-foreground">Mensagem semanal de atividades para envio ao cliente.</div>
                            </div>

                            {mensagemSelecionada && (() => {
                                const msgDb = mensagemSelecionada.mensagens?.[0];
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
                        const msgDb = mensagemSelecionada.mensagens?.[0];
                        const textoRaw = msgDb?.mensagem || gerarTextoWhatsapp(mensagemSelecionada);
                        const isEnviado = msgDb?.enviado || false;

                        return (
                            <div className="space-y-6 mt-2 pt-2">
                                {!isEnviado && (
                                    <div className="bg-orange-50 text-orange-800 p-4 rounded-md border border-orange-200">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Check className="h-4 w-4" /> Ação Necessária
                                        </h4>
                                        <p className="text-sm mt-1">
                                            Esta Mensagem Sextou ainda está pendente. Após enviá-la ao cliente no WhatsApp, clique em "Marcar Enviado".
                                        </p>
                                    </div>
                                )}

                                {msgDb && (
                                    <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                                                <Wand2 className="h-4 w-4" /> Mensagem para o Cliente (IA)
                                            </h3>
                                        </div>

                                        {msgDb.mensagem_ia ? (
                                            <div className="space-y-3">
                                                <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap text-sm border shadow-sm leading-relaxed">
                                                    {msgDb.mensagem_ia}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCopiarResumo(mensagemSelecionada)}>
                                                        <Copy className="h-4 w-4 mr-2" /> Copiar para WhatsApp
                                                    </Button>
                                                    <Button variant="outline" onClick={() => gerarVersaoIA(mensagemSelecionada)} disabled={loadingAi} className="text-orange-700 border-orange-200">
                                                        {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-1" /> Reescrever</>}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                                                <Loader2 className="h-8 w-8 animate-spin text-orange-500/60" />
                                                <p className="text-sm text-center font-medium">Gerando Mensagem Sextou com IA...</p>
                                                <p className="text-xs text-center">Isso leva alguns segundos</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 mt-6">
                                    <Collapsible open={rawTextExpanded} onOpenChange={setRawTextExpanded}>
                                        <CollapsibleTrigger asChild>
                                            <div className="flex items-center justify-between cursor-pointer border-b pb-2 hover:bg-muted/50 p-2 rounded-t-md transition-colors">
                                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4" /> Extração Bruta de Atividades
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
