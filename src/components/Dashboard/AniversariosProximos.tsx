import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Cake, PartyPopper, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ColaboradorAniversario {
  id: string;
  nome: string;
  avatar_url: string | null;
  data_nascimento: string;
  diasRestantes: number;
}

export interface AniversariosProximosProps {
  compact?: boolean;
  className?: string;
}

export function AniversariosProximos({ compact = false, className }: AniversariosProximosProps) {
  const [aniversariantes, setAniversariantes] = useState<ColaboradorAniversario[]>([]);
  const [loading, setLoading] = useState(true);

  // ... existing helper functions (parseDateLocal, calcularDiasParaAniversario) ...

  const parseDateLocal = (dateStr: string): Date | null => {
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const calcularDiasParaAniversario = (dataNascimento: string): number | null => {
    if (!dataNascimento) return null;

    try {
      const nascimento = parseDateLocal(dataNascimento);
      if (!nascimento) return null;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const anoAtual = hoje.getFullYear();
      const aniversarioEsteAno = new Date(anoAtual, nascimento.getMonth(), nascimento.getDate());

      if (aniversarioEsteAno < hoje) {
        aniversarioEsteAno.setFullYear(anoAtual + 1);
      }

      const diferenca = Math.ceil((aniversarioEsteAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diferenca;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const carregarAniversarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, avatar_url, data_nascimento')
        .eq('ativo', true)
        .not('data_nascimento', 'is', null);

      if (error) throw error;

      const aniversariosProximos = (data || [])
        .map(colab => {
          const diasRestantes = calcularDiasParaAniversario(colab.data_nascimento!);
          return {
            ...colab,
            data_nascimento: colab.data_nascimento!,
            diasRestantes: diasRestantes ?? 999
          };
        })
        .filter(colab => colab.diasRestantes <= 14) // Mostrar aniversários nos próximos 14 dias
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

      setAniversariantes(aniversariosProximos);
    } catch (error) {
      console.error('Erro ao carregar aniversários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAniversarios();
  }, []);

  if (loading || aniversariantes.length === 0) {
    return null;
  }

  const getAniversarioLabel = (dias: number) => {
    if (dias === 0) return { text: "Hoje!", variant: "default" as const, icon: PartyPopper };
    if (dias === 1) return { text: "Amanhã!", variant: "secondary" as const, icon: Cake };
    return { text: `${dias} dias`, variant: "outline" as const, icon: Gift };
  };

  const getAniversarioDate = (dataNascimento: string) => {
    const data = parseDateLocal(dataNascimento);
    if (!data) return 'Data inválida';
    return format(data, "dd/MM", { locale: ptBR });
  };

  return (
    <Card className={`border border-blue-100 bg-blue-50/90 shadow-sm ${compact ? 'mt-0' : ''} ${className}`}>
      <CardHeader className={`${compact ? "p-1.5 pb-0" : "pb-3"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`rounded-full bg-blue-100 ${compact ? 'p-0.5' : 'p-2'}`}>
              <Cake className={`text-blue-600 ${compact ? 'h-3 w-3' : 'h-5 w-5'}`} />
            </div>
            <span className={`font-bold text-slate-900 ${compact ? 'text-[10px]' : 'text-lg'}`}>Aniversários Próximos</span>
          </div>
          <Badge className="bg-slate-800 text-white hover:bg-slate-700 h-3.5 px-1 min-w-[14px] justify-center text-[8px]">
            {aniversariantes.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={`${compact ? "p-1.5 pt-1 space-y-0.5" : "space-y-3"} flex-1 flex flex-col justify-center`}>
        {aniversariantes.map((colab) => {
          const { text, variant, icon: Icon } = getAniversarioLabel(colab.diasRestantes);
          const isToday = colab.diasRestantes === 0;

          return (
            <div
              key={colab.id}
              className={`flex items-center gap-1.5 rounded-md transition-all bg-white/60 hover:bg-white border border-blue-100/50 ${compact ? 'p-1' : 'p-3'}`}
            >
              <Avatar className={`${compact ? 'h-6 w-6 border border-white shadow-sm' : 'h-12 w-12'}`}>
                <AvatarImage src={colab.avatar_url || undefined} alt={colab.nome} />
                <AvatarFallback className="text-[9px] bg-slate-200 text-slate-600">
                  {colab.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate text-slate-900 leading-tight ${compact ? 'text-xs' : ''}`}>
                  {colab.nome.split(' ')[0]} {colab.nome.split(' ')[1]?.[0]}.
                </p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">
                  {format(parseDateLocal(colab.data_nascimento)!, "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>

              <div className={`flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-sm ${isToday ? 'animate-pulse border-blue-300 ring-1 ring-blue-100' : ''}`}>
                <Icon className={`h-2.5 w-2.5 ${isToday ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className={`text-[9px] font-bold ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                  {isToday ? 'HOJE' : text}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
