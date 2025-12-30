import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Calendar, DollarSign, ArrowRight, User, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAuth } from "@/components/Auth/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Lancamento {
  id: string;
  nome_lancamento: string;
  status_lancamento: string;
  tipo_lancamento: string;
  investimento_total: number;
  data_inicio_captacao: string | null;
  cliente_id: string | null;
  gestor_responsavel_id: string | null;
  checklist_configuracao: Record<string, boolean> | null;
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
            checklist_configuracao,
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

        setLancamentos((data || []).map(item => ({
          ...item,
          checklist_configuracao: item.checklist_configuracao as Record<string, boolean> | null
        })));
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Lançamentos Ativos
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full h-[180px] bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Lançamentos Ativos
          </h3>
        </div>
        <div className="text-center py-12 px-4 border-2 border-dashed rounded-xl">
          <Rocket className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'Nenhum lançamento ativo no momento'
              : 'Você não possui lançamentos ativos no momento'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Lançamentos Ativos
        </h3>
        <Badge variant="secondary" className="text-sm">
          {lancamentos.length} {lancamentos.length === 1 ? 'Ativo' : 'Ativos'}
        </Badge>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lancamentos.map((lancamento) => (
            <div
              key={lancamento.id}
              onClick={() => navigate(`/lancamentos/${lancamento.id}`)}
              className="group relative w-full p-4 rounded-xl border-2 bg-card hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              {/* Ícone de link externo */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-1.5 rounded-md bg-muted hover:bg-muted/80">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Badge de Status e Alertas */}
              <div className="mb-3 flex items-center justify-between pr-8">
                <Badge
                  className={`${getStatusColor(lancamento.status_lancamento)} font-medium`}
                >
                  {getStatusLabel(lancamento.status_lancamento)}
                </Badge>

                {(() => {
                  const alerts = [];
                  if (!lancamento.data_inicio_captacao) alerts.push('Data de início não definida');

                  const checklist = lancamento.checklist_configuracao || {};
                  const hasUncheckedItems = Object.values(checklist).some(val => val === false);
                  const topLevelKeys = ['checklist_criativos'];
                  const isMissingKeys = topLevelKeys.some(key => !checklist[key]);

                  if (hasUncheckedItems || isMissingKeys) {
                    alerts.push('Pendências no checklist');
                  }

                  if (alerts.length > 0) {
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-md border border-orange-200 dark:border-orange-800 animate-pulse">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Atenção</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100">
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              {alerts.map((alert, idx) => (
                                <li key={idx}>{alert}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Nome do Lançamento */}
              <h4 className="font-bold text-lg mb-3 pr-8 line-clamp-2 group-hover:text-primary transition-colors">
                {lancamento.nome_lancamento}
              </h4>

              {/* Cliente */}
              {lancamento.clientes?.nome && (
                <p className="text-sm text-muted-foreground mb-3 truncate">
                  {lancamento.clientes.nome}
                </p>
              )}

              {/* Investimento */}
              {lancamento.investimento_total > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(lancamento.investimento_total)}
                  </span>
                </div>
              )}

              {/* Informações Adicionais */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs text-muted-foreground">
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

        {/* Botão Ver Todos */}
        <div className="flex justify-center mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/ferramentas/lancamentos')}
            className="text-sm"
          >
            Ver todos os lançamentos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
