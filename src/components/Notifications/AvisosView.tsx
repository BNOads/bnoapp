import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  Plus, 
  Send, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  prioridade: string;
  destinatarios: string[];
  canais: any;
  data_inicio?: string;
  data_fim?: string;
  ativo: boolean;
  created_at: string;
  avisos_leitura: any[];
}

interface SlackWebhook {
  id?: string;
  nome: string;
  webhook_url: string;
  canal?: string;
  tipos_aviso: string[];
  ativo: boolean;
}

export const AvisosView: React.FC = () => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [webhooks, setWebhooks] = useState<SlackWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoAvisoModal, setNovoAvisoModal] = useState(false);
  const [webhookModal, setWebhookModal] = useState(false);
  const { toast } = useToast();

  const [novoAviso, setNovoAviso] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'info' as const,
    prioridade: 'normal' as const,
    destinatarios: ['all'],
    canais: {
      painel: true,
      slack: false,
      email: false
    },
    dataInicio: '',
    dataFim: ''
  });

  const [novoWebhook, setNovoWebhook] = useState<SlackWebhook>({
    nome: '',
    webhook_url: '',
    canal: '',
    tipos_aviso: [],
    ativo: true
  });

  useEffect(() => {
    loadAvisos();
    loadWebhooks();
  }, []);

  const loadAvisos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('avisos')
        .select(`
          *,
          avisos_leitura(user_id, lido_em)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvisos(data || []);
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar avisos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('slack-notifications', {
        body: { action: 'get_webhooks' }
      });

      if (error) throw error;
      setWebhooks(data.webhooks || []);
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
    }
  };

  const createNotification = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('slack-notifications', {
        body: {
          action: 'create_notification',
          ...novoAviso
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aviso criado com sucesso"
      });

      setNovoAvisoModal(false);
      setNovoAviso({
        titulo: '',
        conteudo: '',
        tipo: 'info',
        prioridade: 'normal',
        destinatarios: ['all'],
        canais: {
          painel: true,
          slack: false,
          email: false
        },
        dataInicio: '',
        dataFim: ''
      });
      loadAvisos();
    } catch (error) {
      console.error('Erro ao criar aviso:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar aviso",
        variant: "destructive"
      });
    }
  };

  const saveWebhook = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('slack-notifications', {
        body: {
          action: 'save_webhook',
          ...novoWebhook
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Webhook salvo com sucesso"
      });

      setWebhookModal(false);
      setNovoWebhook({
        nome: '',
        webhook_url: '',
        canal: '',
        tipos_aviso: [],
        ativo: true
      });
      loadWebhooks();
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar webhook",
        variant: "destructive"
      });
    }
  };

  const markAsRead = async (avisoId: string) => {
    try {
      const { error } = await supabase
        .from('avisos_leitura')
        .upsert({
          aviso_id: avisoId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      loadAvisos();
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  const toggleAvisoStatus = async (avisoId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('avisos')
        .update({ ativo })
        .eq('id', avisoId);

      if (error) throw error;
      loadAvisos();

      toast({
        title: "Sucesso",
        description: `Aviso ${ativo ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      console.error('Erro ao alterar status do aviso:', error);
      toast({
        title: "Erro",
        description: "Falha ao alterar status do aviso",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'sucesso':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'alerta':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'critica':
        return <Badge className="bg-red-600">Crítica</Badge>;
      case 'alta':
        return <Badge className="bg-orange-500">Alta</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'baixa':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">{prioridade}</Badge>;
    }
  };

  const isUnread = (aviso: Aviso, currentUserId?: string) => {
    if (!currentUserId) return false;
    return !aviso.avisos_leitura.some(leitura => leitura.user_id === currentUserId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sistema de Avisos</h2>
          <p className="text-muted-foreground">
            Gerencie notificações e integrações com Slack
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={webhookModal} onOpenChange={setWebhookModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Webhooks
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Webhook do Slack</DialogTitle>
                <DialogDescription>
                  Configure a integração com o Slack para envio automático de notificações
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do Webhook</Label>
                  <Input
                    id="nome"
                    value={novoWebhook.nome}
                    onChange={(e) => setNovoWebhook({...novoWebhook, nome: e.target.value})}
                    placeholder="Ex: Canal Geral"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="webhook_url">URL do Webhook</Label>
                  <Input
                    id="webhook_url"
                    value={novoWebhook.webhook_url}
                    onChange={(e) => setNovoWebhook({...novoWebhook, webhook_url: e.target.value})}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="canal">Canal (opcional)</Label>
                  <Input
                    id="canal"
                    value={novoWebhook.canal}
                    onChange={(e) => setNovoWebhook({...novoWebhook, canal: e.target.value})}
                    placeholder="#geral"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Tipos de Aviso</Label>
                  <div className="flex flex-wrap gap-2">
                    {['info', 'alerta', 'sucesso', 'erro'].map((tipo) => (
                      <label key={tipo} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={novoWebhook.tipos_aviso.includes(tipo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNovoWebhook({
                                ...novoWebhook,
                                tipos_aviso: [...novoWebhook.tipos_aviso, tipo]
                              });
                            } else {
                              setNovoWebhook({
                                ...novoWebhook,
                                tipos_aviso: novoWebhook.tipos_aviso.filter(t => t !== tipo)
                              });
                            }
                          }}
                        />
                        <span className="text-sm capitalize">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={novoWebhook.ativo}
                    onCheckedChange={(checked) => setNovoWebhook({...novoWebhook, ativo: checked})}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setWebhookModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveWebhook}>
                  Salvar Webhook
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={novoAvisoModal} onOpenChange={setNovoAvisoModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Aviso</DialogTitle>
                <DialogDescription>
                  Crie um novo aviso para a equipe
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={novoAviso.titulo}
                    onChange={(e) => setNovoAviso({...novoAviso, titulo: e.target.value})}
                    placeholder="Título do aviso"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="conteudo">Conteúdo</Label>
                  <Textarea
                    id="conteudo"
                    value={novoAviso.conteudo}
                    onChange={(e) => setNovoAviso({...novoAviso, conteudo: e.target.value})}
                    placeholder="Conteúdo detalhado do aviso"
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select value={novoAviso.tipo} onValueChange={(value: any) => setNovoAviso({...novoAviso, tipo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Informação</SelectItem>
                        <SelectItem value="alerta">Alerta</SelectItem>
                        <SelectItem value="sucesso">Sucesso</SelectItem>
                        <SelectItem value="erro">Erro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select value={novoAviso.prioridade} onValueChange={(value: any) => setNovoAviso({...novoAviso, prioridade: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>Canais de Notificação</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={novoAviso.canais.painel}
                        onCheckedChange={(checked) => setNovoAviso({
                          ...novoAviso,
                          canais: {...novoAviso.canais, painel: checked}
                        })}
                      />
                      <Label>Painel</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={novoAviso.canais.slack}
                        onCheckedChange={(checked) => setNovoAviso({
                          ...novoAviso,
                          canais: {...novoAviso.canais, slack: checked}
                        })}
                      />
                      <Label>Slack</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={novoAviso.canais.email}
                        onCheckedChange={(checked) => setNovoAviso({
                          ...novoAviso,
                          canais: {...novoAviso.canais, email: checked}
                        })}
                      />
                      <Label>Email</Label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dataInicio">Data de Início (opcional)</Label>
                    <Input
                      id="dataInicio"
                      type="datetime-local"
                      value={novoAviso.dataInicio}
                      onChange={(e) => setNovoAviso({...novoAviso, dataInicio: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="dataFim">Data de Fim (opcional)</Label>
                    <Input
                      id="dataFim"
                      type="datetime-local"
                      value={novoAviso.dataFim}
                      onChange={(e) => setNovoAviso({...novoAviso, dataFim: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNovoAvisoModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={createNotification}>
                  <Send className="h-4 w-4 mr-2" />
                  Criar Aviso
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {webhooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Webhooks Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{webhook.nome}</span>
                    {webhook.canal && <span className="text-sm text-muted-foreground ml-2">{webhook.canal}</span>}
                  </div>
                  <Badge variant={webhook.ativo ? "default" : "secondary"}>
                    {webhook.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-6 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                    <div className="h-20 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : avisos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum aviso criado ainda</p>
            </CardContent>
          </Card>
        ) : (
          avisos.map((aviso) => (
            <Card key={aviso.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(aviso.tipo)}
                    <div>
                      <h3 className="font-semibold text-lg">{aviso.titulo}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getPriorityBadge(aviso.prioridade)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(aviso.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAvisoStatus(aviso.id, !aviso.ativo)}
                    >
                      {aviso.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    
                    {aviso.ativo && (
                      <Badge className="bg-green-500">Ativo</Badge>
                    )}
                    {!aviso.ativo && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-4">{aviso.conteudo}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {aviso.avisos_leitura.length} visualizações
                    </div>
                    
                    <div className="flex gap-1">
                      {aviso.canais.painel && <Badge variant="outline" className="text-xs">Painel</Badge>}
                      {aviso.canais.slack && <Badge variant="outline" className="text-xs">Slack</Badge>}
                      {aviso.canais.email && <Badge variant="outline" className="text-xs">Email</Badge>}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsRead(aviso.id)}
                  >
                    Marcar como Lido
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};