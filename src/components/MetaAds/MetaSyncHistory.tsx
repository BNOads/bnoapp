import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, differenceInSeconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ChevronDown, ChevronRight, Clock, Loader2, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MetaSyncHistoryProps {
    adAccountIds?: string[];
}

type SyncStatus = "success" | "running" | "partial" | "error";

const normalizeStatus = (status?: string | null): SyncStatus => {
    if (!status) return "error";
    const normalized = status.toLowerCase();

    if (["running", "processando", "em_andamento", "in_progress"].includes(normalized)) {
        return "running";
    }
    if (["success", "sucesso", "completed", "concluido", "done"].includes(normalized)) {
        return "success";
    }
    if (normalized === "partial") {
        return "partial";
    }
    return "error";
};

const parseDetails = (details: unknown): any[] => {
    if (Array.isArray(details)) return details;

    if (typeof details === "string") {
        try {
            const parsed = JSON.parse(details);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
};

const safeDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value?: string | null): { date: string; time: string } => {
    const parsed = safeDate(value);
    if (!parsed) {
        return { date: "-", time: "-" };
    }

    return {
        date: format(parsed, "dd/MM/yyyy", { locale: ptBR }),
        time: format(parsed, "HH:mm:ss", { locale: ptBR }),
    };
};

const getDurationSeconds = (log: any): number | null => {
    const durationMs = Number(log?.duration_ms);
    if (Number.isFinite(durationMs) && durationMs > 0) {
        return Math.round(durationMs / 1000);
    }

    const startedAt = safeDate(log?.started_at || log?.created_at);
    const completedAt = safeDate(log?.completed_at);
    if (startedAt && completedAt) {
        return Math.max(differenceInSeconds(completedAt, startedAt), 0);
    }

    return null;
};

const statusBadge = (status: SyncStatus) => {
    if (status === "success") {
        return <Badge className="bg-green-600 hover:bg-green-700">Sucesso</Badge>;
    }

    if (status === "running") {
        return <Badge variant="secondary" className="animate-pulse">Executando</Badge>;
    }

    if (status === "partial") {
        return <Badge className="bg-amber-500 text-black hover:bg-amber-400">Parcial</Badge>;
    }

    return <Badge variant="destructive">Erro</Badge>;
};

export const MetaSyncHistory = ({ adAccountIds }: MetaSyncHistoryProps) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const fetchLogs = useCallback(async (silent: boolean) => {
        if (adAccountIds !== undefined && adAccountIds.length === 0) {
            setLogs([]);
            setLoading(false);
            return;
        }

        if (silent) setRefreshing(true);
        else setLoading(true);

        let query = supabase
            .from('meta_sync_logs')
            .select('*')
            .order('started_at', { ascending: false, nullsFirst: false })
            .limit(30);

        if (adAccountIds && adAccountIds.length > 0) {
            query = query.in('ad_account_id', adAccountIds);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching logs:", error);
        } else {
            setLogs(data || []);
        }

        setLoading(false);
        setRefreshing(false);
    }, [adAccountIds]);

    useEffect(() => {
        fetchLogs(false);
        const interval = window.setInterval(() => {
            fetchLogs(true);
        }, 30000);

        return () => window.clearInterval(interval);
    }, [fetchLogs]);

    const renderedRows = useMemo(() => {
        return logs.map((log) => {
            const details = parseDetails(log.details);
            const normalizedStatus = normalizeStatus(log.status);
            const isAutomatic = log.trigger_source === "automatic_daily";
            const duration = getDurationSeconds(log);
            const startedAtDisplay = formatDateTime(log.started_at || log.created_at);
            const accountsTotal = Number.isFinite(Number(log.accounts_total))
                ? Number(log.accounts_total)
                : details.length;
            const accountsSuccess = Number.isFinite(Number(log.accounts_success))
                ? Number(log.accounts_success)
                : details.filter((item) => normalizeStatus(item?.status) === "success").length;
            const accountsError = Number.isFinite(Number(log.accounts_error))
                ? Number(log.accounts_error)
                : Math.max(accountsTotal - accountsSuccess, 0);
            const recordsSynced = Number.isFinite(Number(log.records_synced))
                ? Number(log.records_synced)
                : details.reduce((sum, item) => sum + (Number(item?.total_records) || 0), 0);

            const hasDetails = details.length > 0 || Boolean(log.error_message);
            const isExpanded = Boolean(expandedRows[log.id]);

            return {
                log,
                details,
                normalizedStatus,
                isAutomatic,
                duration,
                startedAtDisplay,
                accountsTotal,
                accountsSuccess,
                accountsError,
                recordsSynced,
                hasDetails,
                isExpanded,
            };
        });
    }, [expandedRows, logs]);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-medium">Histórico de Sincronizações</h3>
                    <span className="text-xs text-muted-foreground">Últimas 30 execuções</span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(true)}
                    disabled={refreshing}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Atualizar
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Contas</TableHead>
                            <TableHead>Registros</TableHead>
                            <TableHead>Duração</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderedRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                    Nenhum registro de sincronização encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            renderedRows.map((row) => ([
                                <TableRow key={`${row.log.id}-main`}>
                                    <TableCell>
                                        {row.hasDetails ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => {
                                                    setExpandedRows((prev) => ({
                                                        ...prev,
                                                        [row.log.id]: !prev[row.log.id],
                                                    }));
                                                }}
                                            >
                                                {row.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{row.startedAtDisplay.date}</span>
                                            <span className="text-xs text-muted-foreground">{row.startedAtDisplay.time}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {row.isAutomatic ? (
                                            <Badge variant="secondary" className="gap-1">
                                                <Clock className="h-3 w-3" /> Automática diária
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                <User className="h-3 w-3" /> Manual
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {statusBadge(row.normalizedStatus)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">
                                            {row.accountsSuccess}/{row.accountsTotal} ok
                                            {row.accountsError > 0 ? `, ${row.accountsError} erro` : ""}
                                        </span>
                                    </TableCell>
                                    <TableCell>{row.recordsSynced}</TableCell>
                                    <TableCell>{row.duration !== null ? `${row.duration}s` : "-"}</TableCell>
                                </TableRow>,
                                row.isExpanded ? (
                                    <TableRow key={`${row.log.id}-details`}>
                                        <TableCell colSpan={7} className="bg-muted/30">
                                            <div className="space-y-3 py-2">
                                                {row.log.error_message && (
                                                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                                        <div className="flex items-start gap-2">
                                                            <AlertCircle className="h-4 w-4 mt-0.5" />
                                                            <span>{row.log.error_message}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {row.details.length > 0 ? (
                                                    <div className="rounded-md border bg-background">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Conta</TableHead>
                                                                    <TableHead>Status</TableHead>
                                                                    <TableHead>Campanhas</TableHead>
                                                                    <TableHead>Anúncios</TableHead>
                                                                    <TableHead>Total</TableHead>
                                                                    <TableHead>Erro</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {row.details.map((detail: any, index: number) => {
                                                                    const detailStatus = normalizeStatus(detail?.status);
                                                                    return (
                                                                        <TableRow key={`${row.log.id}-detail-${index}`}>
                                                                            <TableCell>
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-medium">{detail?.account_name || detail?.meta_account_id || detail?.ad_account_id || "-"}</span>
                                                                                    {detail?.client_name && (
                                                                                        <span className="text-xs text-muted-foreground">{detail.client_name}</span>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>{statusBadge(detailStatus)}</TableCell>
                                                                            <TableCell>{Number(detail?.campaign?.count) || 0}</TableCell>
                                                                            <TableCell>{Number(detail?.ad?.count) || 0}</TableCell>
                                                                            <TableCell>{Number(detail?.total_records) || 0}</TableCell>
                                                                            <TableCell className="text-xs text-destructive">
                                                                                {detail?.campaign?.error || detail?.ad?.error || "-"}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    !row.log.error_message && (
                                                        <span className="text-sm text-muted-foreground">Sem detalhes por conta para esta execução.</span>
                                                    )
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : null,
                            ]))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
