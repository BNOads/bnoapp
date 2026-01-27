import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CRMCard } from './CRMCard';
import { Button } from '@/components/ui/button';
import { Pencil, Clock, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CRMColumnProps {
    column: any;
    cards: any[];
    readOnly: boolean;
    onEditColumn: () => void;
    onCardClick: (card: any) => void;
    onDeleteCard: (id: string) => void;
    onAddCard: () => void;
}

export const CRMColumn = ({ column, cards, readOnly, onEditColumn, onCardClick, onDeleteCard, onAddCard }: CRMColumnProps) => {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
        disabled: true, // We only support moving cards for now to simplify
    });

    const isWinColumn = column.name.toLowerCase() === 'ganho';

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-col w-80 min-w-80 h-full rounded-xl bg-muted/50 border border-border/50 overflow-hidden ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="p-3 flex items-center justify-between border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color || '#94a3b8' }} />
                    <h3 className="font-semibold text-sm uppercase tracking-wider">{column.name}</h3>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                        {cards.length}
                    </Badge>
                    {column.column_sla_days > 0 && (
                        <div className="flex items-center text-[10px] text-muted-foreground ml-1">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            D+{column.column_sla_days}
                        </div>
                    )}
                </div>
                {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEditColumn}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
                <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {cards.map(card => (
                        <CRMCard
                            key={card.id}
                            card={card}
                            readOnly={readOnly}
                            isWinColumn={isWinColumn}
                            onClick={() => onCardClick(card)}
                            onDelete={onDeleteCard}
                        />
                    ))}
                </SortableContext>
            </div>

            {!readOnly && (
                <div className="p-2 border-t mt-auto">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground h-9"
                        size="sm"
                        onClick={onAddCard}
                    >
                        + Adicionar card
                    </Button>
                </div>
            )}
        </div>
    );
};
