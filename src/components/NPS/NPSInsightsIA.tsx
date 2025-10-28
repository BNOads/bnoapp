import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, TrendingUp, AlertCircle, Lightbulb, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function NPSInsightsIA() {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ultimoInsight, setUltimoInsight] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    carregarUltimoInsight();
  }, []);

  const carregarUltimoInsight = async () => {
    try {
      const { data } = await supabase
        .from('nps_insights_ia' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setUltimoInsight(data);
    } catch (error) {
      console.error('Erro ao carregar insight:', error);
    }
  };

  const gerarNovoInsight = async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase.functions.invoke('nps-analisar-insights', {
        body: {
          periodo_inicio: trintaDiasAtras.toISOString().split('T')[0],
          periodo_fim: hoje.toISOString().split('T')[0]
        }
      });

      if (error) throw error;

      setInsights(data);
      toast({
        title: "✅ Análise concluída",
        description: "Insights gerados com sucesso"
      });

      carregarUltimoInsight();
    } catch (error: any) {
      console.error('Erro ao gerar insights:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar os insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const insightParaExibir = insights || ultimoInsight;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-600" />
              Insights Gerados por IA
            </CardTitle>
            <Button onClick={gerarNovoInsight} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Gerar Nova Análise
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insightParaExibir ? (
            <div className="space-y-6">
              {/* Estatísticas */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold">{insightParaExibir.nps_medio}</div>
                  <div className="text-sm text-muted-foreground">NPS Médio</div>
                </div>
                <div className="p-4 bg-green-500/5 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{insightParaExibir.total_promotores}</div>
                  <div className="text-sm text-muted-foreground">Promotores</div>
                </div>
                <div className="p-4 bg-yellow-500/5 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{insightParaExibir.total_neutros}</div>
                  <div className="text-sm text-muted-foreground">Neutros</div>
                </div>
                <div className="p-4 bg-red-500/5 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{insightParaExibir.total_detratores}</div>
                  <div className="text-sm text-muted-foreground">Detratores</div>
                </div>
              </div>

              {/* Tendência */}
              <div className="flex items-center gap-2">
                <span className="font-medium">Tendência:</span>
                <Badge variant={
                  insightParaExibir.tendencia === 'positiva' ? 'default' : 
                  insightParaExibir.tendencia === 'negativa' ? 'destructive' : 
                  'secondary'
                }>
                  {insightParaExibir.tendencia === 'positiva' && '↗️ Positiva'}
                  {insightParaExibir.tendencia === 'negativa' && '↘️ Negativa'}
                  {insightParaExibir.tendencia === 'estavel' && '→ Estável'}
                </Badge>
              </div>

              {/* Principais Problemas */}
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Principais Pontos a Melhorar
                </h3>
                <ul className="space-y-2">
                  {(insightParaExibir.principais_problemas || []).map((problema: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                      <span className="font-bold text-red-600">{idx + 1}.</span>
                      <span>{problema}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pontos Fortes */}
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Pontos Fortes
                </h3>
                <ul className="space-y-2">
                  {(insightParaExibir.pontos_fortes || []).map((ponto: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <span className="font-bold text-green-600">✓</span>
                      <span>{ponto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recomendações */}
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Recomendações de Ações
                </h3>
                <ul className="space-y-2">
                  {(insightParaExibir.recomendacoes || []).map((recomendacao: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <span className="font-bold text-blue-600">→</span>
                      <span>{recomendacao}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                Análise gerada em {new Date(insightParaExibir.created_at).toLocaleString('pt-BR')}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Nenhuma análise gerada ainda</p>
              <Button onClick={gerarNovoInsight} disabled={loading}>
                {loading ? 'Gerando...' : 'Gerar Primeira Análise'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
