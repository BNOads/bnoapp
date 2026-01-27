import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Instagram,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Briefcase,
  Trash2,
  User
} from 'lucide-react';
import { format, isToday, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMCardProps {
  card: any;
  readOnly: boolean;
  isOverlay?: boolean;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

const getOriginIcon = (origin: string) => {
  switch (origin?.toLowerCase()) {
    case 'pago': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] py-0">Anúncio</Badge>;
    case 'frio': return <Badge variant="outline" className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-[10px] py-0">Frio</Badge>;
    case 'indicação':
    case 'indicacao': return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] py-0">Indicação</Badge>;
    case 'organico':
    case 'orgânico': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] py-0">Orgânico</Badge>;
    default: return origin ? <Badge variant="outline" className="text-[10px] py-0">{origin}</Badge> : null;
  }
};

export const CRMCard = ({ card, readOnly, isOverlay, onClick, onDelete }: CRMCardProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'Card',
      card,
    },
    disabled: readOnly,
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const getSlaBadge = () => {
    if (!card.next_action_at) return null;
    const date = parseISO(card.next_action_at);

    if (isToday(date)) {
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] py-0 px-1.5 h-4">Hoje</Badge>;
    }
    if (isBefore(date, new Date())) {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] py-0 px-1.5 h-4">Atrasado</Badge>;
    }
    return null;
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-primary border-dashed rounded-lg h-24"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`group relative hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing shadow-sm ${isOverlay ? 'scale-105 shadow-xl rotate-1 z-50 border-primary cursor-grabbing' : ''}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium text-xs line-clamp-2 leading-tight flex-1">{card.title}</h4>
          <div className="flex flex-col items-end gap-1">
            {getSlaBadge()}
            {!readOnly && !isOverlay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDelete) onDelete(card.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-all"
                title="Excluir Lead"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 items-center">
          {getOriginIcon(card.origin)}
          {card.segment && (
            <Badge variant="secondary" className="text-[10px] py-0 font-normal opacity-70">
              {card.segment}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
          <div className="flex items-center space-x-2 overflow-hidden">
            {card.instagram && (
              <div className="flex items-center min-w-0">
                <Instagram className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                <span className="truncate">@{card.instagram.replace('@', '')}</span>
              </div>
            )}
            {card.amount > 0 && (
              <div className="flex items-center shrink-0">
                <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.amount)}</span>
              </div>
            )}
          </div>

          {card.owner?.nome && (
            <div className="flex items-center text-[9px] bg-muted px-1 rounded ml-1 shrink-0 max-w-[60px]">
              <User className="h-2 w-2 mr-0.5" />
              <span className="truncate">{card.owner.nome.split(' ')[0]}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};