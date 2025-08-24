import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, TrendingUp, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AlocacaoSummary {
  total_clientes: number;
  clientes_sem_gestor: number;
  clientes_sem_cs: number;
  distribuicao_gestores: Array<{
    id: string;
    nome: string;
    clientes_count: number;
    tipo: string;
  }>;
  distribuicao_cs: Array<{
    id: string;
    nome: string;
    clientes_count: number;
    tipo: string;
  }>;
}

export function IndicadoresAlocacao() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<AlocacaoSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarSummary();
  }, []);

  const carregarSummary = async () => {
    try {
      setLoading(true);
      
      console.log('Carregando indicadores de alocação...');
      
      const { data, error } = await supabase.functions.invoke('assignments-summary', {
        method: 'GET'
      });
      
      if (error) {
        console.error('Erro ao carregar indicadores:', error);
        throw error;
      }
      
      console.log('Indicadores carregados:', data);
      setSummary(data.data);
    } catch (error) {
      console.error('Erro ao carregar summary de alocações:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar indicadores de alocação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const percentualComGestor = summary.total_clientes > 0 
    ? ((summary.total_clientes - summary.clientes_sem_gestor) / summary.total_clientes) * 100 
    : 0;
    
  const percentualComCS = summary.total_clientes > 0 
    ? ((summary.total_clientes - summary.clientes_sem_cs) / summary.total_clientes) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_clientes}</div>
            <p className="text-xs text-muted-foreground">
              Clientes ativos no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Gestor</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.total_clientes - summary.clientes_sem_gestor}
            </div>
            <div className="space-y-2">
              <Progress value={percentualComGestor} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {percentualComGestor.toFixed(1)}% dos clientes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com CS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.total_clientes - summary.clientes_sem_cs}
            </div>
            <div className="space-y-2">
              <Progress value={percentualComCS} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {percentualComCS.toFixed(1)}% dos clientes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Alocação</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Math.max(summary.clientes_sem_gestor, summary.clientes_sem_cs)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Colaborador */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gestores de Tráfego */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição - Gestores de Tráfego</CardTitle>
            <CardDescription>
              Clientes por gestor de tráfego
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.distribuicao_gestores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente alocado ainda
              </p>
            ) : (
              summary.distribuicao_gestores
                .sort((a, b) => b.clientes_count - a.clientes_count)
                .map((gestor) => (
                  <div key={gestor.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{gestor.nome}</p>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${summary.total_clientes > 0 ? (gestor.clientes_count / summary.total_clientes) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-3">
                      {gestor.clientes_count}
                    </Badge>
                  </div>
                ))
            )}
            {summary.clientes_sem_gestor > 0 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-600">Sem Gestor</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${summary.total_clientes > 0 ? (summary.clientes_sem_gestor / summary.total_clientes) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <Badge variant="destructive" className="ml-3">
                  {summary.clientes_sem_gestor}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Success */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição - Customer Success</CardTitle>
            <CardDescription>
              Clientes por CS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.distribuicao_cs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente alocado ainda
              </p>
            ) : (
              summary.distribuicao_cs
                .sort((a, b) => b.clientes_count - a.clientes_count)
                .map((cs) => (
                  <div key={cs.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{cs.nome}</p>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-secondary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${summary.total_clientes > 0 ? (cs.clientes_count / summary.total_clientes) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-3">
                      {cs.clientes_count}
                    </Badge>
                  </div>
                ))
            )}
            {summary.clientes_sem_cs > 0 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-600">Sem CS</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${summary.total_clientes > 0 ? (summary.clientes_sem_cs / summary.total_clientes) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <Badge variant="destructive" className="ml-3">
                  {summary.clientes_sem_cs}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}