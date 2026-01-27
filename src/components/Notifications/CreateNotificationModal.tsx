import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { User } from "@supabase/supabase-js";

interface CreateNotificationModalProps {
  onSuccess?: () => void;
  showButton?: boolean;
}

export default function CreateNotificationModal({ onSuccess, showButton = true }: CreateNotificationModalProps) {
  // All hooks must be called unconditionally at the top
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'info',
    prioridade: 'normal',
    data_inicio: '',
    recorrencia_tipo: null as string | null,
    recorrencia_intervalo: null as number | null,
    destinatarios: ['all']
  });

  // Load user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Don't render anything if showButton is false
  if (!showButton) {
    return null;
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      conteudo: '',
      tipo: 'info',
      prioridade: 'normal',
      data_inicio: '',
      recorrencia_tipo: null,
      recorrencia_intervalo: null,
      destinatarios: ['all']
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.titulo.trim() || !formData.conteudo.trim()) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    try {
      setLoading(true);

      const notificationData = {
        titulo: formData.titulo.trim(),
        conteudo: formData.conteudo.trim(),
        tipo: formData.tipo,
        prioridade: formData.prioridade,
        destinatarios: formData.destinatarios,
        data_inicio: formData.data_inicio || new Date().toISOString(),
        recorrencia_tipo: formData.recorrencia_tipo,
        recorrencia_intervalo: formData.recorrencia_intervalo,
        created_by: user.id,
        ativo: true
      } as any;

      const { error } = await supabase
        .from('avisos')
        .insert(notificationData);

      if (error) throw error;

      toast.success(
        formData.data_inicio 
          ? 'Notificação agendada com sucesso!' 
          : 'Notificação criada e enviada!'
      );
      
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar notificação:', error);
      toast.error('Erro ao criar notificação: ' + error.message);
    } finally {
      setLoading(false);
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

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'text-red-600';
      case 'media': return 'text-yellow-600';
      case 'baixa': return 'text-green-600';
      default: return 'text-blue-600';
    }
  };

  // Gerar data/hora atual + 1 hora para o padrão
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return format(now, "yyyy-MM-dd'T'HH:mm");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
            <path d="M9.5 9a2.5 2.5 0 0 1 5 0v2a2.5 2.5 0 0 1-5 0V9z"/>
            <path d="M9 13h6v3H9z"/>
            <path d="M7 16h10v1H7z"/>
          </svg>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Criar Nova Notificação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Atualização do sistema, Reunião importante..."
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.titulo.length}/100 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="conteudo">Mensagem *</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData(prev => ({ ...prev, conteudo: e.target.value }))}
                  placeholder="Digite a mensagem completa da notificação..."
                  rows={4}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.conteudo.length}/500 caracteres
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">
                        <div className="flex items-center gap-2">
                          <span>ℹ️</span>
                          Informação
                        </div>
                      </SelectItem>
                      <SelectItem value="warning">
                        <div className="flex items-center gap-2">
                          <span>⚠️</span>
                          Aviso
                        </div>
                      </SelectItem>
                      <SelectItem value="error">
                        <div className="flex items-center gap-2">
                          <span>❌</span>
                          Erro/Problema
                        </div>
                      </SelectItem>
                      <SelectItem value="success">
                        <div className="flex items-center gap-2">
                          <span>✅</span>
                          Sucesso
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select 
                    value={formData.prioridade} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">
                        <span className="text-green-600">🔵 Baixa</span>
                      </SelectItem>
                      <SelectItem value="normal">
                        <span className="text-blue-600">🟡 Normal</span>
                      </SelectItem>
                      <SelectItem value="alta">
                        <span className="text-red-600">🔴 Alta</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agendamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_inicio">Data/Hora de Disparo</Label>
                  <Input
                    id="data_inicio"
                    type="datetime-local"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.data_inicio 
                      ? 'Será enviada no horário especificado' 
                      : 'Deixe vazio para enviar imediatamente'
                    }
                  </p>
                </div>

                <div>
                  <Label htmlFor="recorrencia">Recorrência</Label>
                  <Select 
                    value={formData.recorrencia_tipo || 'nenhuma'} 
                    onValueChange={(value) => {
                      if (value === 'nenhuma') {
                        setFormData(prev => ({ 
                          ...prev, 
                          recorrencia_tipo: null,
                          recorrencia_intervalo: null
                        }));
                      } else if (value === 'diaria') {
                        setFormData(prev => ({ 
                          ...prev, 
                          recorrencia_tipo: 'diaria',
                          recorrencia_intervalo: 1
                        }));
                      } else if (value === 'semanal') {
                        setFormData(prev => ({ 
                          ...prev, 
                          recorrencia_tipo: 'semanal',
                          recorrencia_intervalo: 7
                        }));
                      } else if (value === 'mensal') {
                        setFormData(prev => ({ 
                          ...prev, 
                          recorrencia_tipo: 'mensal',
                          recorrencia_intervalo: 30
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">
                        <div className="flex items-center gap-2">
                          <span>📌</span>
                          Nenhuma (aviso único)
                        </div>
                      </SelectItem>
                      <SelectItem value="diaria">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          Diária (a cada 1 dia)
                        </div>
                      </SelectItem>
                      <SelectItem value="semanal">
                        <div className="flex items-center gap-2">
                          <span>📆</span>
                          Semanal (a cada 7 dias)
                        </div>
                      </SelectItem>
                      <SelectItem value="mensal">
                        <div className="flex items-center gap-2">
                          <span>🗓️</span>
                          Mensal (a cada 30 dias)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.recorrencia_tipo 
                      ? `Notificação será exibida repetidamente a cada ${formData.recorrencia_intervalo} dia(s)` 
                      : 'Aviso será exibido apenas uma vez'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinatários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Destinatários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Quem receberá esta notificação?</Label>
                <Select 
                  value={formData.destinatarios[0]} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, destinatarios: [value] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Todos os colaboradores
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <span>👑</span>
                        Apenas administradores
                      </div>
                    </SelectItem>
                    <SelectItem value="gestor_trafego">
                      <div className="flex items-center gap-2">
                        <span>📊</span>
                        Gestores de tráfego
                      </div>
                    </SelectItem>
                    <SelectItem value="cs">
                      <div className="flex items-center gap-2">
                        <span>🎯</span>
                        Customer Success
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {(formData.titulo || formData.conteudo) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview da Notificação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getTypeIcon(formData.tipo)}</span>
                    <div className={`w-3 h-3 rounded-full ${
                      formData.prioridade === 'alta' ? 'bg-red-500' :
                      formData.prioridade === 'media' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <h4 className="font-medium">{formData.titulo || 'Título da notificação'}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {formData.conteudo || 'Conteúdo da mensagem...'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className={getPriorityColor(formData.prioridade)}>
                      Prioridade: {formData.prioridade}
                    </span>
                    <span>•</span>
                    <span>
                      {formData.data_inicio ? 
                        `Agendada para: ${format(new Date(formData.data_inicio), 'dd/MM/yyyy HH:mm')}` :
                        'Envio imediato'
                      }
                    </span>
                    {formData.recorrencia_tipo && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600">
                          Recorrência: {formData.recorrencia_tipo} (a cada {formData.recorrencia_intervalo} dia(s))
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : (formData.data_inicio ? 'Agendar' : 'Enviar Agora')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}