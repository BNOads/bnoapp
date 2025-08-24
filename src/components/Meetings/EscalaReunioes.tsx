import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  MapPin, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle,
  UserCheck,
  UserX,
  Timer,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Reuniao {
  id: string;
  titulo: string;
  descricao?: string;
  data_hora: string;
  duracao_prevista?: number;
  tipo: string;
  cliente_id?: string;
  status: string;
  link_meet?: string;
  clientes?: {
    nome: string;
  };
  presencas_reunioes: {
    user_id: string;
    status: string;
    horario_entrada?: string;
    horario_saida?: string;
    profiles: {
      nome: string;
      avatar_url?: string;
    };
  }[];
}

export const EscalaReunioes: React.FC = () => {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [novaReuniaoModal, setNovaReuniaoModal] = useState(false);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const { toast } = useToast();

  const [novaReuniao, setNovaReuniao] = useState({
    titulo: '',
    descricao: '',
    dataHora: '',
    duracaoPrevista: 60,
    tipo: 'reuniao',
    clienteId: '',
    participantesObrigatorios: [] as string[],
    participantesOpcionais: [] as string[],
    linkMeet: ''
  });

  useEffect(() => {
    loadMeetings();
    loadColaboradores();
    loadClientes();
  }, [selectedDate]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.functions.invoke('meeting-management', {
        body: {
          action: 'get_daily_meetings',
          date: dateStr
        }
      });

      if (error) throw error;

      setReunioes(data.reunioes || []);
    } catch (error) {
      console.error('Erro ao carregar reuniões:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar reuniões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('user_id, nome, avatar_url')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const createMeeting = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('meeting-management', {
        body: {
          action: 'create_meeting',
          ...novaReuniao
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Reunião agendada com sucesso"
      });

      setNovaReuniaoModal(false);
      setNovaReuniao({
        titulo: '',
        descricao: '',
        dataHora: '',
        duracaoPrevista: 60,
        tipo: 'reuniao',
        clienteId: '',
        participantesObrigatorios: [],
        participantesOpcionais: [],
        linkMeet: ''
      });
      loadMeetings();
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      toast({
        title: "Erro",
        description: "Falha ao agendar reunião",
        variant: "destructive"
      });
    }
  };

  const markAttendance = async (reuniaoId: string, status: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('meeting-management', {
        body: {
          action: 'mark_attendance',
          reuniaoId,
          status
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Presença marcada com sucesso"
      });

      loadMeetings();
    } catch (error) {
      console.error('Erro ao marcar presença:', error);
      toast({
        title: "Erro",
        description: "Falha ao marcar presença",
        variant: "destructive"
      });
    }
  };

  const startMeeting = async (reuniaoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('meeting-management', {
        body: {
          action: 'start_meeting',
          reuniaoId
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Reunião iniciada"
      });

      loadMeetings();
    } catch (error) {
      console.error('Erro ao iniciar reunião:', error);
      toast({
        title: "Erro",
        description: "Falha ao iniciar reunião",
        variant: "destructive"
      });
    }
  };

  const endMeeting = async (reuniaoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('meeting-management', {
        body: {
          action: 'end_meeting',
          reuniaoId
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Reunião finalizada"
      });

      loadMeetings();
    } catch (error) {
      console.error('Erro ao finalizar reunião:', error);
      toast({
        title: "Erro",
        description: "Falha ao finalizar reunião",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'presente':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'ausente':
        return <UserX className="h-4 w-4 text-red-500" />;
      case 'atrasado':
        return <Timer className="h-4 w-4 text-yellow-500" />;
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="outline">Agendada</Badge>;
      case 'em_andamento':
        return <Badge className="bg-blue-500">Em Andamento</Badge>;
      case 'finalizada':
        return <Badge className="bg-green-500">Finalizada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Escala de Reuniões</h2>
          <p className="text-muted-foreground">
            Gerencie reuniões e controle de presença
          </p>
        </div>
        
        <Dialog open={novaReuniaoModal} onOpenChange={setNovaReuniaoModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Reunião
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agendar Nova Reunião</DialogTitle>
              <DialogDescription>
                Crie uma nova reunião e convide participantes
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={novaReuniao.titulo}
                  onChange={(e) => setNovaReuniao({...novaReuniao, titulo: e.target.value})}
                  placeholder="Ex: Reunião Semanal"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={novaReuniao.descricao}
                  onChange={(e) => setNovaReuniao({...novaReuniao, descricao: e.target.value})}
                  placeholder="Descrição opcional da reunião"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dataHora">Data e Hora</Label>
                  <Input
                    id="dataHora"
                    type="datetime-local"
                    value={novaReuniao.dataHora}
                    onChange={(e) => setNovaReuniao({...novaReuniao, dataHora: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="duracao">Duração (min)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    value={novaReuniao.duracaoPrevista}
                    onChange={(e) => setNovaReuniao({...novaReuniao, duracaoPrevista: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={novaReuniao.tipo} onValueChange={(value) => setNovaReuniao({...novaReuniao, tipo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="apresentacao">Apresentação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="cliente">Cliente (opcional)</Label>
                  <Select value={novaReuniao.clienteId} onValueChange={(value) => setNovaReuniao({...novaReuniao, clienteId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="linkMeet">Link da Reunião</Label>
                <Input
                  id="linkMeet"
                  value={novaReuniao.linkMeet}
                  onChange={(e) => setNovaReuniao({...novaReuniao, linkMeet: e.target.value})}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNovaReuniaoModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createMeeting}>
                Agendar Reunião
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Reuniões de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              <CardDescription>
                {reunioes.length} reunião(ões) agendada(s)
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-6 bg-muted rounded mb-2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : reunioes.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma reunião agendada para este dia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reunioes.map((reuniao) => (
                    <div key={reuniao.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{reuniao.titulo}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(reuniao.data_hora), "HH:mm")}
                            </div>
                            {reuniao.duracao_prevista && (
                              <span>({reuniao.duracao_prevista}min)</span>
                            )}
                            {reuniao.clientes && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {reuniao.clientes.nome}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(reuniao.status)}
                          
                          {reuniao.status === 'agendada' && (
                            <Button size="sm" onClick={() => startMeeting(reuniao.id)}>
                              <Play className="h-4 w-4 mr-1" />
                              Iniciar
                            </Button>
                          )}
                          
                          {reuniao.status === 'em_andamento' && (
                            <Button size="sm" variant="destructive" onClick={() => endMeeting(reuniao.id)}>
                              <Square className="h-4 w-4 mr-1" />
                              Finalizar
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {reuniao.descricao && (
                        <p className="text-sm text-muted-foreground">{reuniao.descricao}</p>
                      )}
                      
                      {reuniao.link_meet && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <a
                            href={reuniao.link_meet}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Entrar na reunião
                          </a>
                        </div>
                      )}
                      
                      {reuniao.presencas_reunioes && reuniao.presencas_reunioes.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Participantes:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {reuniao.presencas_reunioes.map((presenca) => (
                              <div key={presenca.user_id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={presenca.profiles.avatar_url} />
                                    <AvatarFallback className="text-xs">
                                      {presenca.profiles.nome.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{presenca.profiles.nome}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(presenca.status)}
                                  
                                  {reuniao.status === 'em_andamento' && presenca.status === 'ausente' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => markAttendance(reuniao.id, 'presente')}
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {reuniao.status === 'em_andamento' && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button size="sm" onClick={() => markAttendance(reuniao.id, 'presente')}>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Marcar Presente
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => markAttendance(reuniao.id, 'atrasado')}>
                            <Timer className="h-4 w-4 mr-1" />
                            Atrasado
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => markAttendance(reuniao.id, 'ausente')}>
                            <UserX className="h-4 w-4 mr-1" />
                            Ausente
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};