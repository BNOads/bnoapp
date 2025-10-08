import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, BookOpen, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PDIEquipeCardProps {
  pdi: {
    id: string;
    titulo: string;
    descricao: string;
    data_limite: string;
    status: string;
    colaborador: {
      nome: string;
      avatar_url: string | null;
    };
    progresso: number;
    total_aulas: number;
    aulas_concluidas: number;
  };
}

export function PDIEquipeCard({ pdi }: PDIEquipeCardProps) {
  const navigate = useNavigate();
  
  const dataLimite = new Date(pdi.data_limite);
  const hoje = new Date();
  const diasRestantes = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  const getStatusColor = () => {
    if (pdi.status === 'concluido') return 'bg-green-500';
    if (diasRestantes < 0) return 'bg-red-500';
    if (diasRestantes <= 7) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (pdi.status === 'concluido') return 'Concluído';
    if (diasRestantes < 0) return 'Atrasado';
    if (diasRestantes <= 7) return 'Urgente';
    return 'Em andamento';
  };

  const getStatusBadgeVariant = () => {
    if (pdi.status === 'concluido') return 'default';
    if (diasRestantes < 0) return 'destructive';
    if (diasRestantes <= 7) return 'secondary';
    return 'default';
  };

  const handleVerDetalhes = () => {
    navigate(`/pdi/${pdi.id}`);
  };

  const concluido = pdi.status === 'concluido';
  const atrasado = diasRestantes < 0 && pdi.status !== 'concluido';

  return (
    <Card className={`${concluido ? 'bg-green-50 border-green-200' : atrasado ? 'bg-red-50 border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{pdi.titulo}</CardTitle>
              <Badge variant={getStatusBadgeVariant()} className={concluido ? 'bg-green-500 hover:bg-green-600' : ''}>
                {getStatusText()}
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">{pdi.descricao}</CardDescription>
          </div>
        </div>

        {/* Avatar e Nome do Colaborador */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Avatar className="h-8 w-8">
            <AvatarImage src={pdi.colaborador.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {pdi.colaborador.nome.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-muted-foreground">
            {pdi.colaborador.nome}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{pdi.aulas_concluidas}/{pdi.total_aulas} aulas</span>
          </div>
          <Progress value={pdi.progresso} className="h-2" />
        </div>

        {/* Info adicional */}
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
            <span>{pdi.total_aulas} aulas</span>
          </div>
        </div>

        {/* Indicador de PDI concluído */}
        {concluido && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            <span>
              Concluído em {new Date(pdi.data_limite).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}

        {/* Botão */}
        <Button 
          onClick={handleVerDetalhes}
          className="w-full"
          variant={concluido ? "outline" : "default"}
        >
          {concluido ? 'Ver Detalhes' : 'Continuar Estudos'}
        </Button>
      </CardContent>
    </Card>
  );
}
