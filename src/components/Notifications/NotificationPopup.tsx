import { useState, useEffect } from "react";
import { X, Check, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/components/Auth/AuthContext";
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
}

export default function NotificationPopup() {
  const { user } = useAuth();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [checkedNotifications, setCheckedNotifications] = useState<Set<string>>(new Set());

  // Não exibir notificações se o usuário não estiver logado
  if (!user?.id) {
    return null;
  }

  // Verificar novas notificações
  const checkForNewNotifications = async () => {
    if (!user?.id) return;

    try {
      // Buscar avisos não lidos que devem ser exibidos como popup
      const now = new Date().toISOString();
      
      const { data: avisos, error } = await supabase
        .from('avisos')
        .select('*')
        .eq('ativo', true)
        .or(`destinatarios.cs.{all}, destinatarios.cs.{${user.id}}, destinatarios.cs.{admin}`)
        .lte('data_inicio', now)
        .or(`data_fim.is.null,data_fim.gte.${now}`)
        .order('prioridade', { ascending: false }) // Alta prioridade primeiro
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar avisos já lidos
      const { data: leituras, error: leiturasError } = await supabase
        .from('avisos_leitura')
        .select('aviso_id')
        .eq('user_id', user.id);

      if (leiturasError) throw leiturasError;

      const leitosIds = new Set(leituras?.map(l => l.aviso_id) || []);
      
      // Filtrar avisos não lidos e não visualizados como popup
      const naoLidos = (avisos || []).filter(aviso => 
        !leitosIds.has(aviso.id) && 
        !checkedNotifications.has(aviso.id)
      );

      // Mostrar o primeiro aviso não lido (prioridade mais alta)
      if (naoLidos.length > 0) {
        const notification = naoLidos[0];
        setCurrentNotification({
          id: notification.id,
          titulo: notification.titulo,
          conteudo: notification.conteudo,
          tipo: notification.tipo,
          prioridade: notification.prioridade,
          created_at: notification.created_at,
          data_inicio: notification.data_inicio
        });

        // Marcar como visualizada (não como lida)
        setCheckedNotifications(prev => new Set([...prev, notification.id]));
      }
    } catch (error) {
      console.error('Erro ao verificar notificações:', error);
    }
  };

  // Marcar como lida
  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('avisos_leitura')
        .insert({
          aviso_id: notificationId,
          user_id: user.id
        });

      setCurrentNotification(null);
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  // Fechar popup (não marca como lido)
  const closePopup = () => {
    setCurrentNotification(null);
  };

  // Verificar notificações periodicamente
  useEffect(() => {
    if (user?.id) {
      // Verificação inicial
      checkForNewNotifications();
      
      // Verificar a cada 30 segundos
      const interval = setInterval(checkForNewNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, checkedNotifications]);

  // Real-time updates para novas notificações
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notification-popup')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avisos'
        },
        () => {
          // Aguardar um pouco para garantir que o aviso foi inserido
          setTimeout(checkForNewNotifications, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, checkedNotifications]);

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'border-red-500 bg-red-50';
      case 'media': return 'border-yellow-500 bg-yellow-50';
      case 'baixa': return 'border-green-500 bg-green-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getPriorityText = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'Alta Prioridade';
      case 'media': return 'Prioridade Média';
      case 'baixa': return 'Baixa Prioridade';
      default: return 'Prioridade Normal';
    }
  };

  if (!currentNotification) return null;

  return (
    <Dialog open={!!currentNotification} onOpenChange={closePopup}>
      <DialogContent className="max-w-md">
        <div className={`border-l-4 ${getPriorityColor(currentNotification.prioridade)} p-0`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5 text-primary" />
                <span className="text-xl">{getTypeIcon(currentNotification.tipo)}</span>
                Nova Notificação
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePopup}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{currentNotification.titulo}</h3>
              <p className="text-xs text-muted-foreground">
                {getPriorityText(currentNotification.prioridade)} • {' '}
                {format(new Date(currentNotification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {currentNotification.conteudo}
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closePopup}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Fechar
                </Button>
                <Button
                  size="sm"
                  onClick={() => markAsRead(currentNotification.id)}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Marcar como Lida
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </DialogContent>
    </Dialog>
  );
}