import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Instagram, Building2, DollarSign, Clock, Snowflake, Users, DollarSignIcon, TrendingUp } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMCardProps {
  card: any;
  onEdit: () => void;
  isDragging?: boolean;
}

export const CRMCard = ({ card, onEdit, isDragging }: CRMCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSorting ? 0.5 : 1,
  };

  const getOriginIcon = () => {
    switch (card.origin) {
      case 'Frio':
        return <Snowflake className="h-3 w-3 text-blue-400" />;
      case 'Indicação':
        return <Users className="h-3 w-3 text-green-500" />;
      case 'Pago':
        return <DollarSignIcon className="h-3 w-3 text-yellow-500" />;
      case 'Orgânico':
        return <TrendingUp className="h-3 w-3 text-purple-500" />;
      default:
        return null;
    }
  };

  const getOriginColor = () => {
    switch (card.origin) {
      case 'Frio':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Indicação':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Pago':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Orgânico':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActionBadge = () => {
    if (!card.next_action_at) return null;

    const actionDate = new Date(card.next_action_at);
    if (isPast(actionDate) && !isToday(actionDate)) {
      return <Badge variant="destructive" className="text-xs">Atrasado</Badge>;
    }
    if (isToday(actionDate)) {
      return <Badge className="bg-blue-500 text-xs">Hoje</Badge>;
    }
    return null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onEdit}
      className={`
        bg-background border rounded-lg p-3 space-y-2 cursor-pointer
        hover:shadow-md transition-shadow
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm line-clamp-2">{card.title}</h4>
        {getActionBadge()}
      </div>

      {card.origin && (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`text-xs ${getOriginColor()}`}>
            {getOriginIcon()}
            <span className="ml-1">{card.origin}</span>
          </Badge>
        </div>
      )}

      <div className="space-y-1 text-xs text-muted-foreground">
        {card.instagram && (
          <div className="flex items-center gap-1">
            <Instagram className="h-3 w-3" />
            <span>{card.instagram}</span>
          </div>
        )}
        
        {card.company && (
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span>{card.company}</span>
          </div>
        )}

        {card.amount && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>R$ {card.amount.toLocaleString('pt-BR')}</span>
          </div>
        )}
      </div>

      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.slice(0, 3).map((tag: string, index: number) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {card.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{card.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {card.next_action_at && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
          <Clock className="h-3 w-3" />
          <span>{format(new Date(card.next_action_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
        </div>
      )}
    </div>
  );
};