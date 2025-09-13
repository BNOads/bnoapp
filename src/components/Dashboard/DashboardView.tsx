import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Calendar, BookOpen, BarChart3, MessageSquare, Wrench, GraduationCap, CheckCircle, Clock, Star, LayoutDashboard, Play, Palette, FileText, ClipboardList, TrendingDown, Network, LogIn, User, Lock, Edit2, Check, X, Filter } from "lucide-react";
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
  const { favorites, toggleCurrentPageFavorite, isCurrentPageFavorite, renameFavorite } = useFavoriteTabs();
  const [showOrcamentos, setShowOrcamentos] = useState(false);
  const [pdis, setPdis] = useState<any[]>([]);
  const [pdisFinalizados, setPdisFinalizados] = useState<any[]>([]);
  const [allPdis, setAllPdis] = useState<any[]>([]);
  const [loadingPdis, setLoadingPdis] = useState(true);
  const [editingFavorite, setEditingFavorite] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pdiFilter, setPdiFilter] = useState<'todos' | 'ativos' | 'finalizados'>('todos');
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
      Clock,
      GraduationCap,
      Play,
      Palette,
      FileText,
      ClipboardList: FileText, // fallback for ClipboardList
      TrendingDown: BarChart3, // fallback for TrendingDown
      Network: Wrench, // fallback for Network
      LogIn: Users, // fallback for LogIn
      User: Users, // fallback for User
      Lock: Users // fallback for Lock
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
      
      const formattedActivePdis = formatarPdis(pdisAtivos);
      const formattedCompletedPdis = formatarPdis(pdisCompletos);
      
      setPdis(formattedActivePdis);
      setPdisFinalizados(formattedCompletedPdis);
      
      // Combine all PDIs for unified view
      setAllPdis([...formattedActivePdis, ...formattedCompletedPdis]);
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
          
          {favorites.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma página favoritada ainda. Use a estrela ⭐ no cabeçalho para favoritar páginas.
            </p>
          ) : (
            <div className="space-y-2">
              {favorites.map((favorite) => {
                const IconComponent = getTabIcon(favorite.icon);
                const isEditing = editingFavorite === favorite.id;
                const displayName = favorite.customName || favorite.name;
                
                return (
                  <div
                    key={favorite.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted group"
                  >
                    {isEditing ? (
                      <>
                        <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameFavorite(favorite.id, editName);
                              setEditingFavorite(null);
                            } else if (e.key === 'Escape') {
                              setEditingFavorite(null);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            renameFavorite(favorite.id, editName);
                            setEditingFavorite(null);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditingFavorite(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start h-auto p-2 hover:bg-muted"
                          onClick={() => handleTabClick(favorite.path)}
                        >
                          <IconComponent className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                          <span className="font-medium truncate">{displayName}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditingFavorite(favorite.id);
                            setEditName(displayName);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
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
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={pdiFilter === 'todos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPdiFilter('todos')}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Todos
          </Button>
          <Button
            variant={pdiFilter === 'ativos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPdiFilter('ativos')}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Ativos
          </Button>
          <Button
            variant={pdiFilter === 'finalizados' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPdiFilter('finalizados')}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Finalizados
          </Button>
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
        : (() => {
            const filteredPdis = allPdis.filter(pdi => {
              if (pdiFilter === 'ativos') return pdi.status === 'ativo';
              if (pdiFilter === 'finalizados') return pdi.status === 'concluido';
              return true; // todos
            });
            
            return filteredPdis.length === 0 ? (
              <Card className="p-8 text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {pdiFilter === 'todos' ? 'Nenhum PDI encontrado' : 
                   pdiFilter === 'ativos' ? 'Nenhum PDI ativo' : 
                   'Nenhum PDI finalizado'}
                </h4>
                <p className="text-muted-foreground">
                  {pdiFilter === 'todos' ? 'Você não possui PDIs no momento.' :
                   pdiFilter === 'ativos' ? 'Você não possui PDIs ativos no momento.' :
                   'Você ainda não finalizou nenhum PDI.'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPdis.map(pdi => (
                  <PDICard 
                    key={pdi.id} 
                    pdi={pdi} 
                    onViewDetails={handleViewPdiDetails} 
                    isCompleted={pdi.status === 'concluido'}
                  />
                ))}
              </div>
            );
          })()
        }
      </section>

      {/* View Only Badge */}
      {!canCreateContent && <ViewOnlyBadge />}
    </div>;
}
;