import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMetaAdAccounts } from "@/hooks/useMetaAdAccounts";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const MetaSyncStatus = () => {
  const { accounts, syncAccount, isSyncing } = useMetaAdAccounts();
  const { toast } = useToast();
  const [syncingAll, setSyncingAll] = useState(false);

  const { data: syncLogs, isLoading } = useQuery({
    queryKey: ['meta-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_sync_logs')
        .select(`
          *,
          meta_ad_accounts (name, meta_account_id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const handleSyncAll = async () => {
    setSyncingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const account of accounts.filter(a => a.is_active)) {
      try {
        await syncAccount({ ad_account_id: account.id });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setSyncingAll(false);
    toast({
      title: "Sincronização em lote concluída",
      description: `${successCount} contas sincronizadas, ${errorCount} erros.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Concluído</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Rodando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sincronização
          </CardTitle>
          <Button
            onClick={handleSyncAll}
            disabled={syncingAll || isSyncing || accounts.length === 0}
            size="sm"
          >
            {syncingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar Todas
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : syncLogs && syncLogs.length > 0 ? (
          <div className="space-y-2">
            {syncLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                <div className="flex-1">
                  <p className="font-medium">{log.meta_ad_accounts?.name || 'Conta desconhecida'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                    {log.sync_type === 'daily_cron' && ' (automático)'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {log.records_synced !== null && (
                    <span className="text-xs text-muted-foreground">{log.records_synced} registros</span>
                  )}
                  {log.duration_ms !== null && (
                    <span className="text-xs text-muted-foreground">{Math.round(log.duration_ms / 1000)}s</span>
                  )}
                  {getStatusBadge(log.status)}
                </div>
                {log.error_message && (
                  <p className="text-xs text-red-500 mt-1 w-full">{log.error_message}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma sincronização realizada ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
