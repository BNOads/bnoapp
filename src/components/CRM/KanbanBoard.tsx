import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn } from './KanbanColumn';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Filter } from 'lucide-react';
import { CardModal } from './CardModal';
import { ColumnModal } from './ColumnModal';
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CRMCard } from './CRMCard';

export const KanbanBoard = () => {
  const [columns, setColumns] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<any>(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [columnsRes, cardsRes] = await Promise.all([
        supabase.from('crm_columns').select('*').order('order'),
        supabase.from('crm_cards').select('*').order('order')
      ]);

      if (columnsRes.error) throw columnsRes.error;
      if (cardsRes.error) throw cardsRes.error;

      setColumns(columnsRes.data || []);
      setCards(cardsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do CRM',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: any) => {
    const card = cards.find(c => c.id === event.active.id);
    setActiveCard(card);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id;
    const targetColumnId = over.id;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.column_id === targetColumnId) return;

    const targetColumn = columns.find(c => c.id === targetColumnId);
    
    // Calcular next_action_at baseado no SLA
    let nextActionAt = null;
    if (targetColumn?.column_sla_days) {
      const date = new Date();
      date.setDate(date.getDate() + targetColumn.column_sla_days);
      nextActionAt = date.toISOString();
    }

    try {
      const { error } = await supabase
        .from('crm_cards')
        .update({ 
          column_id: targetColumnId,
          next_action_at: nextActionAt
        })
        .eq('id', cardId);

      if (error) throw error;

      // Registrar atividade
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('crm_activity').insert({
          card_id: cardId,
          user_id: user.id,
          activity_type: 'moved',
          activity_data: {
            from_column: columns.find(c => c.id === card.column_id)?.name,
            to_column: targetColumn?.name
          }
        });
      }

      await loadData();

      toast({
        title: 'Card movido',
        description: `Card movido para ${targetColumn?.name}`
      });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o card',
        variant: 'destructive'
      });
    }
  };

  const handleCreateCard = (columnId: string) => {
    setEditingCard({ column_id: columnId });
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async () => {
    await loadData();
    setIsCardModalOpen(false);
    setEditingCard(null);
  };

  const handleCreateLead = () => {
    const firstColumn = columns[0];
    if (firstColumn) {
      setEditingCard({ column_id: firstColumn.id });
      setIsCardModalOpen(true);
    }
  };

  const handleEditColumn = (column: any) => {
    setEditingColumn(column);
    setIsColumnModalOpen(true);
  };

  const handleCreateColumn = () => {
    setEditingColumn(null);
    setIsColumnModalOpen(true);
  };

  const handleSaveColumn = async () => {
    await loadData();
    setIsColumnModalOpen(false);
    setEditingColumn(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">CRM - Pipeline de Vendas</h1>
          <Button onClick={handleCreateLead}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Lead
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateColumn}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Coluna
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <SortableContext 
            items={columns.map(c => c.id)} 
            strategy={horizontalListSortingStrategy}
          >
            {columns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={cards.filter(c => c.column_id === column.id)}
                onCreateCard={() => handleCreateCard(column.id)}
                onEditCard={handleEditCard}
                onEditColumn={() => handleEditColumn(column)}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-2 opacity-50">
              <CRMCard card={activeCard} onEdit={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CardModal
        isOpen={isCardModalOpen}
        card={editingCard}
        columns={columns}
        onClose={() => {
          setIsCardModalOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
      />

      <ColumnModal
        isOpen={isColumnModalOpen}
        column={editingColumn}
        onClose={() => {
          setIsColumnModalOpen(false);
          setEditingColumn(null);
        }}
        onSave={handleSaveColumn}
      />
    </div>
  );
};