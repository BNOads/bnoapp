import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface TarefaCardProps {
  tarefa: {
    id: string;
    name: string;
    status: {
      status: string;
      color: string;
    };
    due_date?: string;
    description?: string;
  };
  onConcluir: (taskId: string) => Promise<void>;
}

export function TarefaCard({ tarefa, onConcluir }: TarefaCardProps) {
  const [concluindo, setConcluindo] = useState(false);
  const isCompleted = tarefa.status.status.toLowerCase() === "complete" || 
                      tarefa.status.status.toLowerCase() === "closed";

  const handleConcluir = async () => {
    setConcluindo(true);
    try {
      await onConcluir(tarefa.id);
    } finally {
      setConcluindo(false);
    }
  };

  return (
    <Card className={isCompleted ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 mt-0.5"
            onClick={handleConcluir}
            disabled={isCompleted || concluindo}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
            )}
          </Button>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-medium ${isCompleted ? "line-through" : ""}`}>
                {tarefa.name}
              </h4>
              
              <Badge 
                variant="outline" 
                style={{ 
                  borderColor: tarefa.status.color,
                  color: tarefa.status.color 
                }}
                className="text-xs"
              >
                {tarefa.status.status}
              </Badge>
            </div>

            {tarefa.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tarefa.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {tarefa.due_date && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {format(parseISO(tarefa.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                asChild
              >
                <a 
                  href={`https://app.clickup.com/t/${tarefa.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir no ClickUp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
