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
    FlaskConical,
    Briefcase,
    Loader2,
    ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    type: 'cliente' | 'colaborador' | 'lancamento' | 'desafio' | 'teste';
    url: string;
}

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const searchTerm = `%${query}%`;

                const [
                    clientes,
                    colaboradores,
                    lancamentos,
                    desafios,
                    testes
                ] = await Promise.all([
                    // Clientes
                    supabase
                        .from('clientes')
                        .select('id, nome_fantasia, razao_social')
                        .or(`nome_fantasia.ilike.${searchTerm},razao_social.ilike.${searchTerm}`)
                        .eq('ativo', true)
                        .limit(3),

                    // Colaboradores
                    supabase
                        .from('colaboradores')
                        .select('id, nome, funcao')
                        .ilike('nome', searchTerm)
                        .eq('ativo', true)
                        .limit(3),

                    // Lançamentos
                    supabase
                        .from('lancamentos')
                        .select('id, nome_lancamento, especialista')
                        .or(`nome_lancamento.ilike.${searchTerm},especialista.ilike.${searchTerm}`)
                        .eq('ativo', true)
                        .limit(3),

                    // Desafios
                    supabase
                        .from('gamificacao_desafios')
                        .select('id, titulo')
                        .ilike('titulo', searchTerm)
                        .eq('ativo', true)
                        .limit(3),

                    // Testes
                    supabase
                        .from('laboratorio_testes')
                        .select('id, nome_teste, objetivo')
                        .or(`nome_teste.ilike.${searchTerm},objetivo.ilike.${searchTerm}`)
                        .limit(3),
                ]);

                const newResults: SearchResult[] = [];

                clientes.data?.forEach(c => newResults.push({
                    id: c.id,
                    title: c.nome_fantasia || c.razao_social,
                    type: 'cliente',
                    url: `/clientes/${c.id}`
                }));

                colaboradores.data?.forEach(c => newResults.push({
                    id: c.id,
                    title: c.nome,
                    subtitle: c.funcao,
                    type: 'colaborador',
                    url: `/equipe` // Adjust if there's a specific profile page
                }));

                lancamentos.data?.forEach(l => newResults.push({
                    id: l.id,
                    title: l.nome_lancamento,
                    subtitle: l.especialista,
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
                    title: t.nome_teste,
                    subtitle: t.objetivo,
                    type: 'teste',
                    url: `/laboratorio-testes` // Adjust to open specific test
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

    const handleSelect = (url: string) => {
        setOpen(false);
        navigate(url);
    };

    const getIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'cliente': return Briefcase;
            case 'colaborador': return Users;
            case 'lancamento': return Rocket;
            case 'desafio': return Trophy;
            case 'teste': return FlaskConical;
            default: return Search;
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
                                        const Icon = getIcon(item.type);
                                        return (
                                            <CommandItem
                                                key={item.id}
                                                onSelect={() => handleSelect(item.url)}
                                                value={item.id} // Add unique value key
                                                className="flex items-center gap-3 py-3 cursor-pointer"
                                            >
                                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                                                    <Icon className="h-4 w-4 text-primary" />
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
        </>
    );
}
