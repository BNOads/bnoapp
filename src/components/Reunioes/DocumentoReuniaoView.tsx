import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronDown, ChevronRight, CalendarDays, Users, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DocumentoReuniaoEditor } from './DocumentoReuniaoEditor';
import { OnlineUsers } from './OnlineUsers';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface MesData {
  nome: string;
  numero: number;
  dias: { dia: number; diaSemana: string }[];
  expanded: boolean;
}

export function DocumentoReuniaoView() {
  const { toast } = useToast();
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();
  const diaAtual = new Date().getDate();

  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [meses, setMeses] = useState<MesData[]>([]);
  const [selectedDate, setSelectedDate] = useState({ mes: mesAtual + 1, dia: diaAtual });
  const [loading, setLoading] = useState(true);

  // Inicializar documento
  useEffect(() => {
    initializeDocumento();
  }, []);

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
        expanded: mes === mesAtual + 1 // Expandir mês atual
      };
    });

    setMeses(mesesData);
  }, [anoAtual, mesAtual]);

  const initializeDocumento = async () => {
    try {
      setLoading(true);

      // Buscar ou criar documento do ano atual
      const { data: existingDoc, error: fetchError } = await supabase
        .from('documento_reuniao')
        .select('*')
        .eq('ano', anoAtual)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingDoc) {
        setDocumentoId(existingDoc.id);
      } else {
        // Criar novo documento
        const { data: user } = await supabase.auth.getUser();
        
        const { data: newDoc, error: createError } = await supabase
          .from('documento_reuniao')
          .insert({
            ano: anoAtual,
            atualizado_por: user.user?.id
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setDocumentoId(newDoc.id);
        
        toast({
          title: "📄 Documento criado",
          description: `Documento de reunião ${anoAtual} inicializado`,
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar documento:', error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível carregar o documento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMes = (mesNumero: number) => {
    setMeses(prev => prev.map(m => 
      m.numero === mesNumero ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const scrollToDate = (mes: number, dia: number) => {
    setSelectedDate({ mes, dia });
    const element = document.getElementById(`dia-${mes}-${dia}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToToday = () => {
    scrollToDate(mesAtual + 1, diaAtual);
  };

  if (loading || !documentoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Calendar className="h-16 w-16 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando documento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar esquerda - Índice de meses/dias */}
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
                    {mes.dias.map((diaData) => {
                      const isToday = mes.numero === mesAtual + 1 && diaData.dia === diaAtual;
                      const isSelected = mes.numero === selectedDate.mes && diaData.dia === selectedDate.dia;
                      
                      return (
                        <Button
                          key={diaData.dia}
                          variant={isSelected ? "secondary" : "ghost"}
                          size="sm"
                          className={`w-full justify-start text-xs ${isToday ? 'font-bold text-primary' : ''}`}
                          onClick={() => scrollToDate(mes.numero, diaData.dia)}
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
            <h1 className="text-2xl font-bold">Documento de Reunião {anoAtual}</h1>
            <p className="text-sm text-muted-foreground">
              Colaboração em tempo real para toda a equipe
            </p>
          </div>
          
          <OnlineUsers documentId={documentoId} />
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-8">
            <DocumentoReuniaoEditor
              documentoId={documentoId}
              ano={anoAtual}
              placeholder="Digite o conteúdo do documento..."
            />

            {/* Marcadores de dias para navegação */}
            <div className="mt-8 space-y-8">
              {meses.map((mes) => (
                <div key={mes.numero}>
                  <h2 className="text-2xl font-bold mb-4 text-primary sticky top-0 bg-background/95 backdrop-blur-sm py-2 border-b border-border">
                    {mes.nome} {anoAtual}
                  </h2>
                  
                  {mes.dias.map((diaData) => {
                    const isToday = mes.numero === mesAtual + 1 && diaData.dia === diaAtual;
                    
                    return (
                      <div 
                        key={diaData.dia}
                        id={`dia-${mes.numero}-${diaData.dia}`}
                        className="mb-6 scroll-mt-20"
                      >
                        <h3 className={`text-xl font-semibold mb-2 flex items-center gap-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                          {diaData.dia.toString().padStart(2, '0')}/{mes.numero.toString().padStart(2, '0')}/{anoAtual} - {diaData.diaSemana}
                          {isToday && <Badge variant="default">Hoje</Badge>}
                        </h3>
                        <Separator className="my-2" />
                        <div className="min-h-[100px] text-muted-foreground text-sm">
                          {/* Espaço reservado para conteúdo do dia */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar direita - Clientes relacionados (futura feature) */}
      <div className="w-64 border-l border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clientes Mencionados
        </h3>
        <p className="text-xs text-muted-foreground">
          Em breve: lista de clientes mencionados no documento
        </p>
      </div>
    </div>
  );
}
