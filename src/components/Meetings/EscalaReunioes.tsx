import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, UserPlus, RefreshCw, Plus, Search, Check, Edit2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar as CalendarIcon,
  MapPin,
  Play,
  Square,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Timer
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';
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
  const [participantesModal, setParticipantesModal] = useState(false);
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<string>('');
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const { toast } = useToast();
  const { userData } = useCurrentUser();
  const { user } = useAuth();

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

  // Edit / Delete state
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState({
    id: '',
    titulo: '',
    descricao: '',
    dataHora: '',
    duracaoPrevista: 60,
    linkMeet: '',
    isAutoImported: false,
    originalData: null as Reuniao | null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reuniao?: Reuniao }>({ open: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarReunioes();
    loadColaboradores();
    loadClientes();
  }, [selectedDate]);

  const carregarReunioes = async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('Carregando reuniões para:', dateStr);

      // Buscar eventos do Google Calendar (mesma estratégia da aba Calendar)
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      console.log('Buscando eventos do Google Calendar...');
      const { data: calendarData, error: calendarError } = await supabase.functions.invoke('google-calendar', {
        body: {
          calendarId: 'contato@bnoads.com.br',
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString()
        }
      });

      const events = calendarData?.items || [];
      console.log('Eventos encontrados:', events.length);

      // Converter eventos do Google Calendar para formato de reunião
      const reunioesDoCalendar = events
        .filter((event: any) => event.start?.dateTime) // Apenas eventos com horário específico
        .map((event: any) => {
          const startTime = new Date(event.start.dateTime);
          const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(startTime.getTime() + 60 * 60 * 1000);
          const duracao = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

          return {
            id: event.id,
            titulo: event.summary || 'Reunião sem título',
            descricao: event.description || '',
            data_hora: event.start.dateTime,
            duracao_prevista: duracao,
            status: 'agendada',
            tipo: 'reuniao',
            link_meet: event.hangoutLink || event.htmlLink || '',
            organizador: { nome: 'Google Calendar' },
            cliente: null,
            presencas_reunioes: []
          };
        });

      // Buscar reuniões já salvas no banco
      const { data: reunioesBanco, error: bancoError } = await supabase
        .from('reunioes_agendadas')
        .select('*')
        .gte('data_hora', startDate.toISOString())
        .lt('data_hora', endDate.toISOString())
        .order('data_hora');

      // Buscar participantes de todas as reuniões
      const { data: todasPresencas } = await supabase
        .from('presencas_reunioes')
        .select(`
          reuniao_id,
          user_id,
          status
        `);

      // Buscar dados dos colaboradores
      const { data: colaboradoresData } = await supabase
        .from('colaboradores')
        .select('user_id, nome, avatar_url');

      // Mapear reuniões do banco com participantes
      const reunioesFormatadas = (reunioesBanco || []).map(reuniao => {
        const participantes = (todasPresencas || [])
          .filter(p => p.reuniao_id === reuniao.id)
          .map(p => {
            const colaborador = colaboradoresData?.find(c => c.user_id === p.user_id);
            return {
              user_id: p.user_id,
              status: p.status,
              profiles: {
                nome: colaborador?.nome || 'Usuário',
                avatar_url: colaborador?.avatar_url
              }
            };
          });

        return {
          ...reuniao,
          presencas_reunioes: participantes
        };
      });

      // Filtrar reuniões do Google Calendar que já não estejam salvas no banco
      // Verificamos por título e data_hora para identificar duplicatas
      const reunioesGoogleFiltradas = reunioesDoCalendar.filter(reuniaoGoogle => {
        const googleDateTime = new Date(reuniaoGoogle.data_hora).toISOString();
        return !reunioesFormatadas.some(reuniaoBanco => {
          const bancoDateTime = new Date(reuniaoBanco.data_hora).toISOString();
          return reuniaoBanco.titulo === reuniaoGoogle.titulo &&
            Math.abs(new Date(bancoDateTime).getTime() - new Date(googleDateTime).getTime()) < 60000; // 1 minuto de tolerância
        });
      });

      // Adicionar participantes às reuniões do Google Calendar que não estão no banco
      const reunioesGoogleComParticipantes = reunioesGoogleFiltradas.map(reuniao => {
        const participantes = (todasPresencas || [])
          .filter(p => p.reuniao_id === reuniao.id)
          .map(p => {
            const colaborador = colaboradoresData?.find(c => c.user_id === p.user_id);
            return {
              user_id: p.user_id,
              status: p.status,
              profiles: {
                nome: colaborador?.nome || 'Usuário',
                avatar_url: colaborador?.avatar_url
              }
            };
          });

        return {
          ...reuniao,
          presencas_reunioes: participantes
        };
      });

      // Combinar reuniões sem duplicatas
      const todasReunioes = [...reunioesFormatadas, ...reunioesGoogleComParticipantes];
      console.log('Total de reuniões:', todasReunioes.length);
      setReunioes(todasReunioes);

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

  // Helper: persists a Google Calendar event to DB and returns the new UUID
  const ensureReuniaoInDB = async (reuniao: Reuniao): Promise<string> => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reuniao.id);
    if (isUUID) return reuniao.id;
    const { data, error } = await supabase
      .from('reunioes_agendadas')
      .insert({
        titulo: reuniao.titulo,
        descricao: reuniao.descricao || '',
        data_hora: reuniao.data_hora,
        duracao_prevista: reuniao.duracao_prevista || 60,
        tipo: 'reuniao',
        status: 'agendada',
        organizador_id: user?.id,
        link_meet: reuniao.link_meet || ''
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  };

  const abrirEditar = (reuniao: Reuniao) => {
    const isAutoImported = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reuniao.id);
    const localDate = new Date(reuniao.data_hora);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dataHoraLocal = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
    setEditData({ id: reuniao.id, titulo: reuniao.titulo, descricao: reuniao.descricao || '', dataHora: dataHoraLocal, duracaoPrevista: reuniao.duracao_prevista || 60, linkMeet: reuniao.link_meet || '', isAutoImported, originalData: reuniao });
    setEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!editData.titulo.trim()) {
      toast({ title: 'Erro', description: 'O título é obrigatório.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      let id = editData.id;
      if (editData.isAutoImported && editData.originalData) id = await ensureReuniaoInDB(editData.originalData);
      const { error } = await supabase.from('reunioes_agendadas').update({ titulo: editData.titulo, descricao: editData.descricao, data_hora: new Date(editData.dataHora).toISOString(), duracao_prevista: editData.duracaoPrevista, link_meet: editData.linkMeet }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Reunião atualizada!', description: 'Alterações salvas com sucesso.' });
      setEditModal(false);
      carregarReunioes();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const excluirReuniao = async (reuniao: Reuniao) => {
    try {
      setSaving(true);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reuniao.id);
      if (isUUID) {
        const { error } = await supabase.from('reunioes_agendadas').update({ status: 'cancelada' }).eq('id', reuniao.id);
        if (error) throw error;
      }
      setReunioes(prev => prev.filter(r => r.id !== reuniao.id));
      setDeleteDialog({ open: false });
      toast({ title: 'Reunião removida', description: 'Reunião removida da escala.' });
      if (isUUID) carregarReunioes();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao excluir.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const criarNovaReuniao = async () => {
    try {
      const reuniaoData = {
        titulo: "Nova Reunião",
        descricao: "Reunião criada manualmente",
        data_hora: format(selectedDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        duracao_prevista: 60,
        tipo: "reuniao",
        organizador_id: '4759b9d5-8e40-41f2-a994-f609fb62b9c2', // Temporário
        participantes_obrigatorios: [],
        participantes_opcionais: []
      };

      const { data } = await supabase.functions.invoke('meeting-management', {
        body: {
          action: 'create_meeting',
          ...reuniaoData
        }
      });

      if (data?.success) {
        toast({
          title: "Reunião criada",
          description: "Nova reunião foi criada com sucesso",
        });
        carregarReunioes();
      }
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a reunião",
        variant: "destructive",
      });
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

      carregarReunioes();
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

      carregarReunioes();
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

      carregarReunioes();
    } catch (error) {
      console.error('Erro ao finalizar reunião:', error);
      toast({
        title: "Erro",
        description: "Falha ao finalizar reunião",
        variant: "destructive"
      });
    }
  };

  const addParticipantsToMeeting = async (reuniaoId: string, participantes: string[]) => {
    try {
      console.log('Adicionando participantes:', participantes, 'à reunião:', reuniaoId);

      // Verificar se a reunião é do Google Calendar (não é UUID)
      const isGoogleCalendarEvent = !reuniaoId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      let finalReuniaoId = reuniaoId;

      if (isGoogleCalendarEvent) {
        // Se for evento do Google Calendar, primeiro criar na tabela reunioes_agendadas
        const reuniaoSelecionadaData = reunioes.find(r => r.id === reuniaoId);

        if (reuniaoSelecionadaData) {
          console.log('Salvando reunião do Google Calendar no banco...');

          const { data: novaReuniao, error: insertError } = await supabase
            .from('reunioes_agendadas')
            .insert({
              titulo: reuniaoSelecionadaData.titulo,
              descricao: reuniaoSelecionadaData.descricao || '',
              data_hora: reuniaoSelecionadaData.data_hora,
              duracao_prevista: reuniaoSelecionadaData.duracao_prevista || 60,
              tipo: 'reuniao',
              status: 'agendada',
              organizador_id: user?.id || '4759b9d5-8e40-41f2-a994-f609fb62b9c2',
              link_meet: reuniaoSelecionadaData.link_meet || ''
            })
            .select()
            .single();

          if (insertError) {
            console.error('Erro ao salvar reunião:', insertError);
            throw insertError;
          }

          finalReuniaoId = novaReuniao.id;
          console.log('Reunião salva com ID:', finalReuniaoId);
        }
      }

      // Adicionar participantes à reunião
      const participantesData = participantes.map(userId => ({
        reuniao_id: finalReuniaoId,
        user_id: userId,
        status: 'ausente'
      }));

      const { error } = await supabase
        .from('presencas_reunioes')
        .upsert(participantesData, {
          onConflict: 'reuniao_id,user_id'
        });

      if (error) {
        console.error('Erro ao adicionar participantes:', error);
        throw error;
      }

      console.log('Participantes adicionados com sucesso');

      // Recarregar reuniões para atualizar a interface
      await carregarReunioes();

      toast({
        title: "Sucesso",
        description: "Participantes adicionados à reunião"
      });

      setParticipantesModal(false);
      carregarReunioes();
    } catch (error) {
      console.error('Erro ao adicionar participantes:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar participantes",
        variant: "destructive"
      });
    }
  };

  const markIndividualAttendance = async (reuniaoId: string, userId: string, status: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('meeting-management', {
        body: {
          action: 'mark_individual_attendance',
          reuniaoId,
          userId,
          status
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Presença de ${status} marcada`
      });

      carregarReunioes();
    } catch (error) {
      console.error('Erro ao marcar presença individual:', error);
      toast({
        title: "Erro",
        description: "Falha ao marcar presença",
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

        <div className="flex gap-2">
          <Button
            onClick={criarNovaReuniao}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Reunião
          </Button>
          <Button
            onClick={carregarReunioes}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
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

                        <div className="flex items-center gap-1.5">
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

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => abrirEditar(reuniao)}
                            title="Editar reunião"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, reuniao })}
                            title="Excluir reunião"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">Participantes:</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReuniaoSelecionada(reuniao.id);
                              setParticipantesModal(true);
                            }}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Gerenciar
                          </Button>
                        </div>

                        {reuniao.presencas_reunioes && reuniao.presencas_reunioes.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2">
                            {reuniao.presencas_reunioes.map((presenca) => (
                              <div key={presenca.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={presenca.profiles.avatar_url} />
                                    <AvatarFallback className="text-xs">
                                      {presenca.profiles.nome.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="text-sm font-medium">{presenca.profiles.nome}</span>
                                    {presenca.horario_entrada && (
                                      <div className="text-xs text-muted-foreground">
                                        Entrada: {format(new Date(presenca.horario_entrada), "HH:mm")}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {getStatusIcon(presenca.status)}

                                  {reuniao.status === 'em_andamento' && (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant={presenca.status === 'presente' ? 'default' : 'outline'}
                                        onClick={() => markIndividualAttendance(reuniao.id, presenca.user_id, 'presente')}
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={presenca.status === 'atrasado' ? 'default' : 'outline'}
                                        onClick={() => markIndividualAttendance(reuniao.id, presenca.user_id, 'atrasado')}
                                      >
                                        <Timer className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={presenca.status === 'ausente' ? 'destructive' : 'outline'}
                                        onClick={() => markIndividualAttendance(reuniao.id, presenca.user_id, 'ausente')}
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            Nenhum participante adicionado ainda
                          </div>
                        )}

                        {reuniao.status === 'em_andamento' && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button size="sm" onClick={() => markAttendance(reuniao.id, 'presente')}>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Marcar Todos Presentes
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Reunião</DialogTitle>
            {editData.isAutoImported && (
              <DialogDescription className="text-amber-600">
                ⚠ Reunião importada do Google Calendar — será salva no sistema ao confirmar.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-titulo">Título</Label>
              <Input id="edit-titulo" value={editData.titulo} onChange={e => setEditData(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Título da reunião" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-descricao">Descrição / Pauta</Label>
              <Textarea id="edit-descricao" value={editData.descricao} onChange={e => setEditData(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Pauta ou descrição..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-data">Data e Hora</Label>
                <Input id="edit-data" type="datetime-local" value={editData.dataHora} onChange={e => setEditData(prev => ({ ...prev, dataHora: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-duracao">Duração (min)</Label>
                <Input id="edit-duracao" type="number" min={5} step={5} value={editData.duracaoPrevista} onChange={e => setEditData(prev => ({ ...prev, duracaoPrevista: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-link">Link Meet</Label>
              <Input id="edit-link" value={editData.linkMeet} onChange={e => setEditData(prev => ({ ...prev, linkMeet: e.target.value }))} placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog({ open })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Reunião</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>"{deleteDialog.reuniao?.titulo}"</strong> da escala?
              {deleteDialog.reuniao && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deleteDialog.reuniao.id) && (
                <span className="block mt-1 text-amber-600 text-xs">Reunião do Google Calendar — será removida apenas da escala, não do calendário original.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>Cancelar</Button>
            <Button variant="destructive" disabled={saving} onClick={() => deleteDialog.reuniao && excluirReuniao(deleteDialog.reuniao)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              {saving ? 'Removendo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Gerenciar Participantes */}
      <Dialog open={participantesModal} onOpenChange={setParticipantesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Participantes</DialogTitle>
            <DialogDescription>
              Adicione ou remova participantes da reunião
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Busque ou insira o e-mail..."
                className="pl-10"
              />
            </div>

            {/* Lista de colaboradores */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {colaboradores.map((colaborador) => {
                const isParticipating = reunioes
                  .find(r => r.id === reuniaoSelecionada)
                  ?.presencas_reunioes?.some(p => p.user_id === colaborador.user_id);

                return (
                  <div key={colaborador.user_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={colaborador.avatar_url} />
                        <AvatarFallback className="bg-primary/10">
                          {colaborador.nome?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{colaborador.nome}</p>
                        <p className="text-sm text-muted-foreground">Colaborador</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isParticipating ? "secondary" : "default"}
                      onClick={() => {
                        if (!isParticipating) {
                          addParticipantsToMeeting(reuniaoSelecionada, [colaborador.user_id]);
                        }
                      }}
                      className={isParticipating ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : ""}
                    >
                      {isParticipating ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Adicionado
                        </>
                      ) : (
                        "Adicionar"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Opção de convidar por email */}
            <div className="border-t pt-4">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                <UserPlus className="h-4 w-4 mr-2" />
                Convide pessoas por e-mail
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setParticipantesModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};