import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ParticipantesPopoverProps {
    googleEventId: string;
}

function useColaboradores() {
    return useQuery({
        queryKey: ["colaboradores-ativos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("colaboradores")
                .select("id, nome, avatar_url")
                .eq("ativo", true)
                .order("nome", { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });
}

function useEventParticipants(googleEventId: string) {
    return useQuery({
        queryKey: ["event-participants", googleEventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("google_event_participants")
                .select("colaborador_id")
                .eq("google_event_id", googleEventId);
            if (error) throw error;
            return (data ?? []).map((r: any) => r.colaborador_id as string);
        },
        staleTime: 5 * 60 * 1000,
    });
}

function useToggleParticipant(googleEventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ colaboradorId, selected }: { colaboradorId: string; selected: boolean }) => {
            if (selected) {
                // Remove
                const { error } = await supabase
                    .from("google_event_participants")
                    .delete()
                    .eq("google_event_id", googleEventId)
                    .eq("colaborador_id", colaboradorId);
                if (error) throw error;
            } else {
                // Add
                const { error } = await supabase
                    .from("google_event_participants")
                    .insert({ google_event_id: googleEventId, colaborador_id: colaboradorId });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event-participants", googleEventId] });
        },
    });
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

export function ParticipantesPopover({ googleEventId }: ParticipantesPopoverProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const { data: colaboradores = [] } = useColaboradores();
    const { data: selectedIds = [] } = useEventParticipants(googleEventId);
    const toggle = useToggleParticipant(googleEventId);

    const filtered = useMemo(() =>
        colaboradores.filter((c: any) =>
            c.nome.toLowerCase().includes(search.toLowerCase())
        ),
        [colaboradores, search]
    );

    const selectedColaboradores = useMemo(() =>
        colaboradores.filter((c: any) => selectedIds.includes(c.id)),
        [colaboradores, selectedIds]
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer" onClick={e => e.stopPropagation()}>
                    {/* Stacked avatars if any selected */}
                    {selectedColaboradores.length > 0 ? (
                        <div className="flex -space-x-2">
                            {selectedColaboradores.slice(0, 3).map((c: any) => (
                                <TooltipProvider key={c.id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                                                <AvatarImage src={c.avatar_url ?? undefined} />
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                    {getInitials(c.nome)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>{c.nome}</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                            {selectedColaboradores.length > 3 && (
                                <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarFallback className="text-[10px] bg-muted">
                                        +{selectedColaboradores.length - 3}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground gap-1 hover:text-foreground"
                        >
                            <Users className="h-3 w-3" />
                            Participantes
                        </Button>
                    )}
                </div>
            </PopoverTrigger>

            <PopoverContent
                className="w-64 p-0"
                align="start"
                onClick={e => e.stopPropagation()}
            >
                {/* Search */}
                <div className="p-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="pl-7 h-8 text-xs"
                            placeholder="Busque um colaborador..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* User list */}
                <div className="max-h-56 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado</p>
                    ) : (
                        filtered.map((c: any) => {
                            const isSelected = selectedIds.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => toggle.mutate({ colaboradorId: c.id, selected: isSelected })}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${isSelected ? "bg-accent/60" : ""}`}
                                >
                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                        <AvatarImage src={c.avatar_url ?? undefined} />
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                            {getInitials(c.nome)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate font-medium">{c.nome}</span>
                                    {isSelected && (
                                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {selectedIds.length > 0 && (
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                        {selectedIds.length} participante{selectedIds.length !== 1 ? "s" : ""} selecionado{selectedIds.length !== 1 ? "s" : ""}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
