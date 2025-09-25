import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUnmatchedAliases, clearUnmatchedAliases } from '@/lib/metricAliasResolver';
import { toast } from 'sonner';

interface UnmatchedAliasesDebugProps {
  show?: boolean;
}

export function UnmatchedAliasesDebug({ show = false }: UnmatchedAliasesDebugProps) {
  const unmatchedAliases = getUnmatchedAliases();
  
  if (!show || unmatchedAliases.length === 0) {
    return null;
  }

  const handleCopyAliases = () => {
    const aliasesText = unmatchedAliases.join(', ');
    navigator.clipboard.writeText(aliasesText);
    toast.success('Aliases copiados para a área de transferência');
  };

  const handleClearAliases = () => {
    clearUnmatchedAliases();
    toast.success('Lista de aliases não mapeados limpa');
  };

  return (
    <Alert className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">Aliases de métricas não reconhecidos encontrados:</p>
          <div className="flex flex-wrap gap-1">
            {unmatchedAliases.map((alias, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {alias}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyAliases}
              className="text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar aliases
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAliases}
              className="text-xs"
            >
              Limpar lista
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Estes aliases podem ser adicionados ao mapeamento para serem reconhecidos automaticamente.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}