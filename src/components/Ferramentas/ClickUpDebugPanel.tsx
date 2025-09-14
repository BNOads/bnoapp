import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface DebugInfo {
  success?: boolean;
  teamId?: string;
  userEmail?: string;
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
  if (!lastError && !debugInfo) return null;

  return (
    <Card className="border-orange-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          Diagnóstico ClickUp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Erro Principal</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        )}

        {debugInfo && (
          <div className="space-y-3">
            {debugInfo.userEmail && (
              <div className="text-sm">
                <strong>Email:</strong> {debugInfo.userEmail}
              </div>
            )}

            {debugInfo.teams && debugInfo.teams.length > 0 && (
              <div className="text-sm">
                <strong>Times disponíveis:</strong>{' '}
                {debugInfo.teams.map(t => `${t.name} (#${t.id})`).join(', ')}
              </div>
            )}

            {typeof debugInfo.memberCount === 'number' && (
              <div className="text-sm">
                <strong>Membros encontrados:</strong> {debugInfo.memberCount} •{' '}
                <strong>Match encontrado:</strong>{' '}
                {debugInfo.matchedMember ? (
                  <span className="text-green-600 font-medium">Sim</span>
                ) : (
                  <span className="text-red-600 font-medium">Não</span>
                )}
              </div>
            )}

            {typeof debugInfo.spaceCount === 'number' && (
              <div className="text-sm">
                <strong>Spaces encontrados:</strong> {debugInfo.spaceCount}
              </div>
            )}

            {debugInfo.steps && debugInfo.steps.length > 0 && (
              <div>
                <strong className="text-sm">Passos executados:</strong>
                <div className="mt-2 space-y-1">
                  {debugInfo.steps.map((step, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 text-xs p-2 rounded bg-gray-50"
                    >
                      {step.ok ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span className="flex-1">{step.step}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        step.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {step.status} {step.statusText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugInfo.errors && debugInfo.errors.length > 0 && (
              <div>
                <strong className="text-sm text-red-600">Erros encontrados:</strong>
                <ul className="mt-1 space-y-1">
                  {debugInfo.errors.map((error, index) => (
                    <li key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {debugInfo.listSamples && debugInfo.listSamples.length > 0 && (
              <div>
                <strong className="text-sm">Samples de listas (primeiros 3 spaces):</strong>
                <div className="mt-1 text-xs space-y-1">
                  {debugInfo.listSamples.map((sample, index) => (
                    <div key={index} className="bg-blue-50 p-2 rounded">
                      Space {sample.spaceId}: {sample.listCount} listas
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={onRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Testando...' : 'Testar Novamente'}
        </Button>
      </CardContent>
    </Card>
  );
}