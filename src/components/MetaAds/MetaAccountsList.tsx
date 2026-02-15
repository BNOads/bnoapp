import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Link2, Unlink, Wand2, RefreshCw, Search, X, CheckSquare } from "lucide-react";
import { useMetaAdAccounts } from "@/hooks/useMetaAdAccounts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const MetaAccountsList = () => {
  const { accounts, isLoading, associate, isAssociating, dissociate, isDissociating, autoAssociate, isAutoAssociating, syncAccount, isSyncing } = useMetaAdAccounts();
  const { toast } = useToast();
  const [associatingAccountId, setAssociatingAccountId] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);

  // Bulk selection
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [bulkClienteSearch, setBulkClienteSearch] = useState("");
  const [bulkClienteId, setBulkClienteId] = useState("");
  const [bulkPopoverOpen, setBulkPopoverOpen] = useState(false);
  const [bulkAssociating, setBulkAssociating] = useState(false);

  // Fetch clients for association dropdown
  const { data: clientes } = useQuery({
    queryKey: ['clientes-for-meta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  // Filtered clients for inline search
  const filteredClientes = useMemo(() => {
    if (!clientes) return [];
    if (!clienteSearch.trim()) return clientes;
    const term = clienteSearch.toLowerCase();
    return clientes.filter(c => c.nome.toLowerCase().includes(term));
  }, [clientes, clienteSearch]);

  // Filtered clients for bulk search
  const bulkFilteredClientes = useMemo(() => {
    if (!clientes) return [];
    if (!bulkClienteSearch.trim()) return clientes;
    const term = bulkClienteSearch.toLowerCase();
    return clientes.filter(c => c.nome.toLowerCase().includes(term));
  }, [clientes, bulkClienteSearch]);

  // Unlinked accounts (for bulk selection)
  const unlinkedAccounts = accounts.filter(a => !a.meta_client_ad_accounts || a.meta_client_ad_accounts.length === 0);

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAccounts.size === unlinkedAccounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(unlinkedAccounts.map(a => a.id)));
    }
  };

  const handleBulkAssociate = async () => {
    if (!bulkClienteId || selectedAccounts.size === 0) return;
    setBulkAssociating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const accountId of selectedAccounts) {
      try {
        await associate({ ad_account_id: accountId, cliente_id: bulkClienteId });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setBulkAssociating(false);
    setSelectedAccounts(new Set());
    setBulkClienteId("");
    setBulkClienteSearch("");

    toast({
      title: "Vinculação em massa concluída",
      description: `${successCount} contas vinculadas${errorCount > 0 ? `, ${errorCount} erros` : ''}.`,
    });
  };

  const handleAssociate = async (adAccountId: string) => {
    if (!selectedClienteId) return;
    try {
      await associate({ ad_account_id: adAccountId, cliente_id: selectedClienteId });
      toast({ title: "Conta vinculada!", description: "A conta de anúncio foi vinculada ao cliente." });
      setAssociatingAccountId(null);
      setSelectedClienteId("");
      setClienteSearch("");
    } catch (err: any) {
      toast({ title: "Erro ao vincular", description: err.message, variant: "destructive" });
    }
  };

  const handleDissociate = async (adAccountId: string, clienteId: string) => {
    try {
      await dissociate({ ad_account_id: adAccountId, cliente_id: clienteId });
      toast({ title: "Conta desvinculada", description: "A associação foi removida." });
    } catch (err: any) {
      toast({ title: "Erro ao desvincular", description: err.message, variant: "destructive" });
    }
  };

  const handleAutoAssociate = async () => {
    try {
      const result = await autoAssociate(true);
      toast({
        title: "Associação automática concluída",
        description: `${result.count} associações criadas.`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSync = async (adAccountId: string) => {
    setSyncingAccountId(adAccountId);
    try {
      const result = await syncAccount({ ad_account_id: adAccountId });
      toast({
        title: "Sincronização concluída",
        description: `${result.records_synced} registros sincronizados em ${Math.round(result.duration_ms / 1000)}s`,
      });
    } catch (err: any) {
      toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const getStatusLabel = (status: number | null) => {
    switch (status) {
      case 1: return <Badge variant="outline" className="bg-green-500/10 text-green-600">Ativa</Badge>;
      case 2: return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Desativada</Badge>;
      case 3: return <Badge variant="outline" className="bg-red-500/10 text-red-600">Suspensa</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>Contas de Anúncio ({accounts.length})</CardTitle>
          <div className="flex items-center gap-2">
            {selectedAccounts.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedAccounts.size} selecionadas</Badge>
                <Popover open={bulkPopoverOpen} onOpenChange={setBulkPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="default" size="sm">
                      <Link2 className="h-4 w-4 mr-2" />
                      Vincular Selecionadas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-3" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Vincular {selectedAccounts.size} contas a:</p>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar cliente..."
                          value={bulkClienteSearch}
                          onChange={(e) => setBulkClienteSearch(e.target.value)}
                          className="pl-9 h-9"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {bulkFilteredClientes.map((c) => (
                          <button
                            key={c.id}
                            className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted transition-colors ${bulkClienteId === c.id ? 'bg-primary/10 font-medium' : ''}`}
                            onClick={() => setBulkClienteId(c.id)}
                          >
                            {c.nome}
                          </button>
                        ))}
                        {bulkFilteredClientes.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum cliente encontrado</p>
                        )}
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => { handleBulkAssociate(); setBulkPopoverOpen(false); }}
                        disabled={!bulkClienteId || bulkAssociating}
                      >
                        {bulkAssociating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Confirmar Vinculação
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAccounts(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoAssociate}
              disabled={isAutoAssociating}
            >
              {isAutoAssociating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Associação Automática
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma conta de anúncio encontrada. Valide seu token Meta para descobrir contas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    {unlinkedAccounts.length > 0 && (
                      <Checkbox
                        checked={selectedAccounts.size === unlinkedAccounts.length && unlinkedAccounts.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todas"
                      />
                    )}
                  </TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>ID Meta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente Vinculado</TableHead>
                  <TableHead>Última Sync</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const linkedClients = account.meta_client_ad_accounts || [];
                  const isCurrentlyAssociating = associatingAccountId === account.id;
                  const isUnlinked = linkedClients.length === 0;

                  return (
                    <TableRow key={account.id} className={selectedAccounts.has(account.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        {isUnlinked && (
                          <Checkbox
                            checked={selectedAccounts.has(account.id)}
                            onCheckedChange={() => toggleAccountSelection(account.id)}
                            aria-label={`Selecionar ${account.name}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          {account.business_name && (
                            <p className="text-xs text-muted-foreground">{account.business_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{account.meta_account_id}</TableCell>
                      <TableCell>{getStatusLabel(account.account_status)}</TableCell>
                      <TableCell>
                        {linkedClients.length > 0 ? (
                          <div className="space-y-1">
                            {linkedClients.map((link) => (
                              <div key={link.id} className="flex items-center gap-2">
                                <Badge variant="outline">{link.clientes?.nome || 'N/A'}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleDissociate(account.id, link.cliente_id)}
                                  disabled={isDissociating}
                                >
                                  <Unlink className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : isCurrentlyAssociating ? (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Buscar cliente..."
                                value={clienteSearch}
                                onChange={(e) => setClienteSearch(e.target.value)}
                                className="h-8 pl-7 text-sm w-[200px]"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-[150px] overflow-y-auto border rounded-md">
                              {filteredClientes.map((c) => (
                                <button
                                  key={c.id}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${selectedClienteId === c.id ? 'bg-primary/10 font-medium' : ''}`}
                                  onClick={() => setSelectedClienteId(c.id)}
                                >
                                  {c.nome}
                                </button>
                              ))}
                              {filteredClientes.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-2">Nenhum resultado</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAssociate(account.id)}
                                disabled={!selectedClienteId || isAssociating}
                              >
                                {isAssociating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Vincular'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => { setAssociatingAccountId(null); setSelectedClienteId(""); setClienteSearch(""); }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Não vinculada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {account.last_synced_at
                          ? new Date(account.last_synced_at).toLocaleString('pt-BR')
                          : 'Nunca'}
                        {account.sync_error && (
                          <p className="text-red-500 text-xs mt-1">{account.sync_error}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isCurrentlyAssociating && linkedClients.length === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => { setAssociatingAccountId(account.id); setClienteSearch(""); setSelectedClienteId(""); }}
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Vincular
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleSync(account.id)}
                            disabled={isSyncing && syncingAccountId === account.id}
                          >
                            {isSyncing && syncingAccountId === account.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
