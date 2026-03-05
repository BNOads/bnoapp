import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Plus, Maximize2, Trash2, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import bnoadsLogoImg from "/lovable-uploads/aa058792-aa89-40ce-8f0d-8f6e8c759294.png";

interface DiarioAtendimentoEntry {
    id: string;
    cliente_id: string;
    autor_id: string;
    texto: string;
    created_at: string;
    author_nome?: string;
    author_avatar?: string;
    lancamento_nome?: string;
    cliente_nome?: string;
}

export const DiarioAtendimento = () => {
    const { user } = useAuth();
    const { userData } = useCurrentUser();
    const { isAdmin, canCreateContent } = useUserPermissions();
    const { toast } = useToast();

    const [entries, setEntries] = useState<DiarioAtendimentoEntry[]>([]);
    const [newEntryText, setNewEntryText] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filtros e Seletores
    const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([]);
    const [autores, setAutores] = useState<Array<{ id: string; nome: string }>>([]);
    const [lancamentos, setLancamentos] = useState<Array<{ id: string; nome_lancamento: string }>>([]);

    // Estado do Input
    const [selectedClienteId, setSelectedClienteId] = useState<string>("");
    const [selectedLancamentoId, setSelectedLancamentoId] = useState<string>("");

    // Estado dos Filtros
    const [filterClienteId, setFilterClienteId] = useState<string>("");
    const [filterAutorId, setFilterAutorId] = useState<string>("");

    // Popup
    const [isExpanded, setIsExpanded] = useState(false);

    const canWrite = isAdmin || canCreateContent;
    const isPublicAccess = !user;

    useEffect(() => {
        loadClientes();
        loadAutores();
    }, []);

    useEffect(() => {
        loadEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterClienteId, filterAutorId]);

    useEffect(() => {
        if (selectedClienteId) {
            loadLancamentos(selectedClienteId);
        } else {
            setLancamentos([]);
        }
        setSelectedLancamentoId("");
    }, [selectedClienteId]);

    const loadClientes = async () => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('id, nome')
                .eq('is_active', true)
                .order('nome');

            if (error) throw error;
            setClientes(data || []);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    };

    const loadAutores = async () => {
        try {
            const { data, error } = await supabase
                .from('colaboradores')
                .select('user_id, nome, ativo')
                .order('nome');

            if (error) throw error;
            // Filtra só os ativos 
            const ativos = data?.filter(c => c.ativo) || [];
            setAutores(ativos.map(a => ({ id: a.user_id, nome: a.nome })));
        } catch (error) {
            console.error('Erro ao carregar autores:', error);
        }
    };

    const loadLancamentos = async (clienteId: string) => {
        try {
            const { data, error } = await supabase
                .from('lancamentos')
                .select('id, nome_lancamento')
                .eq('cliente_id', clienteId)
                .eq('ativo', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLancamentos(data || []);
        } catch (error) {
            console.error('Erro ao carregar lançamentos:', error);
        }
    };

    const loadEntries = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('diario_atendimento')
                .select('*')
                .is('parent_id', null)
                .order('created_at', { ascending: false })
                .limit(50);

            if (filterClienteId) {
                query = query.eq('cliente_id', filterClienteId);
            }
            if (filterAutorId) {
                query = query.eq('autor_id', filterAutorId);
            }

            const { data: entriesData, error: entriesError } = await query;

            if (entriesError) throw entriesError;

            const entriesWithDetails: DiarioAtendimentoEntry[] = [];

            if (entriesData) {
                for (const entry of entriesData) {
                    // Buscar autor
                    const { data: colaboradorData } = await supabase
                        .from('colaboradores')
                        .select('nome, avatar_url')
                        .eq('user_id', entry.autor_id)
                        .maybeSingle();

                    // Buscar cliente
                    const { data: clienteData } = await supabase
                        .from('clientes')
                        .select('nome')
                        .eq('id', entry.cliente_id)
                        .maybeSingle();

                    // Buscar lançamento
                    let lancamentoNome;
                    if (entry.lancamento_id) {
                        const { data: lancamentoData } = await supabase
                            .from('lancamentos')
                            .select('nome_lancamento')
                            .eq('id', entry.lancamento_id)
                            .maybeSingle();
                        lancamentoNome = lancamentoData?.nome_lancamento;
                    }

                    entriesWithDetails.push({
                        ...entry,
                        author_nome: colaboradorData?.nome || 'Usuário',
                        author_avatar: colaboradorData?.avatar_url,
                        cliente_nome: clienteData?.nome || 'Cliente Desconhecido',
                        lancamento_nome: lancamentoNome,
                    });
                }
            }

            setEntries(entriesWithDetails);
        } catch (error) {
            console.error('Erro ao carregar entradas:', error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar o diário de atendimento.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitEntry = async () => {
        if (!newEntryText.trim() || !user?.id || !selectedClienteId) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha o cliente e o texto para registrar a entrada.",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);
        try {
            const insertData: any = {
                cliente_id: selectedClienteId,
                autor_id: user.id,
                texto: newEntryText.trim(),
            };

            if (selectedLancamentoId) {
                insertData.lancamento_id = selectedLancamentoId;
            }

            const { error } = await supabase
                .from('diario_atendimento')
                .insert(insertData);

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: "Registro adicionado ao diário de atendimento.",
            });

            setNewEntryText("");
            setSelectedLancamentoId("");
            loadEntries();
        } catch (error) {
            console.error('Erro ao criar entrada:', error);
            toast({
                title: "Erro",
                description: "Não foi possível adicionar a entrada.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (entryId: string) => {
        if (!confirm("Tem certeza que deseja excluir este registro?")) return;

        try {
            const { error } = await supabase
                .from('diario_atendimento')
                .delete()
                .eq('id', entryId);

            if (error) throw error;

            setEntries(prev => prev.filter(entry => entry.id !== entryId));

            toast({
                title: "Sucesso",
                description: "Registro excluído com sucesso.",
            });
        } catch (error) {
            console.error('Erro ao excluir entrada:', error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir o log.",
                variant: "destructive",
            });
        }
    };

    const renderAuthorInfo = (authorName?: string, authorAvatar?: string) => {
        if (isPublicAccess) return { name: "EQUIPE BNOads", avatar: bnoadsLogoImg };
        return { name: authorName || 'Usuário', avatar: authorAvatar };
    };

    const InnerContent = () => (
        <>
            {/* Form Section */}
            {canWrite && (
                <div className="p-4 border-b space-y-4 shrink-0 bg-background">
                    <Textarea
                        placeholder="Escreva o que foi otimizado, testado ou ajustado..."
                        value={newEntryText}
                        onChange={(e) => setNewEntryText(e.target.value)}
                        className="min-h-[100px] resize-none focus-visible:ring-1 bg-muted/40"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Cliente vinculado *
                            </label>
                            <SearchableSelect
                                options={clientes.map(c => ({ id: c.id, name: c.nome }))}
                                value={selectedClienteId}
                                onValueChange={setSelectedClienteId}
                                placeholder="Selecione o cliente..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Associar a um funil (opcional)
                            </label>
                            <SearchableSelect
                                options={[{ id: "", nome_lancamento: "Sem funil específico" }, ...lancamentos].map(l => ({
                                    id: l.id,
                                    name: l.nome_lancamento
                                }))}
                                value={selectedLancamentoId}
                                onValueChange={setSelectedLancamentoId}
                                placeholder="Sem funil específico"
                                disabled={!selectedClienteId}
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        onClick={handleSubmitEntry}
                        disabled={!newEntryText.trim() || !selectedClienteId || submitting}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {submitting ? "Adicionando..." : "Adicionar entrada"}
                    </Button>
                </div>
            )}

            {/* Filters Section */}
            <div className="px-4 py-3 bg-muted/30 border-b flex flex-wrap gap-3 items-center shrink-0">
                <Filter className="h-4 w-4 text-muted-foreground stroke-[1.5px]" />
                <div className="w-[200px]">
                    <SearchableSelect
                        options={[{ id: "", name: "Todos os clientes" }, ...clientes.map(c => ({ id: c.id, name: c.nome }))]}
                        value={filterClienteId}
                        onValueChange={setFilterClienteId}
                        placeholder="Filtrar por cliente"
                        className="h-8 text-xs bg-white"
                    />
                </div>
                <div className="w-[200px]">
                    <SearchableSelect
                        options={[{ id: "", name: "Todos os usuários" }, ...autores.map(a => ({ id: a.id, name: a.nome }))]}
                        value={filterAutorId}
                        onValueChange={setFilterAutorId}
                        placeholder="Filtrar por usuário"
                        className="h-8 text-xs bg-white"
                    />
                </div>
            </div>

            {/* Feed Section */}
            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-16 bg-muted rounded w-full"></div>
                        <div className="h-16 bg-muted rounded w-full"></div>
                        <div className="h-16 bg-muted rounded w-full"></div>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground h-full min-h-[200px]">
                        <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                        <p className="font-medium text-sm text-foreground/70">Nenhuma entrada encontrada para este filtro.</p>
                        <p className="text-xs mt-1">Experimente remover os filtros para ver todas as otimizações.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {entries.map((entry) => {
                            const authorInfo = renderAuthorInfo(entry.author_nome, entry.author_avatar);

                            return (
                                <div key={entry.id} className="border bg-card rounded-lg p-4 space-y-3 shadow-sm hover:shadow transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 ring-1 ring-border">
                                                <AvatarImage src={authorInfo.avatar} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                    {authorInfo.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm text-foreground">
                                                    {authorInfo.name}
                                                    <span className="text-muted-foreground font-normal mx-1">&middot;</span>
                                                    <span className="text-blue-600 font-medium">{entry.cliente_nome}</span>
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    {formatDistanceToNow(new Date(entry.created_at), {
                                                        addSuffix: true,
                                                        locale: ptBR,
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        {(user?.id === entry.autor_id || isAdmin) && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(entry.id)}
                                                className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 -mr-2"
                                                title="Excluir entrada"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                        {entry.texto}
                                    </div>

                                    {entry.lancamento_nome && (
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                            🚀 {entry.lancamento_nome}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </>
    );

    return (
        <>
            <Card className="flex flex-col border shadow-sm h-[650px]">
                <CardHeader className="py-4 px-5 border-b shrink-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground/80">
                        <MessageSquare className="h-5 w-5" />
                        <CardTitle className="text-base font-semibold">Diário de Atendimento</CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(true)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-background/50">
                    <InnerContent />
                </CardContent>
            </Card>

            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 flex flex-col gap-0 border-0 overflow-hidden">
                    <DialogTitle className="sr-only">Diário de Atendimento Expandido</DialogTitle>
                    <div className="py-4 px-5 border-b bg-background shrink-0 flex items-center pr-12 gap-2 text-foreground/80 relative">
                        <MessageSquare className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">Diário de Atendimento</h2>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col bg-background relative">
                        <InnerContent />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
