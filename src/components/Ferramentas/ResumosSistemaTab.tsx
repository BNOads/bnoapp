import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeekPicker } from "@/components/ui/WeekPicker";
import { supabase } from "@/integrations/supabase/client";
import { toZonedTime } from "date-fns-tz";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, CheckCircle2, MessageSquare, Video, Rocket, Calendar as CalendarIcon, Users, Eye, Check, X, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function ResumosSistemaTab() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [clienteSelecionado, setClienteSelecionado] = useState<string>("all");
    const [weekStart, setWeekStart] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [resumosData, setResumosData] = useState<any[] | null>(null);
    const { toast } = useToast();

    // Modal state for viewing a message
    const [mensagemSelecionada, setMensagemSelecionada] = useState<any>(null);

    const TIMEZONE = "America/Sao_Paulo";

    useEffect(() => {
        // Carregar clientes ativos
        supabase
            .from("clientes")
            .select("id, nome, slug")
            .eq("ativo", true)
            .order("nome")
            .then(({ data }) => setClientes(data || []));

        // Set semana atual
        const now = toZonedTime(new Date(), TIMEZONE);
        const start = startOfWeek(now, { weekStartsOn: 1 });
        setWeekStart(format(start, "yyyy-MM-dd"));
    }, []);

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

        try {
            const clientesParaGerar = gerarParaTodos
                ? clientes
                : clientes.filter(c => c.id === clienteSelecionado);

            if (clientesParaGerar.length === 0) throw new Error("Nenhum cliente habilitado encontrado.");

            const start = new Date(`${weekStart}T00:00:00-03:00`);
            const end = endOfWeek(start, { weekStartsOn: 1 });
            const endDate = new Date(end.setHours(23, 59, 59, 999));

            const startStr = start.toISOString();
            const endStr = endDate.toISOString();

            // 1. Mensagens Semanais
            let qMensagens = supabase.from("mensagens_semanais").select("*").gte("created_at", startStr).lte("created_at", endStr);
            // 2. Diário de Bordo
            let qDiario = supabase.from("diario_bordo").select("texto, created_at, autor_id, cliente_id").gte("created_at", startStr).lte("created_at", endStr).order("created_at", { ascending: true });
            // 3. Reuniões e Gravações
            let qReunioes = supabase.from("reunioes").select("titulo, descricao, data, cliente_id").gte("data", startStr).lte("data", endStr);
            let qGravacoes = supabase.from("gravacoes").select("titulo, created_at, cliente_id").gte("created_at", startStr).lte("created_at", endStr);
            // 4. Lançamentos Ativos (não pode ser finalizado ou cancelado)
            let qLancamentos = supabase.from("lancamentos").select("nome_lancamento, status_lancamento, cliente_id").eq("ativo", true).not("status_lancamento", "in", '("finalizado","cancelado")');
            // 5. Orçamentos / Funis ativos
            let qOrcamentos = supabase.from("orcamentos_funil").select("nome_funil, etapa_funil, cliente_id, ativo").eq("ativo", true);

            if (!gerarParaTodos) {
                const singleId = clientesParaGerar[0].id;
                qMensagens = qMensagens.eq('cliente_id', singleId);
                qDiario = qDiario.eq('cliente_id', singleId);
                qReunioes = qReunioes.eq('cliente_id', singleId);
                qGravacoes = qGravacoes.eq('cliente_id', singleId);
                qLancamentos = qLancamentos.eq('cliente_id', singleId);
                qOrcamentos = qOrcamentos.eq('cliente_id', singleId);
            }

            const [resMensagens, resDiario, resReunioes, resGravacoes, resLancamentos, resOrcamentos] = await Promise.all([
                qMensagens, qDiario, qReunioes, qGravacoes, qLancamentos, qOrcamentos
            ]);

            // 6. Tarefas concluidas na semana
            const { data: tarefas } = await supabase
                .from("tasks")
                .select("title, completed_at, description")
                .eq("completed", true)
                .gte("completed_at", startStr)
                .lte("completed_at", endStr);

            // Formatar Resumos
            const formataResumos = clientesParaGerar.map(cliente => {
                const m = (resMensagens.data || []).filter(x => x.cliente_id === cliente.id);
                const d = (resDiario.data || []).filter(x => x.cliente_id === cliente.id);
                const r = (resReunioes.data || []).filter(x => x.cliente_id === cliente.id);
                const g = (resGravacoes.data || []).filter(x => x.cliente_id === cliente.id);
                const l = (resLancamentos.data || []).filter(x => x.cliente_id === cliente.id);
                const o = (resOrcamentos.data || []).filter(x => x.cliente_id === cliente.id);

                const nomeMatch = cliente.nome.toLowerCase();
                const slugMatch = cliente.slug?.toLowerCase();
                const t = (tarefas || []).filter(x => {
                    const titleStr = (x.title || "").toLowerCase();
                    const descStr = (x.description || "").toLowerCase();
                    const checks = [nomeMatch];
                    if (slugMatch) checks.push(slugMatch);

                    return checks.some(check => titleStr.includes(check) || descStr.includes(check));
                });

                return {
                    cliente,
                    periodo: { start, end: endDate },
                    mensagens: m,
                    diario: d,
                    reunioes: r,
                    gravacoes: g,
                    lancamentos: l,
                    orcamentos: o,
                    tarefas: t
                };
            });

            setResumosData(formataResumos);

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

    const marcarEnvio = async (mensagemId: string, enviado: boolean) => {
        try {
            const user = await supabase.auth.getUser();
            const agora = new Date().toISOString();

            const { data: mensagemAtual } = await supabase.from("mensagens_semanais").select("historico_envios").eq("id", mensagemId).single();
            const novoHistorico = {
                tipo: enviado ? 'cs_enviado' : 'cs_marcado_pendente',
                data: agora,
                user_id: user.data.user?.id,
                detalhes: enviado ? 'Mensagem enviada para o cliente pela CS' : 'Mensagem marcada como pendente pela CS'
            };

            const dadosAtualizacao: any = {
                enviado,
                enviado_cs_em: enviado ? agora : null,
                historico_envios: mensagemAtual?.historico_envios ? [...mensagemAtual.historico_envios, novoHistorico] : [novoHistorico]
            };

            const { error } = await supabase.from("mensagens_semanais").update(dadosAtualizacao).eq("id", mensagemId);
            if (error) throw error;

            toast({
                title: "Sucesso",
                description: `Mensagem marcada como ${enviado ? 'enviada' : 'pendente'}.`
            });

            // Atualiza os dados localmente
            if (resumosData) {
                const newData = resumosData.map(resumo => {
                    const idx = resumo.mensagens.findIndex((m: any) => m.id === mensagemId);
                    if (idx > -1) {
                        const newMsgs = [...resumo.mensagens];
                        newMsgs[idx] = { ...newMsgs[idx], ...dadosAtualizacao };
                        return { ...resumo, mensagens: newMsgs };
                    }
                    return resumo;
                });
                setResumosData(newData);
            }
            if (mensagemSelecionada && mensagemSelecionada.id === mensagemId) {
                setMensagemSelecionada({ ...mensagemSelecionada, ...dadosAtualizacao });
            }

        } catch (error: any) {
            console.error("Erro ao marcar envio:", error);
            toast({
                title: "Erro",
                description: error.message || "Não foi possível atualizar o status da mensagem.",
                variant: "destructive"
            });
        }
    };

    const previewMensagem = (texto: string | null | undefined) => {
        if (!texto) return "-";
        return texto.length > 50 ? texto.substring(0, 50) + "..." : texto;
    };

    const gerarTextoVazioCheck = (resumoData: any) => {
        return resumoData.tarefas.length > 0 || resumoData.lancamentos.length > 0 || resumoData.reunioes.length > 0 || resumoData.gravacoes.length > 0 || resumoData.diario.length > 0 || resumoData.mensagens.length > 0 || resumoData.orcamentos.length > 0;
    }

    const gerarTextoDoResumo = (resumoData: any) => {
        const { cliente, periodo, mensagens, diario, reunioes, gravacoes, lancamentos, orcamentos, tarefas } = resumoData;

        let texto = `*Resumo Semanal - ${cliente.nome}*\n`;
        texto += `*Período:* ${format(periodo.start, "dd/MM")} a ${format(periodo.end, "dd/MM")}\n\n`;

        if (tarefas.length > 0) {
            texto += `*✅ Tarefas Concluídas:*\n`;
            tarefas.forEach((t: any) => texto += `- ${t.title}\n`);
            texto += `\n`;
        }

        if (lancamentos.length > 0) {
            texto += `*🚀 Lançamentos Ativos:*\n`;
            lancamentos.forEach((l: any) => texto += `- ${l.nome_lancamento} (${l.status_lancamento?.replace(/_/g, " ")})\n`);
            texto += `\n`;
        }

        if (orcamentos.length > 0) {
            texto += `*🎯 Funis Ativos:*\n`;
            orcamentos.forEach((o: any) => texto += `- ${o.nome_funil}\n`);
            texto += `\n`;
        }

        if (reunioes.length > 0 || gravacoes.length > 0) {
            texto += `*🎥 Reuniões & Gravações:*\n`;
            reunioes.forEach((r: any) => texto += `- ${r.titulo}\n`);
            gravacoes.forEach((g: any) => texto += `- ${g.titulo}\n`);
            texto += `\n`;
        }

        if (diario.length > 0) {
            texto += `*📝 Notas do Painel:*\n`;
            diario.forEach((d: any) => texto += `- ${d.texto}\n`);
            texto += `\n`;
        }

        return texto;
    };

    const handleCopiarResumo = (resumoData: any) => {
        if (!resumoData) return;
        const texto = gerarTextoDoResumo(resumoData);
        navigator.clipboard.writeText(texto);
        toast({
            title: "Copiado!",
            description: "Resumo copiado para a área de transferência.",
        });
    };

    const handleCopiarTodos = () => {
        if (!resumosData || resumosData.length === 0) return;

        let textoFinal = "";
        let copiados = 0;

        resumosData.forEach((res) => {
            if (gerarTextoVazioCheck(res)) {
                textoFinal += gerarTextoDoResumo(res) + "\n-------------------------------------------------\n\n";
                copiados++;
            }
        });

        if (!textoFinal.trim()) {
            toast({ title: "Nenhum dado", description: `Nenhum dos clientes possuía atividades para copiar nesta semana.`, variant: "destructive" });
            return;
        }

        textoFinal = textoFinal.replace(/-+\s+$/, "").trim();

        navigator.clipboard.writeText(textoFinal);
        toast({ title: "Sucesso!", description: `Copiado os resumos consolidados de ${copiados} clientes com sucesso.` });
    };

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
                                Gerar Para Todos
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {resumosData && resumosData.length > 0 && (
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">
                        Exibindo relatórios gerados (com atividade na semana aplicável).
                    </div>
                    {resumosData.some(gerarTextoVazioCheck) && (
                        <Button variant="default" onClick={handleCopiarTodos} className="shadow-sm">
                            <Copy className="h-4 w-4 mr-2" /> Copiar Todos Resumos (C/ Atividades)
                        </Button>
                    )}
                </div>
            )}

            {resumosData && (
                <div className="space-y-6">
                    {resumosData.filter(gerarTextoVazioCheck).map((resumoData, index) => (
                        <Card key={index} className="shadow-sm border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="text-xl">{resumoData.cliente.nome}</CardTitle>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Período de: {format(resumoData.periodo.start, "dd/MM")} até {format(resumoData.periodo.end, "dd/MM")}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleCopiarResumo(resumoData)} className="hover:bg-muted">
                                    <Copy className="h-4 w-4 mr-2" /> Copiar Dados Básicos
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">

                                {resumoData.tarefas.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-primary">
                                            <CheckCircle2 className="h-4 w-4" /> Tarefas Concluídas ({resumoData.tarefas.length})
                                        </h3>
                                        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-1">
                                            {resumoData.tarefas.map((t: any, i: number) => (
                                                <li key={i}>{t.title}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {resumoData.lancamentos.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-orange-500">
                                            <Rocket className="h-4 w-4" /> Lançamentos Ativos ({resumoData.lancamentos.length})
                                        </h3>
                                        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-1">
                                            {resumoData.lancamentos.map((l: any, i: number) => (
                                                <li key={i}>{l.nome_lancamento} - <span className="capitalize">{l.status_lancamento?.replace(/_/g, " ")}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {resumoData.orcamentos.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-purple-500">
                                            <Target className="h-4 w-4" /> Funis Ativos ({resumoData.orcamentos.length})
                                        </h3>
                                        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-1">
                                            {resumoData.orcamentos.map((o: any, i: number) => (
                                                <li key={i}>{o.nome_funil} {o.etapa_funil ? `(${o.etapa_funil})` : ''}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {(resumoData.reunioes.length > 0 || resumoData.gravacoes.length > 0) && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-blue-500">
                                            <Video className="h-4 w-4" /> Reuniões & Gravações
                                        </h3>
                                        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-1">
                                            {resumoData.reunioes.map((r: any, i: number) => (
                                                <li key={`r-${i}`}>{r.titulo}</li>
                                            ))}
                                            {resumoData.gravacoes.map((g: any, i: number) => (
                                                <li key={`g-${i}`}>{g.titulo}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {resumoData.diario.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-emerald-500">
                                            <MessageSquare className="h-4 w-4" /> Notas do Painel (Diário de Bordo)
                                        </h3>
                                        <div className="space-y-2">
                                            {resumoData.diario.map((d: any, i: number) => (
                                                <div key={i} className="text-sm bg-muted/50 p-3 rounded-lg text-muted-foreground">
                                                    {d.texto}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {resumoData.mensagens.length > 0 && (
                                    <div className="space-y-4 pt-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-indigo-500 border-t pt-4">
                                            <MessageSquare className="h-4 w-4" /> Mensagens da Semana
                                        </h3>
                                        <div className="space-y-3">
                                            {resumoData.mensagens.map((m: any, i: number) => (
                                                <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-3 border rounded-lg gap-4 bg-background">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            Semana: {format(new Date(m.semana_referencia), "dd/MM/yyyy", { locale: ptBR })}
                                                        </div>
                                                        <div className="text-sm font-medium text-muted-foreground truncate">
                                                            {previewMensagem(m.mensagem)}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <Badge variant={m.enviado ? "default" : "destructive"} className={m.enviado ? "bg-green-100 text-green-800" : ""}>
                                                            {m.enviado ? "✅ Enviado" : "❌ Pendente"}
                                                        </Badge>

                                                        <div className="flex items-center gap-1">
                                                            <Button variant="outline" size="sm" onClick={() => setMensagemSelecionada({ ...m, cliente_nome: resumoData.cliente.nome })} title="Visualizar mensagem">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => marcarEnvio(m.id, true)} disabled={m.enviado} className="text-green-600 hover:text-green-700" title="Marcar como enviado">
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => marcarEnvio(m.id, false)} disabled={!m.enviado} className="text-red-600 hover:text-red-700" title="Marcar como pendente">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {resumosData.every(r => !gerarTextoVazioCheck(r)) && (
                        <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                            Nenhuma atividade registrada para os clientes pesquisados nesta semana.
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Visualização da Mensagem */}
            <Dialog open={!!mensagemSelecionada} onOpenChange={(open) => {
                if (!open) setMensagemSelecionada(null);
            }}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Visualizar Mensagem - {mensagemSelecionada?.cliente_nome}</DialogTitle>

                            {mensagemSelecionada && (
                                <div className="flex items-center gap-2 mr-6">
                                    <Button variant="outline" size="sm" onClick={() => marcarEnvio(mensagemSelecionada.id, true)} disabled={mensagemSelecionada.enviado} className="text-green-600">
                                        <Check className="h-4 w-4 mr-1" /> Enviar
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => marcarEnvio(mensagemSelecionada.id, false)} disabled={!mensagemSelecionada.enviado} className="text-red-600">
                                        <X className="h-4 w-4 mr-1" /> Pendente
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {mensagemSelecionada && (
                        <div className="space-y-6 mt-4">
                            {!mensagemSelecionada.enviado && (
                                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md border border-yellow-200">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        Ação Necessária
                                    </h4>
                                    <p className="text-sm mt-1">
                                        Esta mensagem ainda está pendente de envio. Após enviá-la ao cliente, clique no botão "Enviar" acima.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 border-b pb-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Mensagem Original
                                </h3>
                                <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap text-sm border">
                                    {mensagemSelecionada.mensagem}
                                </div>
                            </div>

                            {mensagemSelecionada.mensagem_ia && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-emerald-600 flex items-center gap-2 border-b border-emerald-100 pb-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Versão Refinada (IA)
                                    </h3>
                                    <div className="bg-emerald-50/50 p-4 rounded-lg whitespace-pre-wrap text-sm border border-emerald-100">
                                        {mensagemSelecionada.mensagem_ia}
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <Button variant="outline" size="sm" onClick={() => {
                                            navigator.clipboard.writeText(mensagemSelecionada.mensagem_ia);
                                            toast({ title: "Copiado!", description: "Versão da IA copiada." });
                                        }}>
                                            <Copy className="w-4 h-4 mr-2" /> Copiar Texto da IA
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
