import React, { useState, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, User } from "lucide-react";
import { TestesTable } from './TestesTable';
import type { TesteLaboratorio } from '@/types/laboratorio-testes';

interface TestesGroupedViewProps {
    testes: TesteLaboratorio[];
    onNavigate: (id: string) => void;
    onEdit: (teste: TesteLaboratorio) => void;
    onArchive: (id: string) => void;
    onDuplicate: (teste: TesteLaboratorio) => void;
    onStartTeste: (id: string) => void;
    onConcludeTeste: (id: string) => void;
    onRedoTeste: (id: string) => void;
    canEditAll: boolean;
    canEditOwn: boolean;
    canArchive: boolean;
    currentUserId: string | null;
    loading: boolean;
}

export const TestesGroupedView = ({
    testes,
    onNavigate,
    onEdit,
    onArchive,
    onDuplicate,
    onStartTeste,
    onConcludeTeste,
    onRedoTeste,
    canEditAll,
    canEditOwn,
    canArchive,
    currentUserId,
    loading
}: TestesGroupedViewProps) => {
    // Agrupar testes por gestor
    const groupedData = useMemo(() => {
        const groups: Record<string, { gestor: { id: string; nome: string; avatar_url?: string }; testes: TesteLaboratorio[] }> = {};

        testes.forEach(teste => {
            const gestorKey = teste.gestor?.id || 'sem_gestor';
            if (!groups[gestorKey]) {
                groups[gestorKey] = {
                    gestor: teste.gestor || { id: 'sem_gestor', nome: 'Sem Gestor Responsável' },
                    testes: []
                };
            }
            groups[gestorKey].testes.push(teste);
        });

        return Object.entries(groups).sort((a, b) => {
            if (a[0] === 'sem_gestor') return 1;
            if (b[0] === 'sem_gestor') return -1;
            return a[1].gestor.nome.localeCompare(b[1].gestor.nome);
        });
    }, [testes]);

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groupedData.map(([key]) => key)));

    const toggleGroup = (key: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedGroups(newExpanded);
    };

    const expandAll = () => setExpandedGroups(new Set(groupedData.map(([key]) => key)));
    const collapseAll = () => setExpandedGroups(new Set());

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Carregando visualização agrupada...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={expandAll} className="h-8 text-xs">
                    Expandir todos
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll} className="h-8 text-xs">
                    Recolher todos
                </Button>
                <span className="text-sm text-muted-foreground ml-auto">
                    {testes.length} testes em {groupedData.length} responsáveis
                </span>
            </div>

            {groupedData.map(([key, group]) => {
                const isExpanded = expandedGroups.has(key);
                return (
                    <Collapsible
                        key={key}
                        open={isExpanded}
                        onOpenChange={() => toggleGroup(key)}
                        className="border rounded-lg bg-card overflow-hidden shadow-sm"
                    >
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20">
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}

                                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                        {group.gestor.avatar_url ? (
                                            <AvatarImage src={group.gestor.avatar_url} />
                                        ) : null}
                                        <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                                            {group.gestor.nome === 'Sem Gestor Responsável' ? (
                                                <User className="h-4 w-4" />
                                            ) : (
                                                group.gestor.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                            )}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col">
                                        <span className="font-semibold text-gray-900 leading-none">
                                            {group.gestor.nome}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            Responsável por {group.testes.length} {group.testes.length === 1 ? 'teste' : 'testes'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700 border-none">
                                        {group.testes.length}
                                    </Badge>
                                </div>
                            </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <div className="p-0 border-t">
                                <TestesTable
                                    testes={group.testes}
                                    loading={false}
                                    onNavigate={onNavigate}
                                    onEdit={onEdit}
                                    onArchive={onArchive}
                                    onDuplicate={onDuplicate}
                                    onStartTeste={onStartTeste}
                                    onConcludeTeste={onConcludeTeste}
                                    onRedoTeste={onRedoTeste}
                                    canEditAll={canEditAll}
                                    canEditOwn={canEditOwn}
                                    canArchive={canArchive}
                                    currentUserId={currentUserId}
                                />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}

            {groupedData.length === 0 && (
                <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">Nenhum teste encontrado para agrupar.</p>
                </div>
            )}
        </div>
    );
};
