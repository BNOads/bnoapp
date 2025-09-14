import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface DebugInfo {
  success?: boolean;
  teamId?: string;
  userEmail?: string;
  tasksCount?: number;
  userId?: string;
  timestamp?: string;
  duration?: number;
  retryAttempt?: number;
  retryStatus?: string;
  error?: string;
  detail?: string;
  status?: number;
  steps?: Array<{
    step: string;
    ok: boolean;
    status: number;
    statusText: string;
  }>;
  errors?: string[];
  teams?: Array<{ id: string; name: string }>;
  memberCount?: number;
  matchedMember?: boolean;
  spaceCount?: number;
  listSamples?: Array<{ spaceId: string; listCount: number }>;
}

interface ClickUpDebugPanelProps {
  debugInfo: DebugInfo | null;
  lastError: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function ClickUpDebugPanel({ 
  debugInfo, 
  lastError, 
  onRefresh, 
  refreshing 
}: ClickUpDebugPanelProps) {
  // Banner de diagnóstico conforme PRD - sempre mostra o status
  const hasSuccess = debugInfo?.tasksCount !== undefined;
  const lastExecution = debugInfo?.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : null;
  const duration = debugInfo?.duration ? `${debugInfo.duration}ms` : null;
  
  return (
    <Alert className={`${lastError ? 'border-red-200 bg-red-50' : hasSuccess ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
      {lastError ? (
        <XCircle className="h-4 w-4 text-red-600" />
      ) : hasSuccess ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <RefreshCw className="h-4 w-4 text-blue-600" />
      )}
      <AlertTitle className={lastError ? 'text-red-800' : hasSuccess ? 'text-green-800' : 'text-blue-800'}>
        {lastError ? 'Falha na Integração ClickUp' : hasSuccess ? '✅ Tarefas sincronizadas com sucesso' : 'Aguardando sincronização'}
      </AlertTitle>
      <AlertDescription className={`${lastError ? 'text-red-700' : hasSuccess ? 'text-green-700' : 'text-blue-700'} flex items-center justify-between`}>
        <div className="flex-1">
          {lastError ? (
            <div>
              <div>{lastError}</div>
              {debugInfo?.retryStatus && (
                <div className="text-sm mt-1">{debugInfo.retryStatus}</div>
              )}
              {lastExecution && (
                <div className="text-xs mt-1">Última execução: {lastExecution} {duration && `(${duration})`}</div>
              )}
            </div>
          ) : hasSuccess ? (
            <div>
              Integração ClickUp funcionando corretamente. {debugInfo.tasksCount} tarefas carregadas.
              {lastExecution && (
                <div className="text-xs mt-1">Última execução: {lastExecution} {duration && `(${duration})`}</div>
              )}
            </div>
          ) : (
            'Clique em Sincronizar para carregar suas tarefas do ClickUp'
          )}
        </div>
        <Button 
          onClick={onRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="ml-4 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Carregando...' : 'Sincronizar'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}