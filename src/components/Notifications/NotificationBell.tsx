import { useState, useEffect } from "react";
import { Bell, X, Check, Search, Info, AlertTriangle, XCircle, CheckCircle, MailX, Smartphone, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User } from "@supabase/supabase-js";
import { FormattedNotificationText } from "@/components/Notifications/FormattedNotificationText";
import { useNavigate } from "react-router-dom";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Notification {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  prioridade: string;
  created_at: string;
  data_inicio: string;
  data_fim: string | null;
  lido: boolean;
}

export default function NotificationBell() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Load user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Carregar notificações
  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Buscar avisos relevantes para o usuário
      const { data: avisos, error: avisosError } = await supabase
        .from('avisos')
        .select('*')
        .eq('ativo', true)
        .or(`destinatarios.cs.{all}, destinatarios.cs.{${user.id}}, destinatarios.cs.{admin}`)
        .lte('data_inicio', new Date().toISOString())
        .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (avisosError) throw avisosError;

      // Buscar status de leitura
      const { data: leituras, error: leiturasError } = await supabase
        .from('avisos_leitura')
        .select('aviso_id')
        .eq('user_id', user.id);

      if (leiturasError) throw leiturasError;

      const leitosIds = new Set(leituras?.map(l => l.aviso_id) || []);

      // Combinar dados
      const notificationsData = (avisos || []).map(aviso => ({
        id: aviso.id,
        titulo: aviso.titulo,
        conteudo: aviso.conteudo,
        tipo: aviso.tipo,
        prioridade: aviso.prioridade,
        created_at: aviso.created_at,
        data_inicio: aviso.data_inicio,
        data_fim: aviso.data_fim,
        lido: leitosIds.has(aviso.id)
      }));

      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.lido).length);
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  // Marcar como lido
  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('avisos_leitura')
        .upsert({
          aviso_id: notificationId,
          user_id: user.id
        });

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, lido: true } : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Erro ao marcar como lido:', error);
      toast.error('Erro ao marcar como lido');
    }
  };

  // Marcar como não lido
  const markAsUnread = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('avisos_leitura')
        .delete()
        .match({
          aviso_id: notificationId,
          user_id: user.id
        });

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, lido: false } : n
        )
      );

      setUnreadCount(prev => prev + 1);
    } catch (error: any) {
      console.error('Erro ao marcar como não lido:', error);
      toast.error('Erro ao marcar como não lido');
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user?.id) return;

    const unreadNotifications = notifications.filter(n => !n.lido);
    if (unreadNotifications.length === 0) return;

    try {
      const inserts = unreadNotifications.map(n => ({
        aviso_id: n.id,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('avisos_leitura')
        .upsert(inserts);

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev =>
        prev.map(n => ({ ...n, lido: true }))
      );
      setUnreadCount(0);
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error('Erro ao marcar como lidas');
    }
  };

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.conteudo.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "unread") {
      return matchesSearch && !notification.lido;
    }

    return matchesSearch;
  });

  // Polling para novas notificações (a cada 30 segundos)
  useEffect(() => {
    if (user?.id) {
      loadNotifications();

      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avisos'
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avisos_leitura'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-500';
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
      case 'erro':
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'sucesso':
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  // Não exibir sino de notificações se o usuário não estiver logado
  if (!user?.id) {
    return null;
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Notificações {unreadCount > 0 && <span className="text-indigo-600 font-normal">({unreadCount} não lidas)</span>}</span>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Push Notification Banner */}
            <PushNotificationBanner />

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto pr-2 pb-2">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onViewDetails={setSelectedNotification}
                />
              ))}
              {filteredNotifications.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? 'Nenhuma notificação encontrada' : 'Nenhuma notificação'}
                </p>
              )}
            </div>

            {/* Link para central */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-center">
              <Button
                variant="ghost"
                className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notificacoes');
                }}
              >
                Ver todas as notificações no painel central
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{getTypeIcon(selectedNotification?.tipo || '')}</span>
              {selectedNotification?.titulo}
            </DialogTitle>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedNotification.prioridade)}`} />
                <span className="text-sm text-muted-foreground">
                  Prioridade: {selectedNotification.prioridade}
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedNotification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>

              <div className="prose prose-sm max-w-none">
                <FormattedNotificationText
                  as="div"
                  className="whitespace-pre-wrap"
                  text={selectedNotification.conteudo}
                />
              </div>

              <div className="flex justify-end gap-2">
                {selectedNotification.lido ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      markAsUnread(selectedNotification.id);
                      setSelectedNotification(prev => prev ? { ...prev, lido: false } : null);
                    }}
                  >
                    <MailX className="h-4 w-4 mr-2" />
                    Marcar como não lido
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      markAsRead(selectedNotification.id);
                      setSelectedNotification(prev => prev ? { ...prev, lido: true } : null);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marcar como lida
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onViewDetails: (notification: Notification) => void;
}

function NotificationCard({ notification, onMarkAsRead, onMarkAsUnread, onViewDetails }: NotificationCardProps) {
  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-500';
      case 'media': return 'bg-yellow-500';
      case 'baixa': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  return (
    <Card className={`group cursor-pointer transition-all border relative overflow-hidden ${!notification.lido ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 shadow-md ring-1 ring-indigo-500/20' : 'bg-white border-slate-100 hover:bg-slate-50 hover:shadow-sm'}`}>
      {!notification.lido && (
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-500" />
      )}
      <CardContent className="p-4 pl-5">
        <div className="flex gap-3">
          <div className="mt-1 flex-shrink-0 relative">
            {getTypeIcon(notification.tipo)}
            {!notification.lido && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-indigo-50 ring-1 ring-white" />
            )}
          </div>
          <div className="flex-1 space-y-1 cursor-pointer" onClick={() => onViewDetails(notification)}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold leading-none ${!notification.lido ? 'text-indigo-950' : 'text-slate-600'}`}>
                {notification.titulo}
              </p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.prioridade)}`} title={`Prioridade: ${notification.prioridade}`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(notification.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
            <FormattedNotificationText
              as="p"
              className={`text-[13px] leading-relaxed line-clamp-2 ${!notification.lido ? 'text-indigo-900/80' : 'text-slate-500'}`}
              text={notification.conteudo}
            />
          </div>

          <div className="flex flex-col gap-1 items-end pl-2 ml-auto">
            {!notification.lido ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="flex-shrink-0 h-8 w-8 p-0 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-200"
                title="Marcar como lido"
              >
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsUnread(notification.id);
                }}
                className="flex-shrink-0 h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Marcar como não lido"
              >
                <MailX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Push Notification Banner ──────────────────────────────────────────────────

function PushNotificationBanner() {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not supported, already subscribed (unless we want to show manage), or dismissed
  if (!isSupported) return null;
  if (dismissed) return null;
  if (permission === 'denied') return null;

  if (isSubscribed) {
    return (
      <div className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-blue-700">
          <Smartphone className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs font-medium">Notificações push ativas</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-blue-600 hover:text-red-600 hover:bg-red-50"
          onClick={async () => {
            await unsubscribe();
          }}
          disabled={isLoading}
        >
          <BellOff className="h-3.5 w-3.5 mr-1" />
          Desativar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-2.5 shadow-sm">
      <Smartphone className="h-4 w-4 text-blue-100 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">Ativar notificações push</p>
        <p className="text-[11px] text-blue-100 leading-relaxed mt-0.5">
          Receba alertas mesmo quando o app estiver fechado
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs bg-white text-blue-700 hover:bg-blue-50 font-semibold"
          onClick={async () => {
            const ok = await subscribe();
            if (!ok && Notification.permission === 'denied') {
              toast.error('Permissão negada. Habilite nas configurações do browser.');
            } else if (ok) {
              toast.success('Push notifications ativadas com sucesso! 🔔');
            }
          }}
          disabled={isLoading}
        >
          {isLoading ? '...' : 'Ativar'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-blue-200 hover:text-white hover:bg-blue-500"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

