import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CRMCard } from './CRMCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface KanbanColumnProps {
  column: any;
  cards: any[];
  onCreateCard: () => void;
  onEditCard: (card: any) => void;
}

export const KanbanColumn = ({ column, cards, onCreateCard, onEditCard }: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-semibold">{column.name}</h3>
            <span className="text-sm text-muted-foreground">
              {cards.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onCreateCard}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div 
          ref={setNodeRef}
          className="space-y-2 min-h-[200px]"
        >
          <SortableContext 
            items={cards.map(c => c.id)} 
            strategy={verticalListSortingStrategy}
          >
            {cards.map(card => (
              <CRMCard
                key={card.id}
                card={card}
                onEdit={() => onEditCard(card)}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};