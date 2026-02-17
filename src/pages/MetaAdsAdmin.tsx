import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Trash2, ArrowUpDown, Link2, Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MetaSyncHistory } from "@/components/MetaAds/MetaSyncHistory";

interface AdAccount {
    id: string; // Meta Ad Account ID (act_xxx)
    name: string;
    currency: string;
    account_status: number;
    is_prepay_account?: boolean;
    balance?: number | string;
    available_balance?: number;
    balance_source?: string;
}

interface LinkedAccount {
    ad_account_id: string;
    cliente_id: string;
    client_nome?: string;
}

const MetaAdsAdmin = () => {
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
    const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdAccount | 'client_nome'; direction: 'asc' | 'desc' } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all"); // all, active, inactive
    const [linkFilter, setLinkFilter] = useState<string>("all"); // all, linked, unlinked

    const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
    const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);

    const { toast } = useToast();

    const formatBalance = (balance?: number | string, currency?: string) => {
        if (balance === undefined || balance === null || balance === "") {
            return "-";
        }

        const parsed = Number(balance);
        if (Number.isNaN(parsed)) {
            return String(balance);
        }

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency || 'BRL'
        }).format(parsed);
    };

    const testConnection = async (adAccountId: string) => {
        setTestingId(adAccountId);
        setDiagnosticResult(null);
        setIsDiagnosticOpen(true);
        try {
            const { data, error } = await supabase.functions.invoke('meta-inspect-token', {
                body: { ad_account_id: adAccountId }
            });
            if (error) throw error;
            setDiagnosticResult(data);
        } catch (error: any) {
            setDiagnosticResult({ success: false, error: error.message });
        } finally {
            setTestingId(null);
        }
    };

    const renderDiagnosticStep = (step: any, index: number) => {
        const isOk = step.status === 'ok';
        const isError = step.status === 'error';
        return (
            <div key={index} className="flex gap-3 items-start p-3 border rounded-md mb-2 bg-muted/20">
                <div className="mt-0.5">
                    {isOk && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {isError && <AlertCircle className="h-5 w-5 text-destructive" />}
                    {!isOk && !isError && <Clock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm">{step.name}</p>
                    {step.error && <p className="text-xs text-destructive mt-1 font-mono break-all">{step.error}</p>}
                    {step.data && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(step.data, null, 2)}
                        </pre>
                    )}
                </div>
            </div>
        );
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch available accounts from Meta
            const { data: metaData, error: metaError } = await supabase.functions.invoke('meta-list-accounts');
            if (metaError) throw metaError;
            if (!metaData.success) throw new Error(metaData.error || 'Failed to fetch accounts');

            setAdAccounts((metaData.data || []).map((acc: any) => {
                const sourceBalance = acc.available_balance ?? acc.balance;
                const parsedBalance = sourceBalance !== undefined && sourceBalance !== null ? Number(sourceBalance) : undefined;
                const hasValidBalance = typeof parsedBalance === "number" && !Number.isNaN(parsedBalance);

                // Apply same heuristic as backend: if verified balance > 0, assume prepaid
                if (!acc.is_prepay_account && hasValidBalance && parsedBalance !== 0) {
                    return { ...acc, balance: parsedBalance, available_balance: parsedBalance, is_prepay_account: true };
                }

                return { ...acc, balance: hasValidBalance ? parsedBalance : acc.balance, available_balance: hasValidBalance ? parsedBalance : undefined };
            }));

            // 2. Fetch linked accounts
            const { data: dbLinks, error: dbError } = await supabase
                .from('meta_client_ad_accounts')
                .select(`
id,
    ad_account_primary: meta_ad_accounts(meta_account_id, is_prepay_account, balance),
        cliente_id,
        clientes(id, nome)
            `);

            if (dbError) throw dbError;

            const formattedLinks = dbLinks ? dbLinks.map((link: any) => ({
                ad_account_id: link.ad_account_primary?.meta_account_id, // Map internal UUID back to Meta ID
                cliente_id: link.cliente_id,
                client_nome: link.clientes?.nome
            })) : [];
            setLinkedAccounts(formattedLinks);

            // 3. Fetch Clients
            const { data: clientsData, error: clientsError } = await supabase
                .from('clientes')
                .select('id, nome')
                .order('nome');

            if (clientsError) throw clientsError;

            setClients(clientsData || []);

        } catch (error: any) {
            console.error('Error loading data:', error);
            toast({
                title: "Erro ao carregar",
                description: error.message || "Erro desconhecido",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLinkAccount = async (metaAdAccountId: string, clientId: string, accountName: string, currency: string, accountStatus: number) => {
        if (!clientId) return;
        try {
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
                .eq('meta_account_id', metaAdAccountId)
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
                        meta_account_id: metaAdAccountId,
                        name: accountName,
                        currency: currency,
                        account_status: accountStatus
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
                .upsert({
                    cliente_id: clientId,
                    ad_account_id: adAccountUuid, // Using the UUID FK
                    account_name: accountName,
                    currency: currency
                });

            if (error) throw error;

            toast({ title: "Conta vinculada", description: `Conta ${accountName} vinculada.` });

            // Update local state
            const newLink = {
                ad_account_id: metaAdAccountId, // Keep using Meta ID for local state matching with adAccounts list
                cliente_id: clientId,
                client_nome: clients.find(c => c.id === clientId)?.nome
            };
            setLinkedAccounts(prev => [...prev.filter(l => l.ad_account_id !== metaAdAccountId), newLink]);

        } catch (error: any) {
            console.error("Link Error:", error);
            toast({ title: "Erro ao vincular", description: error.message, variant: "destructive" });
        }
    };

    const handleUnlink = async (adAccountId: string) => {
        if (!confirm("Desvincular conta?")) return;
        try {
            const { error } = await supabase
                .from('meta_client_ad_accounts')
                .delete()
                .eq('ad_account_id', adAccountId);

            if (error) throw error;

            toast({ title: "Conta desvinculada" });
            setLinkedAccounts(prev => prev.filter(l => l.ad_account_id !== adAccountId));
        } catch (error: any) {
            toast({ title: "Erro ao desvincular", description: error.message, variant: "destructive" });
        }
    };

    const manualSync = async () => {
        setSyncing(true);
        try {
            const { error } = await supabase.functions.invoke('meta-ads-sync');
            if (error) throw error;
            toast({ title: "Sincronização iniciada" });
        } catch (error: any) {
            toast({ title: "Erro na sincronização", description: error.message, variant: "destructive" });
        } finally {
            setSyncing(false);
        }
    };

    // Sorting Logic
    const handleSort = (key: keyof AdAccount | 'client_nome') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedAccounts = () => {
        let items = [...adAccounts];

        // 1. Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            items = items.filter(acc =>
                (acc.name || '').toLowerCase().includes(query) ||
                (acc.id || '').toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'all') {
            items = items.filter(acc => {
                if (statusFilter === 'active') return acc.account_status === 1;
                if (statusFilter === 'inactive') return acc.account_status !== 1;
                return true;
            });
        }

        if (linkFilter !== 'all') {
            items = items.filter(acc => {
                const isLinked = linkedAccounts.some(l => l.ad_account_id === acc.id);
                if (linkFilter === 'linked') return isLinked;
                if (linkFilter === 'unlinked') return !isLinked;
                return true;
            });
        }

        // 2. Sort
        if (sortConfig !== null) {
            items.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof AdAccount];
                let bValue: any = b[sortConfig.key as keyof AdAccount];

                if (sortConfig.key === 'client_nome') {
                    aValue = linkedAccounts.find(l => l.ad_account_id === a.id)?.client_nome || '';
                    bValue = linkedAccounts.find(l => l.ad_account_id === b.id)?.client_nome || '';
                }

                if (sortConfig.key === 'account_status' || sortConfig.key === 'balance') {
                    const aNumber = Number(aValue ?? 0);
                    const bNumber = Number(bValue ?? 0);

                    if (aNumber < bNumber) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aNumber > bNumber) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                // Handle nulls/undefined strings for safe comparison
                aValue = (aValue || '').toString().toLowerCase();
                bValue = (bValue || '').toString().toLowerCase();

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    };

    // Bulk Logic
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedAccounts(adAccounts.map(a => a.id));
        } else {
            setSelectedAccounts([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedAccounts(prev => [...prev, id]);
        } else {
            setSelectedAccounts(prev => prev.filter(item => item !== id));
        }
    };

    const handleBulkLink = async (clientId: string) => {
        if (!clientId || selectedAccounts.length === 0) return;
        if (!confirm(`Vincular ${selectedAccounts.length} contas ao cliente selecionado ? `)) return;

        const client = clients.find(c => c.id === clientId);
        let successCount = 0;

        for (const accId of selectedAccounts) {
            const acc = adAccounts.find(a => a.id === accId);
            if (acc) {
                await handleLinkAccount(acc.id, clientId, acc.name, acc.currency, acc.account_status);
                successCount++;
            }
        }
        setSelectedAccounts([]);
        toast({ title: "Vinculação em massa concluída", description: `${successCount} contas vinculadas.` });
    };

    const sortedAccounts = getSortedAccounts();

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Integração MetaAds</h1>
                    <p className="text-muted-foreground">Gerencie o vínculo entre contas de anúncio e clientes.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadData} disabled={loading}>
                        <RefreshCw className={`mr - 2 h - 4 w - 4 ${loading ? 'animate-spin' : ''} `} />
                        Atualizar Lista
                    </Button>
                    <Button variant="default" onClick={manualSync} disabled={syncing}>
                        <RefreshCw className={`mr - 2 h - 4 w - 4 ${syncing ? 'animate-spin' : ''} `} />
                        Sincronizar Dados
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="contas" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="contas">Contas</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="contas" className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <p className="text-sm font-medium mb-1">Buscar</p>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou ID..."
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full sm:w-[200px]">
                            <p className="text-sm font-medium mb-1">Status da Conta</p>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="active">Ativas</SelectItem>
                                    <SelectItem value="inactive">Inativas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full sm:w-[200px]">
                            <p className="text-sm font-medium mb-1">Vínculo</p>
                            <Select value={linkFilter} onValueChange={setLinkFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="linked">Vinculadas</SelectItem>
                                    <SelectItem value="unlinked">Não Vinculadas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Contas de Anúncio ({adAccounts.length})</CardTitle>
                                    <CardDescription>
                                        {selectedAccounts.length > 0
                                            ? `${selectedAccounts.length} selecionadas`
                                            : "Selecione contas para ações em massa"
                                        }
                                    </CardDescription>
                                </div>
                                {selectedAccounts.length > 0 && (
                                    <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                                        <span className="text-sm font-medium">Ações em Massa:</span>
                                        <Select onValueChange={handleBulkLink}>
                                            <SelectTrigger className="w-[250px]">
                                                <SelectValue placeholder="Vincular selecionadas a..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clients.map(client => (
                                                    <SelectItem key={client.id} value={client.id}>
                                                        {client.nome}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">
                                                    <Checkbox
                                                        checked={selectedAccounts.length === adAccounts.length && adAccounts.length > 0}
                                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                    />
                                                </TableHead>
                                                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                                                    Nome <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer" onClick={() => handleSort('id')}>
                                                    ID <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer" onClick={() => handleSort('currency')}>
                                                    Moeda <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('balance')}>
                                                    Balance <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer" onClick={() => handleSort('account_status')}>
                                                    Status <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                                </TableHead>
                                                <TableHead>
                                                    Tipo Pagamento
                                                </TableHead>
                                                <TableHead className="cursor-pointer" onClick={() => handleSort('client_nome')}>
                                                    Cliente Vinculado <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                                </TableHead>
                                                <TableHead>Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedAccounts.map((account) => {
                                                const link = linkedAccounts.find(l => l.ad_account_id === account.id);
                                                const isLinked = !!link;
                                                const isSelected = selectedAccounts.includes(account.id);

                                                return (
                                                    <TableRow key={account.id} className={isSelected ? "bg-muted/50" : ""}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={(checked) => handleSelectOne(account.id, checked as boolean)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">{account.name}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{account.id}</TableCell>
                                                        <TableCell>{account.currency}</TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatBalance(account.available_balance ?? account.balance, account.currency)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={account.account_status === 1 ? 'default' : 'secondary'}>
                                                                {account.account_status === 1 ? 'Ativa' : 'Inativa'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <Badge variant={account.is_prepay_account ? 'outline' : 'secondary'} className={account.is_prepay_account ? "border-blue-500 text-blue-500" : ""}>
                                                                    {account.is_prepay_account ? 'Pré-pago' : 'Pós-pago'}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {isLinked ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                                        {link.client_nome || 'Cliente Desconhecido'}
                                                                    </Badge>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Testar Conexão"
                                                                    onClick={(e) => { e.stopPropagation(); testConnection(account.id); }}
                                                                    className="text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <Activity className="h-4 w-4" />
                                                                </Button>
                                                                {isLinked ? (
                                                                    <Button variant="ghost" size="icon" onClick={() => handleUnlink(account.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                ) : (
                                                                    <Select onValueChange={(value) => handleLinkAccount(account.id, value, account.name, account.currency, account.account_status)}>
                                                                        <SelectTrigger className="w-[40px] p-0 border-none bg-transparent hover:bg-muted">
                                                                            <Link2 className="h-4 w-4 text-muted-foreground" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {clients.map(client => (
                                                                                <SelectItem key={client.id} value={client.id}>
                                                                                    {client.nome}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
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
                </TabsContent>

                <TabsContent value="historico">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Sincronizações</CardTitle>
                            <CardDescription>Acompanhe os últimos status e execuções da sincronização Meta Ads.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MetaSyncHistory />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isDiagnosticOpen} onOpenChange={setIsDiagnosticOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Diagnóstico de Conexão</DialogTitle>
                        <DialogDescription>
                            Verificando permissões e acesso aos dados da conta.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                        {testingId && (
                            <div className="flex items-center justify-center p-8 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                                Verificando {testingId}...
                            </div>
                        )}

                        {diagnosticResult && !testingId && (
                            <div className="space-y-4">
                                {!diagnosticResult.success && (
                                    <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                                        <p className="font-semibold">Erro na Execução</p>
                                        <p>{diagnosticResult.error}</p>
                                    </div>
                                )}

                                {diagnosticResult.diagnostics?.steps?.map((step: any, i: number) => renderDiagnosticStep(step, i))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default MetaAdsAdmin;
