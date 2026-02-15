import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, RefreshCw } from "lucide-react";
import { useClientAdAccounts } from "@/hooks/useMetaAdAccounts";
import { useMetaAdAccounts } from "@/hooks/useMetaAdAccounts";
import { useToast } from "@/hooks/use-toast";
import { AddAdAccountModal } from "./AddAdAccountModal";

interface ClienteAdAccountsSectionProps {
  clienteId: string;
  isAdmin: boolean;
}

export const ClienteAdAccountsSection = ({ clienteId, isAdmin }: ClienteAdAccountsSectionProps) => {
  const { adAccounts, isLoading, refetch } = useClientAdAccounts(clienteId);
  const { dissociate, isDissociating, syncAccount, isSyncing } = useMetaAdAccounts();
  const { toast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleRemove = async (adAccountId: string) => {
    try {
      await dissociate({ ad_account_id: adAccountId, cliente_id: clienteId });
      toast({ title: "Conta removida", description: "A conta de anúncio foi desvinculada do cliente." });
      refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSync = async (adAccountId: string) => {
    setSyncingId(adAccountId);
    try {
      const result = await syncAccount({ ad_account_id: adAccountId });
      toast({
        title: "Sincronização concluída",
        description: `${result.records_synced} registros sincronizados.`,
      });
      refetch();
    } catch (err: any) {
      toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  const getStatusBadge = (status: number | null) => {
    switch (status) {
      case 1: return <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">Ativa</Badge>;
      case 2: return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 text-xs">Desativada</Badge>;
      case 3: return <Badge variant="outline" className="bg-red-500/10 text-red-600 text-xs">Suspensa</Badge>;
      default: return <Badge variant="secondary" className="text-xs">-</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Contas de Anúncio</Label>
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Contas de Anúncio</Label>
        {isAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      <div className="border rounded-lg p-3 space-y-2">
        {adAccounts.length > 0 ? (
          adAccounts.map((link: any) => {
            const account = link.meta_ad_accounts;
            if (!account) return null;

            return (
              <div key={link.id} className="flex items-center justify-between p-2 bg-muted/50 rounded gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{account.meta_account_id}</p>
                </div>
                {getStatusBadge(account.account_status)}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isAdmin && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSync(account.id)}
                        disabled={isSyncing && syncingId === account.id}
                        title="Sincronizar"
                      >
                        {isSyncing && syncingId === account.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleRemove(account.id)}
                        disabled={isDissociating}
                        title="Remover"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nenhuma conta de anúncio vinculada
          </p>
        )}
      </div>

      <AddAdAccountModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        clienteId={clienteId}
        onSuccess={refetch}
      />
    </div>
  );
};
