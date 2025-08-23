import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, Pause } from "lucide-react";

interface StatusClienteProps {
  status: string;
  dataAdmissao?: string;
  ultimaAtualizacao?: string;
}

export const StatusCliente = ({ status, dataAdmissao, ultimaAtualizacao }: StatusClienteProps) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
        return {
          icon: CheckCircle,
          variant: 'default' as const,
          color: 'text-green-600',
          label: 'Ativo'
        };
      case 'pausado':
        return {
          icon: Pause,
          variant: 'secondary' as const,
          color: 'text-yellow-600',
          label: 'Pausado'
        };
      case 'inativo':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          color: 'text-red-600',
          label: 'Inativo'
        };
      default:
        return {
          icon: CheckCircle,
          variant: 'default' as const,
          color: 'text-green-600',
          label: 'Ativo'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const Icon = statusConfig.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${statusConfig.color}`} />
        <Badge variant={statusConfig.variant}>
          {statusConfig.label}
        </Badge>
      </div>
      
      {dataAdmissao && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Cliente desde: {new Date(dataAdmissao).toLocaleDateString('pt-BR')}</span>
        </div>
      )}
      
      {ultimaAtualizacao && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Última atualização: {ultimaAtualizacao}</span>
        </div>
      )}
    </div>
  );
};