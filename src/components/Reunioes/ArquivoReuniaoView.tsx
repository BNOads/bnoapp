import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, ChevronDown, ChevronRight, CalendarDays, Users, Save, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArquivoReuniaoEditor } from './ArquivoReuniaoEditor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  lastActive: string;
}

interface MesData {
  nome: string;
  numero: number;
  dias: { dia: number; diaSemana: string }[];
  expanded: boolean;
}

export function ArquivoReuniaoView() {
  const { toast } = useToast();
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();
  const diaAtual = new Date().getDate();

  const [arquivoId, setArquivoId] = useState<string | null>(null);
  const [conteudo, setConteudo] = useState<any>(null);
  const [meses, setMeses] = useState<MesData[]>([]);
  const [selectedDate, setSelectedDate] = useState({ mes: mesAtual + 1, dia: diaAtual });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingContentRef = useRef<any>(null);

  // Gerar estrutura de meses/dias
  useEffect(() => {
    const mesesData: MesData[] = MESES.map((nome, index) => {
      const mes = index + 1;
      const diasNoMes = new Date(anoAtual, mes, 0).getDate();
      const dias = [];

      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(anoAtual, index, dia);
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        dias.push({
          dia,
          diaSemana: diasSemana[data.getDay()]
        });
      }

      return {
        nome,
        numero: mes,
        dias,
        expanded: mes === mesAtual + 1
      };
    });

    setMeses(mesesData);
  }, [anoAtual, mesAtual]);

  // Setup presence channel
  useEffect(() => {
    if (!userData || !user?.id) return;

    const userColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const userColor = userColors[Math.floor(Math.random() * userColors.length)];

    const channel = supabase.channel(`arquivo-presence-${anoAtual}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: UserPresence[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const presence = presences[0] as any;
            if (presence && typeof presence === 'object') {
              users.push({
                userId: key,
                userName: presence.userName || presence.user_name || 'Usuário',
                color: presence.color || '#999',
                lastActive: new Date().toISOString()
              });
            }
          }
        });

        setOnlineUsers(users.filter(u => u.userId !== user.id));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            userName: userData.nome,
            color: userColor,
            online_at: new Date().toISOString()
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userData, anoAtual]);

  // Inicializar arquivo
  useEffect(() => {
    initializeArquivo();
  }, []);

  const initializeArquivo = async () => {
    try {
      setLoading(true);

      const { data: existingArquivo, error: fetchError } = await supabase
        .from('arquivo_reuniao')
        .select('*')
        .eq('ano', anoAtual)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingArquivo) {
        setArquivoId(existingArquivo.id);
        setConteudo(existingArquivo.conteudo);
      } else {
        const { data: user } = await supabase.auth.getUser();
        
        const defaultContent = {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: `Arquivo de Reunião ${anoAtual}`,
                    type: "text",
                    version: 1
                  }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "heading",
                version: 1,
                tag: "h1"
              }
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1
          }
        };

        const { data: newArquivo, error: createError } = await supabase
          .from('arquivo_reuniao')
          .insert({
            ano: anoAtual,
            conteudo: defaultContent,
            criado_por: user.user?.id
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setArquivoId(newArquivo.id);
        setConteudo(defaultContent);
        
        toast({
          title: "📄 Arquivo criado",
          description: `Arquivo de reunião ${anoAtual} inicializado`,
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar arquivo:', error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível carregar o arquivo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced save
  const handleContentChange = (newContent: any) => {
    pendingContentRef.current = newContent;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveContent(pendingContentRef.current);
    }, 3000); // Save after 3 seconds of inactivity
  };

  const saveContent = async (content: any) => {
    if (!arquivoId || !content) return;

    try {
      setIsSaving(true);
      
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('arquivo_reuniao')
        .update({
          conteudo: content,
          atualizado_em: new Date().toISOString(),
          atualizado_por: user.user?.id
        })
        .eq('id', arquivoId);

      if (error) throw error;

      setLastSaved(new Date());
      console.log('💾 Conteúdo salvo automaticamente');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "❌ Erro ao salvar",
        description: "Tentando novamente...",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (pendingContentRef.current) {
      await saveContent(pendingContentRef.current);
      toast({
        title: "✅ Salvo",
        description: "Arquivo salvo com sucesso",
        duration: 2000
      });
    }
  };

  const toggleMes = (mesNumero: number) => {
    setMeses(prev => prev.map(m => 
      m.numero === mesNumero ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const scrollToToday = () => {
    setSelectedDate({ mes: mesAtual + 1, dia: diaAtual });
  };

  if (loading || !arquivoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando arquivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar esquerda - Índice */}
      <div className="w-64 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {anoAtual}
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={scrollToToday}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ir para Hoje
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-2">
            {meses.map((mes) => (
              <div key={mes.numero} className="mb-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start font-semibold"
                  onClick={() => toggleMes(mes.numero)}
                >
                  {mes.expanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  {mes.nome}
                </Button>
                
                {mes.expanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {mes.dias.slice(0, 10).map((diaData) => {
                      const isToday = mes.numero === mesAtual + 1 && diaData.dia === diaAtual;
                      
                      return (
                        <Button
                          key={diaData.dia}
                          variant={isToday ? "secondary" : "ghost"}
                          size="sm"
                          className={`w-full justify-start text-xs ${isToday ? 'font-bold' : ''}`}
                        >
                          {diaData.dia.toString().padStart(2, '0')}/{mes.numero.toString().padStart(2, '0')} - {diaData.diaSemana}
                          {isToday && <Badge variant="default" className="ml-2 text-xs">Hoje</Badge>}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Área principal - Editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Arquivo de Reunião {anoAtual}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {lastSaved && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Último salvamento: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {isSaving && <span className="text-primary">Salvando...</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Online users */}
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {onlineUsers.slice(0, 3).map((user) => (
                    <div
                      key={user.userId}
                      className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: user.color }}
                      title={user.userName}
                    >
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {onlineUsers.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                      +{onlineUsers.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button onClick={handleManualSave} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto py-8">
            <ArquivoReuniaoEditor
              arquivoId={arquivoId}
              ano={anoAtual}
              initialContent={conteudo}
              onContentChange={handleContentChange}
            />
          </div>
        </div>
      </div>

      {/* Sidebar direita - Clientes */}
      <div className="w-64 border-l border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clientes Mencionados
        </h3>
        <Separator className="mb-3" />
        <p className="text-xs text-muted-foreground">
          Em breve: lista de clientes mencionados no arquivo (detecção automática de @menções)
        </p>
      </div>
    </div>
  );
}
