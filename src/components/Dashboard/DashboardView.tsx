import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, BookOpen, BarChart3, MessageSquare, Wrench, GraduationCap, CheckCircle, Clock, Star, LayoutDashboard } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { OrcamentosView } from "@/components/Orcamento/OrcamentosView";
import { PDICard } from "@/components/PDI/PDICard";
import { useRecentTabs } from "@/hooks/useRecentTabs";
import { useFavoriteTabs } from "@/hooks/useFavoriteTabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
export function DashboardView() {
  const navigate = useNavigate();
  const { canCreateContent, isAdmin } = useUserPermissions();
  const { recentTabs } = useRecentTabs();
  const { favorites, availableTabs, toggleFavorite, isFavorite } = useFavoriteTabs();
  const [showOrcamentos, setShowOrcamentos] = useState(false);
  const [pdis, setPdis] = useState<any[]>([]);
  const [pdisFinalizados, setPdisFinalizados] = useState<any[]>([]);
  const [loadingPdis, setLoadingPdis] = useState(true);
  const { toast } = useToast();
  const getTabIcon = (iconName: string) => {
    const icons = {
      Users,
      Calendar,
      BookOpen,
      BarChart3,
      MessageSquare,
      Wrench,
      LayoutDashboard,
      Clock
    };
    return icons[iconName as keyof typeof icons] || Clock;
  };
  const carregarPdis = async () => {
    try {
      setLoadingPdis(true);

      // Buscar PDIs ativos
      const {
        data: pdisAtivos,
        error: errorAtivos
      } = await supabase.from('pdis').select(`
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
        `).eq('status', 'ativo').order('data_limite', {
        ascending: true
      });
      if (errorAtivos) throw errorAtivos;

      // Buscar PDIs finalizados
      const {
        data: pdisCompletos,
        error: errorCompletos
      } = await supabase.from('pdis').select(`
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
        `).eq('status', 'concluido').order('updated_at', {
        ascending: false
      }).limit(5);
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

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  // Se estiver mostrando orçamentos, renderizar a view de orçamentos
  if (showOrcamentos) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setShowOrcamentos(false)}>
            ← Voltar ao Dashboard
          </Button>
        </div>
        <OrcamentosView />
      </div>
    );
  }

    return <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground shadow-glow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2 leading-tight">Bem-vindo à BNOads!</h2>
            <p className="text-primary-foreground/80 text-base lg:text-lg leading-relaxed">
              Sua central de navegação e atalhos rápidos
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfWcsLJsV0Wc7HOfUFbqa4Kl10e9AkBoq9UeOxGFdNCa_LXnw/viewform', '_blank')} 
            className="flex-1 border border-white/20 bg-slate-50 text-sky-900 text-sm"
          >
            Preencher conversa franca
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => window.open('https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0cWtPyvaNzPZUaGIaDsYjDGshuYHKA_BhbvCN1YOWxny-lU4EfOpteOvNPjfzj8aBxfbP9baoo', '_blank')} 
            className="flex-1 border border-white/20 bg-slate-50 text-blue-950 text-sm"
          >
            Marcar 1x1
          </Button>
        </div>
      </div>

      {/* Navigation Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tabs */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Abas Recentes
          </h3>
          {recentTabs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma aba visitada recentemente</p>
          ) : (
            <div className="space-y-2">
              {recentTabs.map((tab) => {
                const IconComponent = getTabIcon(tab.icon);
                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-muted"
                    onClick={() => handleTabClick(tab.path)}
                  >
                    <IconComponent className="h-4 w-4 text-primary mr-3" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{tab.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tab.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Favorites */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Favoritos do Sistema
          </h3>
          
          {/* Favorite Toggle Controls */}
          <div className="space-y-2 mb-4">
            {availableTabs.map((tab) => {
              const IconComponent = getTabIcon(tab.icon);
              const isTabFavorite = isFavorite(tab.id);
              
              return (
                <div key={tab.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{tab.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(tab.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Star className={`h-4 w-4 ${isTabFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Favorite Shortcuts */}
          {favorites.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Atalhos Rápidos</h4>
              <div className="grid grid-cols-2 gap-2">
                {favorites.map((tab) => {
                  const IconComponent = getTabIcon(tab.icon);
                  return (
                    <Button
                      key={tab.id}
                      variant="outline"
                      className="h-auto p-3 flex-col gap-2"
                      onClick={() => handleTabClick(tab.path)}
                    >
                      <IconComponent className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">{tab.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* PDI Section */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6 flex-shrink-0" />
              <span className="truncate">Meus PDIs</span>
            </h3>
            <p className="text-muted-foreground mt-1">
              Acompanhe seus Planos de Desenvolvimento Individual
            </p>
          </div>
        </div>

        {loadingPdis ? 
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div> 
        : pdis.length === 0 ? 
          <Card className="p-8 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">
              Nenhum PDI encontrado
            </h4>
            <p className="text-muted-foreground">
              Você não possui PDIs ativos no momento.
            </p>
          </Card> 
        : 
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {pdis.map(pdi => <PDICard key={pdi.id} pdi={pdi} onViewDetails={handleViewPdiDetails} />)}
          </div>
        }
      </section>

      {/* Histórico de PDIs Finalizados */}
      {pdisFinalizados.length > 0 && (
        <section className="space-y-6">
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
            {pdisFinalizados.map(pdi => (
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
        </section>
      )}

      {/* View Only Badge */}
      {!canCreateContent && <ViewOnlyBadge />}
    </div>;
}
;