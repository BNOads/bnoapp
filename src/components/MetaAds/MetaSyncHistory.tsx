import { useState, useEffect } from "react";
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
import { Loader2, RefreshCw, Clock, User } from "lucide-react";

interface MetaSyncHistoryProps {
    adAccountIds?: string[];
}

export const MetaSyncHistory = ({ adAccountIds }: MetaSyncHistoryProps) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            // If filtering is requested but no accounts provided, return empty
            if (adAccountIds !== undefined && adAccountIds.length === 0) {
                setLogs([]);
                setLoading(false);
                return;
            }

            let query = supabase
                .from('meta_sync_logs')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(20);

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
        };

        fetchLogs();
    }, [adAccountIds]); // Re-fetch if filter changes

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Histórico de Sincronizações</h3>
                <span className="text-xs text-muted-foreground">Últimas 20 execuções</span>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Duração</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                    Nenhum registro de sincronização encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => {
                                const isManual = log.trigger_source === 'manual';
                                const duration = log.completed_at && log.started_at
                                    ? differenceInSeconds(new Date(log.completed_at), new Date(log.started_at))
                                    : null;

                                return (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {format(new Date(log.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(log.started_at), 'HH:mm', { locale: ptBR })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {isManual ? (
                                                    <Badge variant="outline" className="gap-1">
                                                        <User className="h-3 w-3" /> Manual
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Clock className="h-3 w-3" /> Automático
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {log.status === 'success' ? (
                                                <Badge className="bg-green-600 hover:bg-green-700">Sucesso</Badge>
                                            ) : log.status === 'running' ? (
                                                <Badge variant="secondary" className="animate-pulse">Executando</Badge>
                                            ) : (
                                                <Badge variant="destructive">Erro</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {duration !== null ? `${duration}s` : '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
