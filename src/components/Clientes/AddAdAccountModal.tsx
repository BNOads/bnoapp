import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useMetaAdAccounts } from "@/hooks/useMetaAdAccounts";
import { useToast } from "@/hooks/use-toast";

interface AddAdAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSuccess: () => void;
}

export const AddAdAccountModal = ({ open, onOpenChange, clienteId, onSuccess }: AddAdAccountModalProps) => {
  const { accounts, associate, isAssociating } = useMetaAdAccounts();
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Filter accounts that are not already linked to this client
  const availableAccounts = accounts.filter(account => {
    const linkedToThisClient = account.meta_client_ad_accounts?.some(
      link => link.cliente_id === clienteId
    );
    return !linkedToThisClient;
  });

  const handleAdd = async () => {
    if (!selectedAccountId) return;

    try {
      await associate({ ad_account_id: selectedAccountId, cliente_id: clienteId });
      toast({
        title: "Conta adicionada!",
        description: "A conta de anúncio foi vinculada ao cliente.",
      });
      setSelectedAccountId("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Erro ao vincular conta",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Adicionar Conta de Anúncio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {availableAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta de anúncio disponível. Conecte seu token Meta em Ferramentas → Integrações Meta Ads.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Selecione a conta</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex flex-col">
                          <span>{account.name}</span>
                          <span className="text-xs text-muted-foreground">{account.meta_account_id}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={!selectedAccountId || isAssociating}>
                  {isAssociating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    'Vincular Conta'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
