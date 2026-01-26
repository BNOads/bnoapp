import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { supabase } from "@/integrations/supabase/client";
import { CRMColumn } from './CRMColumn';
import { CRMCard } from './CRMCard';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { NewLeadModal } from './NewLeadModal';
import { EditColumnModal } from './EditColumnModal';
import { MoveCardActionModal } from './MoveCardActionModal';
import { EditCardModal } from './EditCardModal';

interface CRMBoardProps {
    readOnly: boolean;
}

export const CRMBoard = ({ readOnly }: CRMBoardProps) => {
    const [columns, setColumns] = useState<any[]>([]);
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCard, setActiveCard] = useState<any>(null);
    const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<any>(null);
    const [initialColumnId, setInitialColumnId] = useState<string | null>(null);
    const [movingCard, setMovingCard] = useState<{ card: any, targetColumn: any } | null>(null);
    const [editingCard, setEditingCard] = useState<any>(null);
    const [search, setSearch] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchData();

        // Subscribe to real-time changes
        let timer: any;
        const debouncedFetch = () => {
            clearTimeout(timer);
            timer = setTimeout(() => fetchData(true), 500);
        };

        const channel = supabase
            .channel('crm_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_cards' },
                debouncedFetch
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_columns' },
                debouncedFetch
            )
            .subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async (background = false) => {
        if (!background) setLoading(true);
        try {
            console.log('Fetching CRM data...');
            const { data: cols, error: colErr } = await supabase
                .from('crm_columns')
                .select('*')
                .order('order', { ascending: true });

            if (colErr) {
                console.error('Columns error:', colErr);
                throw colErr;
            }

            const { data: cardsData, error: cardErr } = await supabase
                .from('crm_cards')
                .select('*, owner:owner_id(nome)')
                .order('created_at', { ascending: true });

            if (cardErr) {
                console.error('Cards error:', cardErr);
                // Try fetching without join if join fails
                const { data: fallbackCards, error: fbErr } = await supabase
                    .from('crm_cards')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (fbErr) throw fbErr;
                if (fallbackCards) setCards(fallbackCards);
            } else if (cardsData) {
                setCards(cardsData);
            }

            if (cols) setColumns(cols);
        } catch (err: any) {
            console.error('Total fetch error:', err);
            const errorMsg = err.message || err.details || "Erro de conexão";
            if (!background) toast.error(`Erro ao carregar CRM: ${errorMsg}`);
        } finally {
            if (!background) setLoading(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        if (readOnly) return;
        const { active } = event;
        const activeData = active.data.current;

        if (activeData?.type === 'Card') {
            setActiveCard(activeData.card);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (readOnly) return;
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveACard = active.data.current?.type === 'Card';
        const isOverACard = over.data.current?.type === 'Card';
        const isOverAColumn = over.data.current?.type === 'Column';

        if (!isActiveACard) return;

        // Dropping a card over another card
        if (isActiveACard && isOverACard) {
            setCards((cardsElements) => {
                const activeIndex = cardsElements.findIndex((c) => c.id === activeId);
                const overIndex = cardsElements.findIndex((c) => c.id === overId);

                if (cardsElements[activeIndex].column_id !== cardsElements[overIndex].column_id) {
                    cardsElements[activeIndex].column_id = cardsElements[overIndex].column_id;
                    return arrayMove(cardsElements, activeIndex, overIndex - 1);
                }

                return arrayMove(cardsElements, activeIndex, overIndex);
            });
        }

        // Dropping a card over a column
        if (isActiveACard && isOverAColumn) {
            setCards((cardsElements) => {
                const activeIndex = cardsElements.findIndex((c) => c.id === activeId);
                cardsElements[activeIndex].column_id = overId as string;
                return arrayMove(cardsElements, activeIndex, activeIndex);
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (readOnly) return;
        setActiveCard(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Update database for card movement
        const card = cards.find(c => c.id === activeId);
        const targetColumn = columns.find(c => c.id === overId) || columns.find(c => c.id === cards.find(x => x.id === overId)?.column_id);

        if (card && targetColumn) {
            const isWin = targetColumn.name.toLowerCase() === 'ganho';

            if (isWin) {
                setMovingCard({ card, targetColumn });
                return;
            }

            const { error } = await supabase.from('crm_cards').update({
                column_id: targetColumn.id,
                order: cards.filter(c => c.column_id === targetColumn.id).length
            }).eq('id', activeId);

            if (error) {
                toast.error("Erro ao salvar movimentação");
                fetchData();
            }
        }
    };

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm("Tem certeza que deseja excluir este lead?")) return;
        try {
            const { error } = await supabase.from('crm_cards').delete().eq('id', cardId);
            if (error) throw error;
            toast.success("Lead excluído!");
            setCards(prev => prev.filter(c => c.id !== cardId));
        } catch (err) {
            console.error('Error deleting card:', err);
            toast.error("Erro ao excluir lead");
        }
    };

    const filteredCards = cards.filter(card =>
        (card.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (card.company?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (card.segment?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                    <h1 className="text-3xl font-bold">CRM Kanban</h1>
                    <Button variant="ghost" size="icon" onClick={() => fetchData()}>
                        <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                </div>

                <div className="flex items-center space-x-2 flex-grow max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar leads..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                    {!readOnly && (
                        <Button onClick={() => {
                            setInitialColumnId(null);
                            setIsNewLeadModalOpen(true);
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Lead
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 h-[calc(100vh-200px)] min-w-full">
                        <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                            {columns.map(column => (
                                <CRMColumn
                                    key={column.id}
                                    column={column}
                                    cards={filteredCards.filter(c => c.column_id === column.id)}
                                    readOnly={readOnly}
                                    onEditColumn={() => setEditingColumn(column)}
                                    onCardClick={(card) => setEditingCard(card)}
                                    onDeleteCard={handleDeleteCard}
                                    onAddCard={() => {
                                        setInitialColumnId(column.id);
                                        setIsNewLeadModalOpen(true);
                                    }}
                                />
                            ))}
                        </SortableContext>
                        {!readOnly && (
                            <Button
                                variant="ghost"
                                className="h-full w-80 border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 flex flex-col items-center justify-center space-y-2 opacity-50 hover:opacity-100 transition-all"
                                onClick={() => setEditingColumn({ name: '', color: '#94a3b8' })}
                            >
                                <Plus className="h-8 w-8" />
                                <span>Nova Coluna</span>
                            </Button>
                        )}
                    </div>

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                                active: {
                                    opacity: "0.5",
                                },
                            },
                        }),
                    }}>
                        {activeCard ? <CRMCard card={activeCard} readOnly={readOnly} isOverlay /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <NewLeadModal
                isOpen={isNewLeadModalOpen}
                onClose={() => {
                    setIsNewLeadModalOpen(false);
                    setInitialColumnId(null);
                }}
                onSuccess={() => {
                    setIsNewLeadModalOpen(false);
                    setInitialColumnId(null);
                    // Instead of optimistic add, we trigger a silent fetch to ensure all joins (like owner) are loaded
                    // and use a small delay to let the database finish its transaction.
                    setTimeout(() => fetchData(true), 300);
                }}
                columns={columns}
                initialColumnId={initialColumnId}
            />

            <EditColumnModal
                isOpen={!!editingColumn}
                onClose={() => setEditingColumn(null)}
                onSuccess={fetchData}
                column={editingColumn}
            />

            {movingCard && (
                <MoveCardActionModal
                    card={movingCard.card}
                    targetColumn={movingCard.targetColumn}
                    onConfirm={() => {
                        setMovingCard(null);
                        fetchData();
                    }}
                    onCancel={() => {
                        setMovingCard(null);
                        fetchData(); // Reload to fix state
                    }}
                />
            )}

            {editingCard && (
                <EditCardModal
                    isOpen={!!editingCard}
                    onClose={() => setEditingCard(null)}
                    onSuccess={fetchData}
                    card={editingCard}
                    columns={columns}
                />
            )}
        </div>
    );
};
