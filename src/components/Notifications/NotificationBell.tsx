import { useState, useEffect } from "react";
import { Bell, X, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/components/Auth/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isOpen, setIsOpen] = useState(false);

  // Não exibir sino de notificações se o usuário não estiver logado
  if (!user?.id) {
    return null;
  }

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
        .insert({
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
        .insert(inserts);

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
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📢';
    }
  };

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
              <span>Notificações</span>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">
                  Todas ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Não lidas ({unreadCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onViewDetails={setSelectedNotification}
                    />
                  ))}
                  {filteredNotifications.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhuma notificação encontrada' : 'Nenhuma notificação'}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="unread" className="mt-4">
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredNotifications.filter(n => !n.lido).map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onViewDetails={setSelectedNotification}
                    />
                  ))}
                  {filteredNotifications.filter(n => !n.lido).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhuma notificação não lida encontrada' : 'Todas as notificações foram lidas! 🎉'}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getTypeIcon(selectedNotification?.tipo || '')}</span>
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
                <div className="whitespace-pre-wrap">
                  {selectedNotification.conteudo}
                </div>
              </div>

              {!selectedNotification.lido && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      markAsRead(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marcar como lida
                  </Button>
                </div>
              )}
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
  onViewDetails: (notification: Notification) => void;
}

function NotificationCard({ notification, onMarkAsRead, onViewDetails }: NotificationCardProps) {
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
    <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${!notification.lido ? 'bg-blue-50 border-blue-200' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0" onClick={() => onViewDetails(notification)}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getTypeIcon(notification.tipo)}</span>
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.prioridade)}`} />
              <h4 className="font-medium text-sm truncate">{notification.titulo}</h4>
              {!notification.lido && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {notification.conteudo}
            </p>
            <span className="text-xs text-muted-foreground">
              {format(new Date(notification.created_at), 'dd/MM HH:mm', { locale: ptBR })}
            </span>
          </div>
          
          {!notification.lido && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="flex-shrink-0"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}