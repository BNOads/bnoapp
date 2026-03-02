import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Bell, Check, Search, Filter, MessageSquare, AlertTriangle,
    Info, CheckCircle, XCircle, Settings, Repeat, User as UserIcon, MailX, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormattedNotificationText } from "@/components/Notifications/FormattedNotificationText";
import CreateNotificationModal from "@/components/Notifications/CreateNotificationModal";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { User } from "@supabase/supabase-js";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { PushToggleRow } from "@/components/Notifications/NotificationBell";

interface NotificationRead {
    user_id: string;
    lido_em: string;
}

interface AvisoNotification {
    id: string;
    titulo: string;
    conteudo: string;
    tipo: string;
    prioridade: string;
    created_at: string;
    data_inicio: string;
    data_fim: string | null;
    lido: boolean;
    fonte: string;
    metadata: any;
    created_by?: string;
    avisos_leitura?: NotificationRead[];
}

export function NotificacoesDetalhesView() {
    const { isAdmin } = useUserPermissions();
    const [isSendingTest, setIsSendingTest] = useState(false);

    const sendTestPush = async () => {
        setIsSendingTest(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-push-notification', {
                body: {
                    titulo: '🔔 Teste Push BNOads',
                    conteudo: 'Se você está vendo isso, as notificações push estão funcionando!',
                    destinatarios: ['all'],
                },
            });
            if (error) throw error;
            if (data?.sent > 0) {
                toast.success(`Push enviado para ${data.sent} dispositivo(s)!`);
                if (data.failed > 0) {
                    toast.warning(`${data.failed} envio(s) falharam.`);
                }
            } else if (data?.errors?.length > 0) {
                toast.error('Push falhou: ' + data.errors[0]);
            } else {
                toast.warning('Nenhum dispositivo inscrito. Ative as notificações push primeiro.');
            }
        } catch (err: any) {
            toast.error('Erro ao enviar push: ' + (err?.message ?? String(err)));
        } finally {
            setIsSendingTest(false);
        }
    };
    const [user, setUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<AvisoAvisoNotification[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<AvisoNotification | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [isNovoAvisoOpen, setIsNovoAvisoOpen] = useState(false);
    const [resendData, setResendData] = useState<any>(null);

    const loadNotifications = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);

            const { data: avisos, error: avisosError } = await supabase
                .from('avisos')
                .select('*')
                .eq('ativo', true)
                .or(`destinatarios.cs.{all}, destinatarios.cs.{${user.id}}, destinatarios.cs.{admin}`)
                .lte('data_inicio', new Date().toISOString())
                .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString()}`)
                .order('created_at', { ascending: false });

            if (avisosError) throw avisosError;

            // Buscar status de leitura separadamente para evitar erro de JOIN no Supabase
            const { data: leituras, error: leiturasError } = await supabase
                .from('avisos_leitura')
                .select('aviso_id, user_id, lido_em')
                .eq('user_id', user.id);

            if (leiturasError) throw leiturasError;

            const leitosIds = new Set(leituras?.map(l => l.aviso_id) || []);

            const notificationsData = (avisos || []).map(aviso => {
                const isRead = leitosIds.has(aviso.id);

                return {
                    id: aviso.id,
                    titulo: aviso.titulo,
                    conteudo: aviso.conteudo,
                    tipo: aviso.tipo,
                    prioridade: aviso.prioridade,
                    created_at: aviso.created_at,
                    data_inicio: aviso.data_inicio,
                    data_fim: aviso.data_fim,
                    lido: isRead,
                    fonte: aviso.fonte || 'manual',
                    metadata: aviso.metadata || {},
                    created_by: aviso.created_by,
                    avisos_leitura: leituras?.filter(l => l.aviso_id === aviso.id) || []
                };
            });

            setNotifications(notificationsData);

            // Automatically select the first one if none is selected
            if (!selectedNotification && notificationsData.length > 0) {
                setSelectedNotification(notificationsData[0]);
            } else if (selectedNotification) {
                // Update selected if content changed
                const updatedSelected = notificationsData.find(n => n.id === selectedNotification.id);
                if (updatedSelected) setSelectedNotification(updatedSelected);
            }

        } catch (error: any) {
            console.error('Erro ao carregar notificações:', error);
            toast.error('Erro ao carregar notificações');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [user?.id, isAdmin]);

    const markAsRead = async (notificationId: string) => {
        if (!user?.id) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, lido: true } : n));
        if (selectedNotification?.id === notificationId) {
            setSelectedNotification(prev => prev ? { ...prev, lido: true } : prev);
        }

        try {
            const { error } = await supabase.from('avisos_leitura').upsert({
                aviso_id: notificationId,
                user_id: user.id
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Erro ao marcar como lido:', error);
            toast.error('Erro ao marcar como lido');
        }
    };

    const markAsUnread = async (notificationId: string) => {
        if (!user?.id) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, lido: false } : n));
        if (selectedNotification?.id === notificationId) {
            setSelectedNotification(prev => prev ? { ...prev, lido: false } : prev);
        }

        try {
            const { error } = await supabase.from('avisos_leitura').delete().match({
                aviso_id: notificationId,
                user_id: user.id
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Erro ao marcar como não lido:', error);
            toast.error('Erro ao marcar como não lido');
        }
    };

    const handleResend = (notification: Notification) => {
        setResendData(notification);
        setIsNovoAvisoOpen(true);
    };

    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || n.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const unreadCount = notifications.filter(n => !n.lido).length;

    const getPriorityColor = (prioridade: string) => {
        switch (prioridade) {
            case 'alta': return 'bg-orange-500';
            case 'critica': return 'bg-red-500';
            case 'media': return 'bg-yellow-500';
            case 'baixa': return 'bg-green-500';
            default: return 'bg-blue-500';
        }
    };

    const getTypeIcon = (tipo: string) => {
        switch (tipo) {
            case 'info': return <Info className="h-5 w-5 text-blue-500" />;
            case 'warning':
            case 'alerta': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case 'error':
            case 'erro': return <XCircle className="h-5 w-5 text-red-500" />;
            case 'success':
            case 'sucesso': return <CheckCircle className="h-5 w-5 text-green-500" />;
            default: return <Bell className="h-5 w-5 text-slate-500" />;
        }
    };

    // If selecting a new unread notification, mark it as read automatically
    useEffect(() => {
        if (selectedNotification && !selectedNotification.lido) {
            markAsRead(selectedNotification.id);
        }
    }, [selectedNotification]);

    return (
        <div className="h-[calc(100vh-[120px])] flex flex-col pt-4 max-w-[1400px] mx-auto w-full">
            <div className="mb-6 flex-shrink-0 flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">Centro de Notificações</h2>
                    <p className="text-muted-foreground mt-1">
                        Acompanhe todos os avisos e atualizações do sistema.
                        {unreadCount > 0 && <span className="text-indigo-600 font-medium ml-2">({unreadCount} não lidas)</span>}
                    </p>
                    {/* Push toggle inline na página */}
                    <div className="mt-2">
                        <PushToggleRow compact />
                    </div>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={sendTestPush}
                            disabled={isSendingTest}
                            className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                            title={isSubscribed ? 'Enviar push de teste' : 'Ative o push primeiro no sino de notificações'}
                        >
                            <Zap className="w-4 h-4" />
                            {isSendingTest ? 'Enviando...' : 'Testar Push'}
                        </Button>
                        <Button onClick={() => {
                            setResendData(null);
                            setIsNovoAvisoOpen(true);
                        }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <Send className="w-4 h-4" />
                            Criar Novo Aviso
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex-1">
                {/* Lado Esquerdo - Lista */}
                <div className="w-[380px] border-r border-slate-200 flex flex-col bg-slate-50/50">
                    <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-indigo-500" /> Todas as Notificações
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar notificações..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 bg-slate-50/50 border-slate-200"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto w-[380px]">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Carregando...</div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">Nenhuma notificação encontrada.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => setSelectedNotification(notification)}
                                        className={`p-4 cursor-pointer relative transition-all border-b border-b-slate-100 last:border-0 ${selectedNotification?.id === notification.id ? 'bg-indigo-50/80' : 'hover:bg-slate-50'} ${!notification.lido ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        {/* Left border active/selected state line */}
                                        {selectedNotification?.id === notification.id && notification.lido && (
                                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500" />
                                        )}
                                        {/* Left border unread state line */}
                                        {!notification.lido && (
                                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500" />
                                        )}
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0 relative">
                                                {getTypeIcon(notification.tipo)}
                                                {!notification.lido && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-indigo-50 ring-1 ring-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-1 mb-1">
                                                    <h4 className={`font-semibold text-sm truncate ${!notification.lido ? 'text-indigo-950' : 'text-slate-700'}`}>
                                                        {notification.titulo}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                        {format(new Date(notification.created_at), 'dd/MM')}
                                                    </span>
                                                </div>
                                                <p className={`text-xs line-clamp-2 leading-relaxed ${!notification.lido ? 'text-indigo-900/80' : 'text-slate-500'}`}>
                                                    {notification.conteudo}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Lado Direito - Detalhes */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    {selectedNotification ? (
                        <>
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                            {getTypeIcon(selectedNotification.tipo)}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedNotification.titulo}</h1>
                                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                                <span>{format(new Date(selectedNotification.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                                                {!selectedNotification.lido && (
                                                    <>
                                                        <span>•</span>
                                                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[10px] hover:bg-indigo-200 tracking-wider font-semibold">Não lido</Badge>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <div className="flex items-center gap-1.5">
                                                    Tema: <span className="capitalize">{selectedNotification.tipo}</span>
                                                </div>
                                                <span>•</span>
                                                <div className="flex items-center gap-1.5">
                                                    Prioridade:
                                                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(selectedNotification.prioridade)}`} />
                                                    <span className="capitalize">{selectedNotification.prioridade}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {selectedNotification.lido ? (
                                            <Button variant="outline" size="sm" onClick={() => markAsUnread(selectedNotification.id)} className="text-slate-600 gap-2">
                                                <MailX className="w-4 h-4" />
                                                Marcar como não lido
                                            </Button>
                                        ) : (
                                            <Button size="sm" onClick={() => markAsRead(selectedNotification.id)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                                                <Check className="w-4 h-4" />
                                                Marcar como lido
                                            </Button>
                                        )}
                                        {isAdmin && (
                                            <Button variant="outline" size="sm" onClick={() => handleResend(selectedNotification)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-2">
                                                <Repeat className="w-4 h-4" />
                                                Reenviar Aviso
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                                <div className="prose prose-slate max-w-3xl prose-p:leading-relaxed prose-p:text-slate-700">
                                    <FormattedNotificationText as="div" text={selectedNotification.conteudo} />
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="border-t border-slate-200 bg-slate-50 p-6">
                                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                                        <Settings className="w-4 h-4 text-slate-500" /> Detalhes & Rastreio (Visão Admin)
                                    </h4>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Origem do Aviso</p>
                                            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                                                <p className="flex items-center gap-2 text-slate-700 mb-1">
                                                    <Badge variant="outline" className="capitalize">{selectedNotification.fonte}</Badge>
                                                </p>
                                                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                                                    <pre className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-600 overflow-x-auto">
                                                        {JSON.stringify(selectedNotification.metadata, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirmações de Leitura</p>
                                            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                                                <div className="flex items-center justify-between mb-3 text-slate-700 font-medium">
                                                    <span>Total de Leituras</span>
                                                    <Badge variant="secondary">{selectedNotification.avisos_leitura?.length || 0}</Badge>
                                                </div>

                                                {selectedNotification.avisos_leitura && selectedNotification.avisos_leitura.length > 0 ? (
                                                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                                        {selectedNotification.avisos_leitura.map((read, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded">
                                                                <div className="flex items-center gap-2">
                                                                    <UserIcon className="w-3 h-3 text-slate-400" />
                                                                    <span className="text-slate-700">{read.user_id ? read.user_id.substring(0, 8) : 'Usuário'}...</span>
                                                                </div>
                                                                <span className="text-slate-400">{read.lido_em ? format(new Date(read.lido_em), 'dd/MM HH:mm') : ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-500 py-2">Ninguém leu este aviso ainda.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                                <Bell className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-sm">Selecione uma notificação na lista para ver os detalhes</p>
                        </div>
                    )}
                </div>
            </div>

            <CreateNotificationModal
                open={isNovoAvisoOpen}
                onOpenChange={(open) => {
                    setIsNovoAvisoOpen(open);
                    if (!open) setResendData(null);
                }}
                onSuccess={() => {
                    loadNotifications();
                    setIsNovoAvisoOpen(false);
                    setResendData(null);
                }}
                showButton={false}
                initialData={resendData}
            />
        </div>
    );
}
