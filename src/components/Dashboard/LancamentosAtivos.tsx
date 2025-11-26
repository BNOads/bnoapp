import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Calendar, DollarSign, TrendingUp, ArrowRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAuth } from "@/components/Auth/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lancamento {
  id: string;
  nome_lancamento: string;
  status_lancamento: string;
  tipo_lancamento: string;
  investimento_total: number;
  data_inicio_captacao: string | null;
  cliente_id: string | null;
  gestor_responsavel_id: string | null;
  clientes?: {
    nome: string;
  };
  colaboradores?: {
    nome: string;
  };
}

export function LancamentosAtivos() {
  const navigate = useNavigate();
  const { isAdmin } = useUserPermissions();
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarLancamentos = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Primeiro, pegar o colaborador_id
        const { data: colaboradorData } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!colaboradorData) {
          setLancamentos([]);
          return;
        }

        // Query base
        let query = supabase
          .from('lancamentos')
          .select(`
            id,
            nome_lancamento,
            status_lancamento,
            tipo_lancamento,
            investimento_total,
            data_inicio_captacao,
            cliente_id,
            gestor_responsavel_id,
            clientes (nome),
            colaboradores:gestor_responsavel_id (nome)
          `)
          .eq('ativo', true)
          .in('status_lancamento', ['em_captacao', 'cpl', 'remarketing'])
          .order('data_inicio_captacao', { ascending: false, nullsFirst: false })
          .limit(isAdmin ? 10 : 5);

        // Se não for admin, filtrar apenas os lançamentos do gestor
        if (!isAdmin) {
          query = query.eq('gestor_responsavel_id', colaboradorData.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        setLancamentos(data || []);
      } catch (error) {
        console.error('Erro ao carregar lançamentos:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarLancamentos();
  }, [user?.id, isAdmin]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'em_captacao': 'Em Captação',
      'cpl': 'CPL',
      'remarketing': 'Remarketing',
      'pausado': 'Pausado',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'em_captacao': 'bg-blue-500/10 text-blue-600 border-blue-200',
      'cpl': 'bg-purple-500/10 text-purple-600 border-purple-200',
      'remarketing': 'bg-orange-500/10 text-orange-600 border-orange-200',
      'pausado': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
      'finalizado': 'bg-green-500/10 text-green-600 border-green-200',
      'cancelado': 'bg-red-500/10 text-red-600 border-red-200'
    };
    return statusColors[status] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Lançamentos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Lançamentos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Rocket className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {isAdmin 
                ? 'Nenhum lançamento ativo no momento' 
                : 'Você não possui lançamentos ativos no momento'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Lançamentos Ativos
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/ferramentas/lancamentos')}
          className="text-sm"
        >
          Ver todos
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lancamentos.map((lancamento) => (
            <div
              key={lancamento.id}
              onClick={() => navigate(`/lancamentos/${lancamento.id}`)}
              className="group p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {lancamento.nome_lancamento}
                  </h4>
                  {lancamento.clientes?.nome && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {lancamento.clientes.nome}
                    </p>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(lancamento.status_lancamento)} text-xs flex-shrink-0`}
                >
                  {getStatusLabel(lancamento.status_lancamento)}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {lancamento.investimento_total > 0 && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(lancamento.investimento_total)}
                    </span>
                  </div>
                )}
                
                {lancamento.data_inicio_captacao && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(lancamento.data_inicio_captacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                )}
                
                {isAdmin && lancamento.colaboradores?.nome && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{lancamento.colaboradores.nome}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
