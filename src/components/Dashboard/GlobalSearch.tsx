import { useState, useEffect } from "react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    Search,
    Users,
    Rocket,
    Trophy,
    Briefcase,
    FileText,
    Loader2,
    ChevronRight,
    CheckSquare,
    Wrench,
    GraduationCap,
    Play,
    FlaskConical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ColaboradorDetailModal } from "@/components/CulturaTime/TimeEmCampo/ColaboradorDetailModal";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { EditarColaboradorModal } from "@/components/Colaboradores/EditarColaboradorModal";
import { AlterarSenhaModal } from "@/components/Colaboradores/AlterarSenhaModal";

interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    type: 'cliente' | 'colaborador' | 'lancamento' | 'desafio' | 'teste' | 'tarefa' | 'documento' | 'ferramenta' | 'treinamento' | 'aula';
    url: string;
    colaboradorData?: any;
}

const STATIC_TOOLS = [
    { id: "cultura-time", title: "Cultura & Time", url: "/cultura-time", subtitle: "Página" },
    { id: "clientes", title: "Clientes", url: "/clientes", subtitle: "Página" },
    { id: "treinamentos", title: "Treinamentos", url: "/treinamentos", subtitle: "Página" },
    { id: "ferramentas", title: "Ferramentas", url: "/ferramentas", subtitle: "Página" },
    { id: "criador-criativos", title: "Criador de Criativos", url: "/criador-criativos", subtitle: "Ferramenta" },
    { id: "arquivo-reuniao", title: "Arquivo de Reunião", url: "/arquivo-reuniao", subtitle: "Ferramenta" },
    { id: "referencias", title: "Referências", url: "/referencias", subtitle: "Ferramenta" },
    { id: "debriefings", title: "Debriefings", url: "/ferramentas/debriefings", subtitle: "Ferramenta" },
    { id: "notas", title: "Bloco de Notas", url: "/ferramentas/notas", subtitle: "Ferramenta" },
    { id: "documentos", title: "Documentos", url: "/ferramentas/documentos", subtitle: "Ferramenta" },
    { id: "orcamentos-funil", title: "Orçamentos", url: "/ferramentas/orcamentos-funil", subtitle: "Ferramenta" },
    { id: "utm-builder", title: "Criador de UTM", url: "/ferramentas/utm-builder", subtitle: "Ferramenta" },
    { id: "acessos-logins", title: "Acessos & Logins", url: "/ferramentas/acessos-logins", subtitle: "Ferramenta" },
    { id: "mensagens-semanais", title: "Mensagens Semanais", url: "/ferramentas/mensagens-semanais", subtitle: "Ferramenta" },
    { id: "links", title: "Links Importantes", url: "/ferramentas/links", subtitle: "Ferramenta" },
    { id: "nps", title: "NPS", url: "/nps", subtitle: "Ferramenta" },
    { id: "desafio-gamificacao", title: "Desafio Gamificação", url: "/gamificacao", subtitle: "Ferramenta" },
    { id: "tarefas", title: "Minhas Tarefas", url: "/tarefas", subtitle: "Página" },
];

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Modals state for Colaborador
    const { isAdmin } = useUserPermissions();
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [senhaModalOpen, setSenhaModalOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        if (!query) {
            const fetchBaseData = async () => {
                setLoading(true);
                try {
                    const [clientes, lancamentos, documentos] = await Promise.all([
                        supabase
                            .from('clientes')
                            .select('id, nome, nicho, slug')
                            .eq('ativo', true)
                            .order('created_at', { ascending: false })
                            .limit(5),
                        supabase
                            .from('lancamentos')
                            .select('id, nome_lancamento, promessa, clientes!inner(nome)')
                            .eq('status_lancamento', 'finalizado')
                            .order('created_at', { ascending: false })
                            .limit(5),
                        supabase
                            .from('workspace_documents')
                            .select('id, title, emoji, is_public')
                            .order('updated_at', { ascending: false })
                            .limit(5)
                    ]);

                    const newResults: SearchResult[] = [];

                    clientes.data?.forEach(c => newResults.push({
                        id: c.id,
                        title: c.nome || c.nicho || 'Sem nome',
                        type: 'cliente',
                        url: `/painel/${c.id}`
                    }));

                    lancamentos.data?.forEach(l => newResults.push({
                        id: l.id,
                        title: l.nome_lancamento,
                        subtitle: (l.clientes as any)?.nome || 'Sem cliente (Implementação Finalizada)',
                        type: 'lancamento',
                        url: `/lancamentos/${l.id}`
                    }));

                    documentos.data?.forEach(d => newResults.push({
                        id: d.id,
                        title: `${d.emoji || "📝"} ${d.title || 'Sem título'}`,
                        subtitle: d.is_public ? 'Documento público' : 'Documento privado',
                        type: 'documento',
                        url: `/ferramentas/documentos?doc=${d.id}`
                    }));

                    setResults(newResults);
                } catch (error) {
                    console.error("Default search error:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchBaseData();
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const searchTerm = `%${query}%`;
                const searchLower = query.toLowerCase();

                const [
                    clientes,
                    colaboradores,
                    lancamentos,
                    desafios,
                    testes,
                    tarefas,
                    documentos,
                    treinamentos,
                    aulas
                ] = await Promise.all([
                    // Clientes
                    supabase
                        .from('clientes')
                        .select('id, nome, nicho, slug')
                        .or(`nome.ilike.${searchTerm},slug.ilike.${searchTerm}`)
                        .eq('ativo', true)
                        .limit(5),

                    // Colaboradores
                    supabase
                        .from('colaboradores')
                        .select('*')
                        .ilike('nome', searchTerm)
                        .eq('ativo', true)
                        .limit(5),

                    // Lançamentos
                    supabase
                        .from('lancamentos')
                        .select('id, nome_lancamento, promessa, clientes!inner(nome)')
                        .or(`nome_lancamento.ilike.${searchTerm}`)
                        .not('status_lancamento', 'eq', 'cancelado')
                        .limit(5),

                    // Desafios
                    supabase
                        .from('gamificacao_desafios')
                        .select('id, titulo')
                        .ilike('titulo', searchTerm)
                        .eq('ativo', true)
                        .limit(5),

                    // Testes
                    supabase
                        .from('testes_laboratorio')
                        .select('id, nome, hipotese')
                        .or(`nome.ilike.${searchTerm},hipotese.ilike.${searchTerm}`)
                        .limit(5),

                    // Tarefas
                    supabase
                        .from('tasks')
                        .select('id, title, assignee')
                        .ilike('title', searchTerm)
                        .limit(5),

                    // Documentos
                    supabase
                        .from('workspace_documents')
                        .select('id, title, emoji, is_public')
                        .or(`title.ilike.${searchTerm},content_html.ilike.${searchTerm}`)
                        .limit(5),

                    // Treinamentos (Cursos)
                    supabase
                        .from('treinamentos')
                        .select('id, titulo, descricao')
                        .ilike('titulo', searchTerm)
                        .limit(5),

                    // Aulas
                    supabase
                        .from('aulas')
                        .select('id, titulo, treinamento_id')
                        .ilike('titulo', searchTerm)
                        .limit(5),
                ]);

                const newResults: SearchResult[] = [];

                clientes.data?.forEach(c => newResults.push({
                    id: c.id,
                    title: c.nome || c.nicho || 'Sem nome',
                    type: 'cliente',
                    url: `/painel/${c.id}`
                }));

                colaboradores.data?.forEach(c => newResults.push({
                    id: c.id,
                    title: c.nome,
                    subtitle: c.cargo_display || 'Colaborador',
                    type: 'colaborador',
                    url: `#`, // Will open modal instead
                    colaboradorData: c
                }));

                // Lancamentos filters by client name manually or if the launch has the name 
                const lancamentoData = lancamentos.data || [];
                const matchedLancamentos = lancamentoData.filter(l => {
                    const clientName = (l.clientes as any)?.nome || '';
                    return l.nome_lancamento.toLowerCase().includes(searchLower) ||
                        clientName.toLowerCase().includes(searchLower);
                });

                matchedLancamentos.forEach(l => newResults.push({
                    id: l.id,
                    title: l.nome_lancamento,
                    subtitle: (l.clientes as any)?.nome || 'Sem cliente',
                    type: 'lancamento',
                    url: `/lancamentos/${l.id}`
                }));

                desafios.data?.forEach(d => newResults.push({
                    id: d.id,
                    title: d.titulo,
                    type: 'desafio',
                    url: `/gamificacao`
                }));

                testes.data?.forEach(t => newResults.push({
                    id: t.id,
                    title: t.nome,
                    subtitle: t.hipotese,
                    type: 'teste',
                    url: `/testes` // Adjust to open specific test
                }));

                tarefas.data?.forEach(t => newResults.push({
                    id: t.id,
                    title: t.title,
                    subtitle: t.assignee || 'Sem responsável',
                    type: 'tarefa',
                    url: `/tarefas/${t.id}`
                }));

                documentos.data?.forEach(d => newResults.push({
                    id: d.id,
                    title: `${d.emoji || "📝"} ${d.title || 'Sem título'}`,
                    subtitle: d.is_public ? 'Documento público' : 'Documento privado',
                    type: 'documento',
                    url: `/ferramentas/documentos?doc=${d.id}`
                }));

                treinamentos.data?.forEach(t => newResults.push({
                    id: t.id,
                    title: t.titulo,
                    subtitle: t.descricao || 'Curso',
                    type: 'treinamento',
                    url: `/curso/${t.id}`
                }));

                aulas.data?.forEach(a => newResults.push({
                    id: a.id,
                    title: a.titulo,
                    subtitle: 'Aula',
                    type: 'aula',
                    url: `/curso/${a.treinamento_id}/aula/${a.id}`
                }));

                const matchedTools = STATIC_TOOLS.filter(t =>
                    t.title.toLowerCase().includes(searchLower) ||
                    t.subtitle.toLowerCase().includes(searchLower)
                );

                matchedTools.forEach(t => newResults.push({
                    id: t.id,
                    title: t.title,
                    subtitle: t.subtitle,
                    type: 'ferramenta',
                    url: t.url
                }));

                setResults(newResults);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (item: SearchResult) => {
        if (item.type === 'colaborador' && item.colaboradorData) {
            setOpen(false);
            setSelectedColaborador(item.colaboradorData);
            setDetailModalOpen(true);
            return;
        }
        setOpen(false);
        navigate(item.url);
    };

    const handleEdit = (colab: any) => {
        setSelectedColaborador(colab);
        setEditModalOpen(true);
    };

    const handleChangePassword = (colab: any) => {
        setSelectedColaborador(colab);
        setSenhaModalOpen(true);
    };

    const getIconInfo = (type: SearchResult['type']) => {
        switch (type) {
            case 'cliente': return { icon: Briefcase, text: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'colaborador': return { icon: Users, text: 'text-purple-500', bg: 'bg-purple-500/10' };
            case 'lancamento': return { icon: Rocket, text: 'text-orange-500', bg: 'bg-orange-500/10' };
            case 'desafio': return { icon: Trophy, text: 'text-yellow-500', bg: 'bg-yellow-500/10' };
            case 'teste': return { icon: FlaskConical, text: 'text-emerald-500', bg: 'bg-emerald-500/10' };
            case 'tarefa': return { icon: CheckSquare, text: 'text-blue-400', bg: 'bg-blue-400/10' };
            case 'documento': return { icon: FileText, text: 'text-indigo-500', bg: 'bg-indigo-500/10' };
            case 'ferramenta': return { icon: Wrench, text: 'text-zinc-500', bg: 'bg-zinc-500/10' };
            case 'treinamento': return { icon: GraduationCap, text: 'text-cyan-500', bg: 'bg-cyan-500/10' };
            case 'aula': return { icon: Play, text: 'text-rose-500', bg: 'bg-rose-500/10' };
            default: return { icon: Search, text: 'text-gray-500', bg: 'bg-gray-500/10' };
        }
    };

    const groupedResults = results.reduce((acc, result) => {
        if (!acc[result.type]) acc[result.type] = [];
        acc[result.type].push(result);
        return acc;
    }, {} as Record<string, SearchResult[]>);

    return (
        <>
            <Button
                variant="ghost"
                className="relative h-14 w-full justify-start rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20 px-4 transition-all duration-300 group"
                onClick={() => setOpen(true)}
            >
                <Search className="mr-2 h-5 w-5 text-white/70 group-hover:text-white" />
                <span className="text-white/70 font-medium group-hover:text-white text-lg lg:text-xl">Pesquisar...</span>
                <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden h-6 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>J
                </kbd>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="overflow-hidden p-0 shadow-lg max-w-2xl">
                    <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
                        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <CommandInput
                                placeholder="O que você está procurando?"
                                value={query}
                                onValueChange={setQuery}
                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <CommandList className="max-h-[70vh]">
                            <CommandEmpty>
                                {loading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    "Nenhum resultado encontrado."
                                )}
                            </CommandEmpty>

                            {!loading && Object.entries(groupedResults).map(([type, items]) => (
                                <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1) + 's'}>
                                    {items.map((item) => {
                                        const { icon: Icon, text, bg } = getIconInfo(item.type);
                                        return (
                                            <CommandItem
                                                key={item.id}
                                                onSelect={() => handleSelect(item)}
                                                value={item.id} // Add unique value key
                                                className="flex items-center gap-3 py-3 cursor-pointer"
                                            >
                                                <div className={`flex items-center justify-center h-8 w-8 rounded-full ${bg}`}>
                                                    <Icon className={`h-4 w-4 ${text}`} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.title}</span>
                                                    {item.subtitle && (
                                                        <span className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</span>
                                                    )}
                                                </div>
                                                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                                            </CommandItem>
                                        );
                                    })}
                                    <CommandSeparator />
                                </CommandGroup>
                            ))}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>

            {/* Modals for Colaborador */}
            <ColaboradorDetailModal
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                colaborador={selectedColaborador}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onChangePassword={handleChangePassword}
            />

            <EditarColaboradorModal
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                colaborador={selectedColaborador}
                onSuccess={() => { }} // No need to refresh the search list immediately, or we could trigger a re-search
            />

            <AlterarSenhaModal
                open={senhaModalOpen}
                onOpenChange={setSenhaModalOpen}
                colaborador={selectedColaborador}
                onSuccess={() => { }}
            />
        </>
    );
}
