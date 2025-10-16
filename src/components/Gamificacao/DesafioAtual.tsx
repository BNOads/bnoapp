import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Trophy, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovoDesafioModal } from "./NovoDesafioModal";
import { RegistrarAcaoModal } from "./RegistrarAcaoModal";

interface Desafio {
  id: string;
  titulo: string;
  descricao: string;
  tipo_medicao: string;
  criterio_vitoria: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

interface DesafioAtualProps {
  isAdmin: boolean;
}

export const DesafioAtual = ({ isAdmin }: DesafioAtualProps) => {
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNovoDesafio, setShowNovoDesafio] = useState(false);
  const [showRegistrarAcao, setShowRegistrarAcao] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDesafioAtual();
  }, []);

  const loadDesafioAtual = async () => {
    try {
      const { data, error } = await supabase
        .from('gamificacao_desafios')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDesafio(data);
    } catch (error) {
      console.error('Erro ao carregar desafio:', error);
      toast({
        title: "Erro ao carregar desafio",
        description: "Não foi possível carregar o desafio atual.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoMedicaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'quantidade_acoes': 'Quantidade de Ações',
      'pontuacao': 'Pontuação',
      'check_in_diario': 'Check-in Diário'
    };
    return labels[tipo] || tipo;
  };

  const getCriterioVitoriaLabel = (criterio: string) => {
    const labels: Record<string, string> = {
      'maior_numero_acoes': 'Maior Número de Ações',
      'maior_pontuacao': 'Maior Pontuação',
      'maior_consistencia': 'Maior Consistência'
    };
    return labels[criterio] || criterio;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!desafio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Nenhum Desafio Ativo
          </CardTitle>
          <CardDescription>
            Aguarde o próximo desafio mensal ou crie um novo!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <Button onClick={() => setShowNovoDesafio(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Desafio
            </Button>
          )}
        </CardContent>
        <NovoDesafioModal 
          open={showNovoDesafio} 
          onOpenChange={setShowNovoDesafio}
          onSuccess={loadDesafioAtual}
        />
      </Card>
    );
  }

  const diasRestantes = differenceInDays(new Date(desafio.data_fim), new Date());
  const diasTotais = differenceInDays(new Date(desafio.data_fim), new Date(desafio.data_inicio));
  const progresso = Math.max(0, Math.min(100, ((diasTotais - diasRestantes) / diasTotais) * 100));

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                {desafio.titulo}
              </CardTitle>
              <CardDescription>{desafio.descricao}</CardDescription>
            </div>
            <Badge variant={diasRestantes > 7 ? "default" : "destructive"}>
              {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Encerrado'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Período</span>
                </div>
                <p className="text-sm">
                  {format(new Date(desafio.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(new Date(desafio.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Tipo de Medição</span>
                </div>
                <p className="text-sm">{getTipoMedicaoLabel(desafio.tipo_medicao)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">Critério de Vitória</span>
                </div>
                <p className="text-sm">{getCriterioVitoriaLabel(desafio.criterio_vitoria)}</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progresso do período</span>
              <span className="font-medium">{Math.round(progresso)}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <Button 
            onClick={() => setShowRegistrarAcao(true)} 
            className="w-full"
            size="lg"
            disabled={diasRestantes < 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Ação
          </Button>
        </CardContent>
      </Card>

      <RegistrarAcaoModal
        open={showRegistrarAcao}
        onOpenChange={setShowRegistrarAcao}
        desafioId={desafio.id}
        onSuccess={loadDesafioAtual}
      />
    </>
  );
};
