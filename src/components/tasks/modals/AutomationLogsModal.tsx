import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTaskAutomationLogs } from "@/hooks/useTaskAutomations";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface AutomationLogsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AutomationLogsModal({ open, onOpenChange }: AutomationLogsModalProps) {
    const { data: logs, isLoading } = useTaskAutomationLogs();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-5 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-slate-500" />
                        Histórico de Execução (Logs)
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : logs && logs.length > 0 ? (
                        <ScrollArea className="h-full p-5">
                            <div className="space-y-4">
                                {logs.map((log) => (
                                    <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="space-y-1">
                                                <div className="font-medium text-slate-800 flex items-center gap-2">
                                                    {log.automations?.name || "Automação Apagada"}
                                                    {log.status === 'success' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"><CheckCircle className="w-3 h-3 mr-1" /> Sucesso</Badge>}
                                                    {log.status === 'error' && <Badge variant="destructive" className="border-none"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>}
                                                    {log.status === 'skipped' && <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none"><AlertTriangle className="w-3 h-3 mr-1" /> Ignorada</Badge>}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(log.created_at).toLocaleString('pt-BR')} • Gatilho: {log.trigger_event}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 font-mono text-xs">
                                            {log.message}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center space-y-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                                <Activity className="w-6 h-6 text-slate-400" />
                            </div>
                            <p>Nenhuma automação foi executada ainda.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
