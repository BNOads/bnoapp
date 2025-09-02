import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, BookOpen, BarChart3, TrendingUp, Clock, GraduationCap, CheckCircle } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoColaboradorModal } from "@/components/Colaboradores/NovoColaboradorModal";
import { NovoClienteModal } from "@/components/Clientes/NovoClienteModal";
import { NovoTreinamentoModal } from "@/components/Treinamentos/NovoTreinamentoModal";
import { PDICard } from "@/components/PDI/PDICard";

import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function DashboardView() {
  const navigate = useNavigate();
  const { canCreateContent } = useUserPermissions();
  const { activities } = useRecentActivities();
  const { stats, loading: statsLoading } = useDashboardStats();
  const [colaboradorModalOpen, setColaboradorModalOpen] = useState(false);
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [treinamentoModalOpen, setTreinamentoModalOpen] = useState(false);
  const [pdis, setPdis] = useState<any[]>([]);
  const [pdisFinalizados, setPdisFinalizados] = useState<any[]>([]);
  const [loadingPdis, setLoadingPdis] = useState(true);
  const { toast } = useToast();

  const statsData = [{
    title: "Colaboradores Ativos",
    value: statsLoading ? "..." : stats.colaboradoresAtivos.toString(),
    change: "+12%",
    icon: Users,
    color: "text-primary"
  }, {
    title: "Clientes Ativos",
    value: statsLoading ? "..." : stats.clientesAtivos.toString(),
    change: "+23%",
    icon: Calendar,
    color: "text-primary-glow"
  }, {
    title: "PDIs Finalizados",
    value: statsLoading ? "..." : stats.pdisFinalizados.toString(),
    change: "+8%",
    icon: BookOpen,
    color: "text-secondary"
  }, {
    title: "Taxa de Progresso",
    value: statsLoading ? "..." : `${stats.taxaProgresso}%`,
    change: "+5%",
    icon: TrendingUp,
    color: "text-primary"
  }];

  const carregarPdis = async () => {
    try {
      setLoadingPdis(true);
      
      // Buscar PDIs ativos
      const { data: pdisAtivos, error: errorAtivos } = await supabase
        .from('pdis')
        .select(`
          *,
          pdi_aulas (
            id,
            concluida,
            data_conclusao,
            aulas (
              id,
              titulo
            )
          )
        `)
        .eq('status', 'ativo')
        .order('data_limite', { ascending: true });

      if (errorAtivos) throw errorAtivos;

      // Buscar PDIs finalizados
      const { data: pdisCompletos, error: errorCompletos } = await supabase
        .from('pdis')
        .select(`
          *,
          pdi_aulas (
            id,
            concluida,
            data_conclusao,
            aulas (
              id,
              titulo
            )
          )
        `)
        .eq('status', 'concluido')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (errorCompletos) throw errorCompletos;

      const formatarPdis = (data: any[]) => (data || []).map(pdi => ({
        ...pdi,
        aulas: pdi.pdi_aulas.map((pa: any) => ({
          id: pa.aulas.id,
          titulo: pa.aulas.titulo,
          concluida: pa.concluida,
          data_conclusao: pa.data_conclusao
        }))
      }));

      setPdis(formatarPdis(pdisAtivos));
      setPdisFinalizados(formatarPdis(pdisCompletos));
    } catch (error) {
      console.error('Erro ao carregar PDIs:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar PDIs",
        variant: "destructive"
      });
    } finally {
      setLoadingPdis(false);
    }
  };

  useEffect(() => {
    carregarPdis();
  }, []);

  const handleViewPdiDetails = (pdiId: string) => {
    navigate(`/pdi/${pdiId}`);
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-primary rounded-2xl p-8 text-primary-foreground shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Bem-vindo à BNOads mito!</h2>
            <p className="text-primary-foreground/80 text-lg">Aqui é a sua central de treinamentos e informações sobre a empresa</p>
          </div>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfWcsLJsV0Wc7HOfUFbqa4Kl10e9AkBoq9UeOxGFdNCa_LXnw/viewform', '_blank')}
            className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20"
          >
            Preencher conversa franca
          </Button>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfWcsLJsV0Wc7HOfUFbqa4Kl10e9AkBoq9UeOxGFdNCa_LXnw/viewform', '_blank')}
            className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20"
          >
            Marcar 1x1
          </Button>
        </div>
      </div>

      {/* PDI Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Meus PDIs
            </h3>
            <p className="text-muted-foreground">
              Acompanhe seus Planos de Desenvolvimento Individual
            </p>
          </div>
        </div>

        {loadingPdis ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : pdis.length === 0 ? (
          <Card className="p-8 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">
              Nenhum PDI encontrado
            </h4>
            <p className="text-muted-foreground">
              Você não possui PDIs ativos no momento.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pdis.map((pdi) => (
              <PDICard
                key={pdi.id}
                pdi={pdi}
                onViewDetails={handleViewPdiDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Histórico de PDIs Finalizados */}
      {pdisFinalizados.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                PDIs Finalizados
              </h3>
              <p className="text-muted-foreground">
                Histórico dos seus últimos PDIs concluídos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdisFinalizados.map((pdi) => (
              <Card key={pdi.id} className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-green-800">{pdi.titulo}</CardTitle>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <CardDescription className="text-green-600">
                    Concluído em {new Date(pdi.updated_at).toLocaleDateString('pt-BR')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-green-700">
                    {pdi.aulas.length} aula{pdi.aulas.length !== 1 ? 's' : ''} concluída{pdi.aulas.length !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}


      {/* Indicator para usuários não-admin */}
      {!canCreateContent && <ViewOnlyBadge />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 bg-card border border-border hover:shadow-card transition-all duration-300 hover:border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                  <p className={`text-sm font-medium mt-1 ${stat.color}`}>
                    {stat.change} este mês
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-subtle`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions - Visível apenas para admins */}
        {canCreateContent && (
          <Card className="p-6 bg-card border border-border shadow-card">
            <h3 className="text-xl font-semibold mb-6 text-foreground">
              Ações Rápidas
            </h3>
            <div className="space-y-4">
              <Button variant="card" className="w-full justify-start h-auto p-4" onClick={() => setColaboradorModalOpen(true)}>
                <Users className="h-5 w-5 text-primary mr-3" />
                <div className="text-left">
                  <p className="font-medium">Cadastrar Colaborador</p>
                  <p className="text-sm text-muted-foreground">Adicionar novo membro à equipe</p>
                </div>
              </Button>
              <Button variant="card" className="w-full justify-start h-auto p-4" onClick={() => setClienteModalOpen(true)}>
                <Calendar className="h-5 w-5 text-primary mr-3" />
                <div className="text-left">
                  <p className="font-medium">Criar Painel Cliente</p>
                  <p className="text-sm text-muted-foreground">Gerar novo painel personalizado</p>
                </div>
              </Button>
              <Button variant="card" className="w-full justify-start h-auto p-4" onClick={() => setTreinamentoModalOpen(true)}>
                <BookOpen className="h-5 w-5 text-primary mr-3" />
                <div className="text-left">
                  <p className="font-medium">Adicionar Treinamento</p>
                  <p className="text-sm text-muted-foreground">Criar novo curso ou material</p>
                </div>
              </Button>
            </div>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className={`p-6 bg-card border border-border shadow-card ${!canCreateContent ? 'lg:col-span-2' : ''}`}>
          <h3 className="text-xl font-semibold mb-6 text-foreground">
            Atividade Recente
          </h3>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {activity.user}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modals */}
      <NovoColaboradorModal open={colaboradorModalOpen} onOpenChange={setColaboradorModalOpen} />
      <NovoClienteModal open={clienteModalOpen} onOpenChange={setClienteModalOpen} />
      <NovoTreinamentoModal open={treinamentoModalOpen} onOpenChange={setTreinamentoModalOpen} />
    </div>
  );
};