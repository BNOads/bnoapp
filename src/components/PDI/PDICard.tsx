import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookOpen, CheckCircle } from "lucide-react";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PDICardProps {
  pdi: {
    id: string;
    titulo: string;
    descricao: string;
    data_limite: string;
    status: string;
    updated_at?: string;
    aulas: Array<{
      id: string;
      titulo: string;
      concluida: boolean;
      data_conclusao?: string;
    }>;
  };
  onViewDetails: (pdiId: string) => void;
  isCompleted?: boolean;
}

export function PDICard({ pdi, onViewDetails, isCompleted = false }: PDICardProps) {
  const aulasCompletas = pdi.aulas.filter(aula => aula.concluida).length;
  const totalAulas = pdi.aulas.length;
  const progresso = totalAulas > 0 ? (aulasCompletas / totalAulas) * 100 : 0;
  
  const dataLimite = new Date(pdi.data_limite);
  const hoje = new Date();
  const diasRestantes = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  const getStatusColor = () => {
    if (progresso === 100) return "bg-green-500";
    if (diasRestantes < 0) return "bg-red-500";
    if (diasRestantes <= 7) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getStatusText = () => {
    if (progresso === 100) return "Concluído";
    if (diasRestantes < 0) return "Atrasado";
    if (diasRestantes <= 7) return "Urgente";
    return "Em andamento";
  };

  return (
    <Card className={`h-full hover:shadow-lg transition-shadow ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={`text-lg ${isCompleted ? 'text-green-800' : ''}`}>
              {pdi.titulo}
            </CardTitle>
            <CardDescription className={`line-clamp-2 ${isCompleted ? 'text-green-600' : ''}`}>
              {pdi.descricao}
            </CardDescription>
            {isCompleted && pdi.updated_at && (
              <p className="text-sm text-green-600">
                Concluído em {new Date(pdi.updated_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`${isCompleted ? 'bg-green-500 text-white' : getStatusColor()} text-white`}
          >
            {isCompleted ? 'Concluído' : getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progresso</span>
            <span>{aulasCompletas}/{totalAulas} aulas</span>
          </div>
          <Progress value={progresso} className="h-2" />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {diasRestantes >= 0 
                ? `${diasRestantes} dias restantes`
                : `Atrasado há ${Math.abs(diasRestantes)} dias`
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{totalAulas} aulas</span>
          </div>
        </div>
        
        {progresso === 100 && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>PDI concluído!</span>
          </div>
        )}
        
        <Button 
          onClick={() => onViewDetails(pdi.id)}
          className="w-full"
          variant={progresso === 100 ? "secondary" : "default"}
        >
          {progresso === 100 ? "Ver Detalhes" : "Continuar Estudos"}
        </Button>
      </CardContent>
    </Card>
  );
}