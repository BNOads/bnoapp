import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, AlertCircle, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { MetaSyncHistory } from "@/components/MetaAds/MetaSyncHistory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
interface MetaAdAccountManagerProps {
  clientId: string;
}

export const MetaAdAccountManager = ({ clientId }: MetaAdAccountManagerProps) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccountId, setNewAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, [clientId]);

  const loadAccounts = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('meta_client_ad_accounts')
        .select(`
          id,
          cliente_id,
          account_name,
          currency,
          account_status,
          ad_account_id,
          ad_account_details:meta_ad_accounts (
            meta_account_id,
            name,
            currency,
            account_status
          )
        `)
        .eq('cliente_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data for easier display
      const formattedAccounts = data?.map((acc: any) => ({
        id: acc.id, // Link ID
        ad_account_uuid: acc.ad_account_id, // Internal UUID
        // Prefer details from the joined table, fallback to the link table
        meta_account_id: acc.ad_account_details?.meta_account_id || '---',
        account_name: acc.ad_account_details?.name || acc.account_name,
        currency: acc.ad_account_details?.currency || acc.currency,
        account_status: acc.ad_account_details?.account_status
      })) || [];

      setAccounts(formattedAccounts);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountId.trim()) return;

    setLoading(true);
    try {
      const inputId = newAccountId.trim();
      // Ensure specific format if needed, mostly numeric or act_ prefix.

      // 1. Get System Connection ID
      const { data: connectionData, error: connError } = await supabase
        .from('meta_connections')
        .select('id')
        .eq('auth_type', 'system_user')
        .maybeSingle();

      if (connError) throw connError;
      if (!connectionData) throw new Error("Nenhuma conexão de sistema encontrada ('system_user').");

      const connectionId = connectionData.id;

      // 2. Check or Create Ad Account in meta_ad_accounts
      let adAccountUuid: string | null = null;

      const { data: existingAccount, error: fetchError } = await supabase
        .from('meta_ad_accounts')
        .select('id')
        .eq('meta_account_id', inputId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingAccount) {
        adAccountUuid = existingAccount.id;
      } else {
        // Create new
        const { data: newAccount, error: createError } = await supabase
          .from('meta_ad_accounts')
          .insert({
            connection_id: connectionId,
            meta_account_id: inputId,
            name: `Conta ${inputId}`, // Placeholder name until sync
            currency: 'BRL', // Default until sync
            account_status: 1 // Default active until sync
          })
          .select('id')
          .single();

        if (createError) throw createError;
        adAccountUuid = newAccount.id;
      }

      if (!adAccountUuid) throw new Error("Falha ao obter ID da conta de anúncios.");

      // 3. Link to Client
      const { error } = await supabase
        .from('meta_client_ad_accounts')
        .insert({
          cliente_id: clientId,
          ad_account_id: adAccountUuid,
          account_name: `Conta ${inputId}`,
          currency: 'BRL'
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error("Esta conta de anúncio já está vinculada neste cliente.");
        }
        throw error;
      }

      toast({
        title: "Conta adicionada",
        description: "A conta de anúncio foi vinculada.",
      });

      setNewAccountId("");
      loadAccounts();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('meta_client_ad_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Conta removida",
        description: "A conta de anúncio foi desvinculada.",
      });

      loadAccounts();
    } catch (error: any) {
      toast({
        title: "Erro ao remover conta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Integração MetaAds</h3>
          <p className="text-sm text-muted-foreground">
            Adicione os IDs das contas de anúncio do Facebook/Meta que pertencem a este cliente.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHistoryOpen(true)}
        >
          <History className="w-4 h-4 mr-2" />
          Histórico
        </Button>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="account_id">ID da Conta de Anúncios</Label>
          <Input
            id="account_id"
            placeholder="Ex: 123456789012345"
            value={newAccountId}
            onChange={(e) => setNewAccountId(e.target.value)}
          />
        </div>
        <Button onClick={handleAddAccount} disabled={loading || !newAccountId}>
          {loading ? <span className="animate-spin mr-2">⏳</span> : <Plus className="w-4 h-4 mr-2" />}
          Vincular
        </Button>
      </div>

      <div className="space-y-4">
        {fetching ? (
          <p className="text-sm text-muted-foreground animate-pulse">Carregando contas...</p>
        ) : accounts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma conta de anúncio vinculada.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{acc.account_name}</span>
                    {acc.account_status === 1 || acc.account_status === 'active' || acc.account_status === '1' ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa / Pendente</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">ID: {acc.meta_account_id} • Moeda: {acc.currency || '---'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveAccount(acc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <MetaSyncHistory />
        </DialogContent>
      </Dialog>
    </div>
  );
};
