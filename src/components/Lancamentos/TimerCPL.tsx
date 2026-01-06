import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, CheckCircle2, AlertCircle, GraduationCap } from "lucide-react";
import { differenceInDays, differenceInHours, differenceInMinutes, isPast, isFuture, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DataChave {
  label: string;
  data: string | null;
  tipo: 'inicio' | 'fim' | 'evento';
}

interface TimerCPLProps {
  dataInicioCaptacao: string;
  dataFimCaptacao: string | null;
  dataInicioAquecimento: string | null;
  dataInicioCPL: string | null;
  dataInicioCarrinho: string | null;
  dataFechamento: string | null;
}

export default function TimerCPL({
  dataInicioCaptacao,
  dataFimCaptacao,
  dataInicioAquecimento,
  dataInicioCPL,
  dataInicioCarrinho,
  dataFechamento
}: TimerCPLProps) {
  const [timeLeft, setTimeLeft] = useState<{ dias: number; horas: number; minutos: number } | null>(null);
  const [nextEvent, setNextEvent] = useState<DataChave | null>(null);

  const datasChave: DataChave[] = [
    { label: "Início Captação", data: dataInicioCaptacao, tipo: 'inicio' as const },
    { label: "Fim Captação", data: dataFimCaptacao, tipo: 'fim' as const },
    { label: "Início Aquecimento", data: dataInicioAquecimento, tipo: 'inicio' as const },
    { label: "Início CPL", data: dataInicioCPL, tipo: 'evento' as const },
    { label: "Início Carrinho", data: dataInicioCarrinho, tipo: 'inicio' as const },
    { label: "Fechamento", data: dataFechamento, tipo: 'evento' as const }
  ].filter((d): d is DataChave => d.data !== null);

  useEffect(() => {
    const calcularProximoEvento = () => {
      const agora = new Date();
      
      // Encontrar próximo evento
      const proximoEvento = datasChave
        .filter(d => d.data && isFuture(parseISO(d.data)))
        .sort((a, b) => parseISO(a.data!).getTime() - parseISO(b.data!).getTime())[0];

      setNextEvent(proximoEvento || null);

      if (proximoEvento?.data) {
        const dataEvento = parseISO(proximoEvento.data);
        const dias = differenceInDays(dataEvento, agora);
        const horas = differenceInHours(dataEvento, agora) % 24;
        const minutos = differenceInMinutes(dataEvento, agora) % 60;

        setTimeLeft({ dias, horas, minutos });
      } else {
        setTimeLeft(null);
      }
    };

    calcularProximoEvento();
    const interval = setInterval(calcularProximoEvento, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [dataInicioCaptacao, dataFimCaptacao, dataInicioAquecimento, dataInicioCPL, dataInicioCarrinho, dataFechamento]);

  const getStatusCor = (data: string | null, tipo: 'inicio' | 'fim' | 'evento') => {
    if (!data) return "bg-muted text-muted-foreground";
    const dataEvento = parseISO(data);
    const agora = new Date();

    if (isPast(dataEvento)) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (differenceInDays(dataEvento, agora) <= 3) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const getIcone = (data: string | null) => {
    if (!data) return null;
    const dataEvento = parseISO(data);
    
    if (isPast(dataEvento)) return <CheckCircle2 className="h-4 w-4" />;
    if (differenceInDays(dataEvento, new Date()) <= 3) return <AlertCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  // Calcular dados da primeira aula
  const primeiraAulaData = dataInicioCPL ? (() => {
    const dataAula = parseISO(dataInicioCPL);
    const hoje = new Date();
    const diasRestantes = differenceInDays(dataAula, hoje);
    const jaPassou = diasRestantes < 0;
    const progressoPct = dataInicioCaptacao 
      ? Math.max(0, Math.min(100, ((differenceInDays(hoje, parseISO(dataInicioCaptacao)) / differenceInDays(dataAula, parseISO(dataInicioCaptacao))) * 100)))
      : 0;
    
    return { dataAula, diasRestantes, jaPassou, progressoPct };
  })() : null;

  return (
    <div className="space-y-4">
      {/* Timer do próximo evento + Contador Primeira Aula */}
      {nextEvent && timeLeft && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">Próximo Evento</h3>
                <p className="text-sm text-muted-foreground">{nextEvent.label}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-2">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{timeLeft.dias}</div>
                  <div className="text-xs text-muted-foreground">dias</div>
                </div>
                <div className="text-3xl font-bold text-muted-foreground">:</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{timeLeft.horas}</div>
                  <div className="text-xs text-muted-foreground">horas</div>
                </div>
                <div className="text-3xl font-bold text-muted-foreground">:</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{timeLeft.minutos}</div>
                  <div className="text-xs text-muted-foreground">min</div>
                </div>
              </div>
            </div>

            {/* Contador Primeira Aula - dentro do card */}
            {primeiraAulaData && (
              <div className="pt-4 border-t border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Primeira Aula</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {primeiraAulaData.jaPassou ? 'Concluído' : `${Math.abs(primeiraAulaData.diasRestantes)}d`}
                    </span>
                    <span className="text-sm text-purple-600 dark:text-purple-400 ml-2">
                      {format(primeiraAulaData.dataAula, "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                {!primeiraAulaData.jaPassou && (
                  <div className="w-full bg-purple-200 dark:bg-purple-900/50 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${primeiraAulaData.progressoPct}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Barra de datas-chave */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datas-Chave
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {datasChave.map((dataChave, index) => (
              <Badge 
                key={index}
                variant="outline"
                className={`${getStatusCor(dataChave.data, dataChave.tipo)} justify-between p-3 h-auto`}
              >
                <div className="flex items-center gap-2">
                  {getIcone(dataChave.data)}
                  <div className="text-left">
                    <div className="font-medium text-xs">{dataChave.label}</div>
                    <div className="text-sm">
                      {dataChave.data && format(parseISO(dataChave.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
