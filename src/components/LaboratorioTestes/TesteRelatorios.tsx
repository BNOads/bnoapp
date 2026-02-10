import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Trophy, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import type { TesteLaboratorio } from '@/types/laboratorio-testes';
import { STATUS_LABELS, VALIDACAO_LABELS, TIPO_LABELS } from '@/types/laboratorio-testes';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export const TesteRelatorios = () => {
  const [testes, setTestes] = useState<TesteLaboratorio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('testes_laboratorio')
        .select(`
          *,
          cliente:clientes!cliente_id(id, nome),
          gestor:gestor_responsavel_id(id, user_id, nome)
        `)
        .eq('arquivado', false)
        .order('created_at', { ascending: false });

      setTestes((data || []) as TesteLaboratorio[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const stats = useMemo(() => {
    const total = testes.length;
    const concluidos = testes.filter(t => t.status === 'concluido').length;
    const vencedores = testes.filter(t => t.validacao === 'deu_bom').length;
    const taxaConclusao = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    const taxaVitoria = concluidos > 0 ? Math.round((vencedores / concluidos) * 100) : 0;

    // Average test duration (only tests with both dates)
    const withDates = testes.filter(t => t.data_inicio && t.data_fim);
    const avgDays = withDates.length > 0
      ? Math.round(withDates.reduce((sum, t) => {
          const start = new Date(t.data_inicio!);
          const end = new Date(t.data_fim!);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / withDates.length)
      : 0;

    return { total, concluidos, vencedores, taxaConclusao, taxaVitoria, avgDays };
  }, [testes]);

  // Tests per client
  const testesPorCliente = useMemo(() => {
    const map = new Map<string, number>();
    testes.forEach(t => {
      const name = t.cliente?.nome || 'Sem cliente';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [testes]);

  // Tests per gestor
  const testesPorGestor = useMemo(() => {
    const map = new Map<string, number>();
    testes.forEach(t => {
      const name = t.gestor?.nome || 'Sem gestor';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [testes]);

  // Tests by type
  const testesPorTipo = useMemo(() => {
    const map = new Map<string, number>();
    testes.forEach(t => {
      const label = TIPO_LABELS[t.tipo_teste];
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [testes]);

  // Validation distribution
  const validacaoDistribuicao = useMemo(() => {
    const concluidos = testes.filter(t => t.status === 'concluido');
    const map = new Map<string, number>();
    concluidos.forEach(t => {
      const label = VALIDACAO_LABELS[t.validacao];
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [testes]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (testes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum teste registrado para gerar relatórios.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de Testes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{stats.concluidos}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.taxaConclusao}%</p>
            <p className="text-xs text-muted-foreground">Taxa de Conclusão</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-violet-600">{stats.taxaVitoria}%</p>
            <p className="text-xs text-muted-foreground">Taxa de Vitória</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{stats.avgDays}d</p>
            <p className="text-xs text-muted-foreground">Duração Média</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tests per client */}
        {testesPorCliente.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" />
                Testes por Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={testesPorCliente} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tests per gestor */}
        {testesPorGestor.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Testes por Gestor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={testesPorGestor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tests by type */}
        {testesPorTipo.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                Distribuição por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={testesPorTipo}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {testesPorTipo.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Validation distribution */}
        {validacaoDistribuicao.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-500" />
                Resultados dos Testes Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={validacaoDistribuicao}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {validacaoDistribuicao.map((entry, i) => {
                      const colorMap: Record<string, string> = {
                        'Deu Bom': '#10b981',
                        'Deu Ruim': '#ef4444',
                        'Inconclusivo': '#f59e0b',
                        'Em Teste': '#3b82f6',
                      };
                      return <Cell key={i} fill={colorMap[entry.name] || COLORS[i % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
