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
  // Banner de diagnóstico conforme PRD - só mostra se houver erro ou sucesso
  if (!lastError && !debugInfo?.tasksCount) return null;

  return (
    <Alert className={`${lastError ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
      {lastError ? (
        <XCircle className="h-4 w-4 text-red-600" />
      ) : (
        <CheckCircle className="h-4 w-4 text-green-600" />
      )}
      <AlertTitle className={lastError ? 'text-red-800' : 'text-green-800'}>
        {lastError ? 'Falha na Integração ClickUp' : '✅ Tarefas sincronizadas com sucesso'}
      </AlertTitle>
      <AlertDescription className={`${lastError ? 'text-red-700' : 'text-green-700'} flex items-center justify-between`}>
        <span>
          {lastError || `Integração ClickUp funcionando corretamente. ${debugInfo?.tasksCount || 0} tarefas carregadas.`}
        </span>
        <Button 
          onClick={onRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="ml-4"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </AlertDescription>
    </Alert>
  );
}