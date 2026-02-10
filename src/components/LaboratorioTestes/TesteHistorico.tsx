import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTesteAuditLog } from '@/hooks/useLaboratorioTestes';
import { STATUS_LABELS, VALIDACAO_LABELS } from '@/types/laboratorio-testes';
import type { TesteAuditLog } from '@/types/laboratorio-testes';
import { format } from 'date-fns';

interface TesteHistoricoProps {
  testeId: string;
}

const getActionDescription = (log: TesteAuditLog) => {
  switch (log.acao) {
    case 'criado':
      return 'Teste criado';
    case 'editado':
      return 'Teste editado';
    case 'status_alterado': {
      const anterior = (STATUS_LABELS as any)[log.valor_anterior || ''] || log.valor_anterior;
      const novo = (STATUS_LABELS as any)[log.valor_novo || ''] || log.valor_novo;
      return `Status alterado de "${anterior}" para "${novo}"`;
    }
    case 'validacao_alterada': {
      const anterior = (VALIDACAO_LABELS as any)[log.valor_anterior || ''] || log.valor_anterior;
      const novo = (VALIDACAO_LABELS as any)[log.valor_novo || ''] || log.valor_novo;
      return `Validação alterada de "${anterior}" para "${novo}"`;
    }
    case 'arquivado':
      return 'Teste arquivado';
    case 'comentario_adicionado':
      return 'Comentário adicionado';
    case 'duplicado':
      return 'Teste duplicado';
    default:
      return log.acao;
  }
};

const getActionColor = (acao: string) => {
  switch (acao) {
    case 'criado': return 'bg-emerald-500';
    case 'editado': return 'bg-blue-500';
    case 'status_alterado': return 'bg-amber-500';
    case 'validacao_alterada': return 'bg-violet-500';
    case 'arquivado': return 'bg-red-500';
    case 'comentario_adicionado': return 'bg-sky-500';
    default: return 'bg-gray-500';
  }
};

export const TesteHistorico = ({ testeId }: TesteHistoricoProps) => {
  const { logs, loading } = useTesteAuditLog(testeId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${getActionColor(log.acao)}`} />
                  {i < logs.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm">{getActionDescription(log)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {log.usuario?.nome || 'Sistema'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum histórico registrado.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
};
