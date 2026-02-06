import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { iconMap } from "./iconMap";

interface ValorCardProps {
  valor: {
    id: string;
    titulo: string;
    descricao: string;
    icone: string;
    ordem: number;
    ativo: boolean;
  };
  isAdmin: boolean;
  onEdit: (valor: any) => void;
  onDelete: (valor: any) => void;
  onToggle: (valor: any) => void;
}

export const ValorCard = ({ valor, isAdmin, onEdit, onDelete, onToggle }: ValorCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: valor.id,
    disabled: !isAdmin,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : valor.ativo ? 1 : 0.5,
  };

  const IconComponent = iconMap[valor.icone] || iconMap["Star"];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-5 border transition-all duration-200 hover:shadow-md ${
        valor.ativo ? "bg-card border-border" : "bg-muted/30 border-dashed border-muted-foreground/30"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Admin drag handle */}
        {isAdmin && (
          <button
            className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Icon */}
        <div className="bg-primary/10 p-2.5 rounded-xl flex-shrink-0">
          <IconComponent className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm">{valor.titulo}</h4>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{valor.descricao}</p>
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/50">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggle(valor)}>
            {valor.ativo ? (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(valor)}>
            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(valor)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </Card>
  );
};
