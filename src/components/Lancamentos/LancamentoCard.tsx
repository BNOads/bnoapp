import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LancamentoCardProps {
  lancamento: any;
  showActions?: boolean;
  compact?: boolean;
  onActionClick?: () => void;
}

export const LancamentoCard = ({ 
  lancamento, 
  showActions = true, 
  compact = false,
  onActionClick 
}: LancamentoCardProps) => {
  const navigate = useNavigate();

  const calcularDiasRestantes = () => {
    const hoje = new Date();
    const dataFim = new Date(lancamento.data_fim_captacao || lancamento.data_fechamento || hoje);
    return Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      em_captacao: 'bg-blue-500 hover:bg-blue-600',
      cpl: 'bg-orange-500 hover:bg-orange-600',
      remarketing: 'bg-purple-500 hover:bg-purple-600',
      finalizado: 'bg-green-500 hover:bg-green-600',
      pausado: 'bg-gray-500 hover:bg-gray-600',
      cancelado: 'bg-red-500 hover:bg-red-600',
    };
    return colors[status] || 'bg-gray-500 hover:bg-gray-600';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      em_captacao: 'Em Captação',
      cpl: 'CPL',
      remarketing: 'Remarketing',
      finalizado: 'Finalizado',
      pausado: 'Pausado',
      cancelado: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getBorderColor = (status: string) => {
    const borders: Record<string, string> = {
      em_captacao: 'border-blue-500/30 hover:border-blue-500/60',
      cpl: 'border-orange-500/30 hover:border-orange-500/60',
      remarketing: 'border-purple-500/30 hover:border-purple-500/60',
      finalizado: 'border-green-500/30 hover:border-green-500/60',
      pausado: 'border-gray-500/30 hover:border-gray-500/60',
      cancelado: 'border-red-500/30 hover:border-red-500/60',
    };
    return borders[status] || 'border-gray-500/30 hover:border-gray-500/60';
  };

  const diasRestantes = calcularDiasRestantes();
  const linkDestino = lancamento.link_publico 
    ? `/lancamento/${lancamento.link_publico}` 
    : `/lancamentos/${lancamento.id}`;

  return (
    <Card 
      className={`${getBorderColor(lancamento.status_lancamento)} border-2 transition-all duration-200 hover:shadow-md`}
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={`${getStatusColor(lancamento.status_lancamento)} text-white`}>
                {getStatusLabel(lancamento.status_lancamento)}
              </Badge>
              {diasRestantes > 0 && diasRestantes <= 30 && (
                <span className={`text-xs font-medium ${diasRestantes <= 5 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'} restantes
                </span>
              )}
            </div>
            
            <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} mb-1 line-clamp-1`}>
              {lancamento.nome_lancamento}
            </h3>
            
            {lancamento.promessa && !compact && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {lancamento.promessa}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {lancamento.data_inicio_captacao && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(lancamento.data_inicio_captacao).toLocaleDateString('pt-BR')}
                </div>
              )}
              {lancamento.investimento_total && (
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <DollarSign className="h-3 w-3" />
                  R$ {Number(lancamento.investimento_total).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                if (onActionClick) {
                  onActionClick();
                } else {
                  navigate(linkDestino);
                }
              }}
              className="flex-shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
