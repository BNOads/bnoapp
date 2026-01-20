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

export function AniversariosProximos() {
  const [aniversariantes, setAniversariantes] = useState<ColaboradorAniversario[]>([]);
  const [loading, setLoading] = useState(true);

  const calcularDiasParaAniversario = (dataNascimento: string): number | null => {
    if (!dataNascimento) return null;
    
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const nascimento = new Date(dataNascimento);
      
      if (isNaN(nascimento.getTime())) return null;
      
      const anoAtual = hoje.getFullYear();
      const aniversarioEsteAno = new Date(anoAtual, nascimento.getMonth(), nascimento.getDate());
      
      if (aniversarioEsteAno < hoje) {
        aniversarioEsteAno.setFullYear(anoAtual + 1);
      }
      
      const diferenca = Math.ceil((aniversarioEsteAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diferenca;
    } catch (error) {
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
    const data = new Date(dataNascimento);
    return format(data, "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-lg overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-full bg-primary/10">
            <Cake className="h-5 w-5 text-primary" />
          </div>
          <span>Aniversários Próximos</span>
          <Badge variant="secondary" className="ml-auto">
            {aniversariantes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {aniversariantes.map((colab) => {
          const { text, variant, icon: Icon } = getAniversarioLabel(colab.diasRestantes);
          const isToday = colab.diasRestantes === 0;
          const isSoon = colab.diasRestantes <= 3;

          return (
            <div
              key={colab.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isToday 
                  ? 'bg-primary/15 border-2 border-primary animate-pulse' 
                  : isSoon 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <Avatar className={`h-12 w-12 ring-2 ${isToday ? 'ring-primary ring-offset-2' : 'ring-muted'}`}>
                <AvatarImage src={colab.avatar_url || undefined} alt={colab.nome} />
                <AvatarFallback className={isToday ? 'bg-primary text-primary-foreground' : ''}>
                  {colab.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isToday ? 'text-primary' : ''}`}>
                  {colab.nome}
                  {isToday && ' 🎉'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getAniversarioDate(colab.data_nascimento)}
                </p>
              </div>

              <Badge 
                variant={variant}
                className={`flex items-center gap-1 ${
                  isToday ? 'bg-primary text-primary-foreground animate-bounce' : ''
                }`}
              >
                <Icon className="h-3 w-3" />
                {text}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
