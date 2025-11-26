import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Calendar, BookOpen, BarChart3, MessageSquare, Wrench, GraduationCap, CheckCircle, Clock, LayoutDashboard, Play, Palette, FileText, ClipboardList, TrendingDown, Network, LogIn, User, Lock, Edit2, Check, X, Filter, Settings, Trophy, ArrowRight, Plus } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { OrcamentosView } from "@/components/Orcamento/OrcamentosView";
import { PDICard } from "@/components/PDI/PDICard";
import { PDIEquipeCard } from "@/components/Dashboard/PDIEquipeCard";
import { useRecentTabs } from "@/hooks/useRecentTabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Top3Ranking } from "@/components/Gamificacao/Top3Ranking";
import { RegistrarAcaoModal } from "@/components/Gamificacao/RegistrarAcaoModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ThemeSwitch from "@/components/ui/theme-switch";
import { LancamentosAtivos } from "@/components/Dashboard/LancamentosAtivos";

export function DashboardView() {
  const navigate = useNavigate();
  const { canCreateContent, isAdmin, isMaster, canManageBudgets } = useUserPermissions();
  const { recentTabs } = useRecentTabs();
  const [showOrcamentos, setShowOrcamentos] = useState(false);
  const [pdis, setPdis] = useState<any[]>([]);
  const [pdisFinalizados, setPdisFinalizados] = useState<any[]>([]);
  const [allPdis, setAllPdis] = useState<any[]>([]);
  const [pdisEquipe, setPdisEquipe] = useState<any[]>([]);
  const [loadingPdis, setLoadingPdis] = useState(true);
  const [loadingPdisEquipe, setLoadingPdisEquipe] = useState(true);
  const [pdiFilter, setPdiFilter] = useState<'todos' | 'ativos' | 'finalizados'>('todos');
  const [pdiEquipeFilter, setPdiEquipeFilter] = useState<'todos' | 'ativos' | 'finalizados'>('todos');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedBgColor, setSelectedBgColor] = useState(() => {
    return localStorage.getItem('dashboard-header-color') || 'gradient-primary';
  });
  const [desafioAtual, setDesafioAtual] = useState<any>(null);
  const [showRegistrarAcao, setShowRegistrarAcao] = useState(false);
  const { toast } = useToast();
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);
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

      // Buscar o colaborador_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingPdis(false);
        return;
      }

      const { data: colaboradorData, error: colaboradorError } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (colaboradorError) {
        console.error('Erro ao buscar colaborador:', colaboradorError);
      }

      // Se não encontrou colaborador, não mostra PDIs (apenas para admins que não têm registro de colaborador)
      if (!colaboradorData) {
        setPdis([]);
        setPdisFinalizados([]);
        setAllPdis([]);
        setLoadingPdis(false);
        return;
      }

      // Buscar PDIs ativos do colaborador
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
        `)
        .eq('colaborador_id', colaboradorData.id)
        .eq('status', 'ativo')
        .order('data_limite', {
          ascending: true
        });
      if (errorAtivos) throw errorAtivos;

      // Buscar PDIs finalizados do colaborador
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
        `)
        .eq('colaborador_id', colaboradorData.id)
        .eq('status', 'concluido')
        .order('updated_at', {
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
  
  const carregarPdisEquipe = async () => {
    if (!isAdmin) {
      setLoadingPdisEquipe(false);
      return;
    }
    
    try {
      setLoadingPdisEquipe(true);

      // Buscar todos os PDIs com informações do colaborador
      const { data, error } = await supabase
        .from('pdis')
        .select(`
          *,
          colaboradores!pdis_colaborador_id_fkey (
            nome,
            avatar_url
          ),
          pdi_aulas (
            id,
            concluida
          )
        `)
        .order('data_limite', { ascending: true });

      if (error) throw error;

      const formatarPdisEquipe = (data || []).map(pdi => {
        const totalAulas = (pdi.pdi_aulas?.length || 0) + (Array.isArray(pdi.aulas_externas) ? pdi.aulas_externas.length : 0);
        const aulasConcluidas = (pdi.pdi_aulas?.filter((a: any) => a.concluida).length || 0) + 
          (Array.isArray(pdi.aulas_externas) ? pdi.aulas_externas.filter((a: any) => a.concluida).length : 0);
        const progresso = totalAulas > 0 ? (aulasConcluidas / totalAulas) * 100 : 0;

        return {
          id: pdi.id,
          titulo: pdi.titulo,
          descricao: pdi.descricao,
          data_limite: pdi.data_limite,
          status: pdi.status,
          colaborador: {
            nome: pdi.colaboradores?.nome || 'Colaborador',
            avatar_url: pdi.colaboradores?.avatar_url
          },
          progresso,
          total_aulas: totalAulas,
          aulas_concluidas: aulasConcluidas
        };
      });

      setPdisEquipe(formatarPdisEquipe);
    } catch (error) {
      console.error('Erro ao carregar PDIs da equipe:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar PDIs da equipe",
        variant: "destructive"
      });
    } finally {
      setLoadingPdisEquipe(false);
    }
  };
  
  const carregarDesafioAtual = async () => {
    try {
      const { data, error } = await supabase
        .from('gamificacao_desafios')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDesafioAtual(data);
    } catch (error) {
      console.error('Erro ao carregar desafio:', error);
    }
  };

  useEffect(() => {
    carregarPdis();
    carregarDesafioAtual();
  }, []);

  // Recarrega PDIs da equipe quando a permissão de admin estiver disponível
  useEffect(() => {
    if (isAdmin) {
      carregarPdisEquipe();
    }
  }, [isAdmin]);
  const handleViewPdiDetails = (pdiId: string) => {
    navigate(`/pdi/${pdiId}`);
  };

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  const colorOptions = [
    { id: 'gradient-primary', name: 'Azul (Padrão)', class: 'bg-gradient-primary', preview: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { id: 'gradient-purple', name: 'Roxo', class: 'bg-gradient-to-r from-purple-500 to-purple-600', preview: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    { id: 'gradient-green', name: 'Verde', class: 'bg-gradient-to-r from-emerald-500 to-emerald-600', preview: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
    { id: 'gradient-orange', name: 'Laranja', class: 'bg-gradient-to-r from-orange-500 to-orange-600', preview: 'bg-gradient-to-r from-orange-500 to-orange-600' },
    { id: 'gradient-pink', name: 'Rosa', class: 'bg-gradient-to-r from-pink-500 to-pink-600', preview: 'bg-gradient-to-r from-pink-500 to-pink-600' },
    { id: 'gradient-teal', name: 'Azul-verde', class: 'bg-gradient-to-r from-teal-500 to-teal-600', preview: 'bg-gradient-to-r from-teal-500 to-teal-600' },
  ];

  const handleColorChange = (colorId: string) => {
    setSelectedBgColor(colorId);
    localStorage.setItem('dashboard-header-color', colorId);
    setShowColorPicker(false);
    toast({
      title: "Cor alterada!",
      description: "A cor do cabeçalho foi atualizada.",
    });
  };

  const getCurrentColorClass = () => {
    const selectedColor = colorOptions.find(color => color.id === selectedBgColor);
    return selectedColor ? selectedColor.class : 'bg-gradient-primary';
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
      <div className={`${getCurrentColorClass()} rounded-xl p-6 text-white shadow-glow relative`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2 leading-tight">Bem-vindo à BNOads!</h2>
            <p className="text-white/80 text-base lg:text-lg leading-relaxed">
              Sua central de navegação e atalhos rápidos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitch className="scale-90" />
            <div className="relative" ref={colorPickerRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="text-white hover:bg-white/20 border border-white/20"
              >
                <Palette className="h-4 w-4 mr-2" />
                Personalizar
              </Button>
              
              {showColorPicker && (
                <div className="absolute right-0 top-full mt-2 bg-popover rounded-lg shadow-lg border p-4 z-10 min-w-[280px]">
                  <h3 className="text-sm font-medium text-foreground mb-3">Escolha uma cor:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => handleColorChange(color.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors ${
                          selectedBgColor === color.id ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${color.preview}`}></div>
                        <span className="text-sm text-foreground">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfWcsLJsV0Wc7HOfUFbqa4Kl10e9AkBoq9UeOxGFdNCa_LXnw/viewform', '_blank')} 
            className="flex-1 border border-white/20 bg-secondary text-secondary-foreground text-sm"
          >
            Preencher conversa franca
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => window.open('https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0cWtPyvaNzPZUaGIaDsYjDGshuYHKA_BhbvCN1YOWxny-lU4EfOpteOvNPjfzj8aBxfbP9baoo', '_blank')} 
            className="flex-1 border border-white/20 bg-secondary text-secondary-foreground text-sm"
          >
            Marcar 1x1
          </Button>
        </div>
      </div>

      {/* Lançamentos Ativos Section - For Admin, Master and Traffic Managers */}
      {(isAdmin || isMaster || canManageBudgets) && (
        <section className="space-y-6">
          <LancamentosAtivos />
        </section>
      )}

      {/* Desafio do Mês Section */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-6 w-6 flex-shrink-0 text-yellow-600" />
              <span className="truncate">Desafio do Mês</span>
            </h3>
            <p className="text-muted-foreground mt-1">
              Participe dos desafios e suba no ranking!
            </p>
          </div>
          <Button
            onClick={() => navigate('/gamificacao')}
            variant="outline"
            className="flex items-center gap-2"
          >
            Ver Desafio Completo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            {desafioAtual ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">{desafioAtual.titulo}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{desafioAtual.descricao}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(new Date(desafioAtual.data_inicio), "dd/MM", { locale: ptBR })} - {format(new Date(desafioAtual.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowRegistrarAcao(true)}
                    className="flex items-center gap-1 flex-shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    Registrar
                  </Button>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-3">Top 3 no ranking:</p>
                  <Top3Ranking />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhum desafio ativo no momento
              </p>
            )}
          </CardContent>
        </Card>
      </section>

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

      {/* PDIs da Equipe Section - Apenas para Admins */}
      {isAdmin && (
        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-6 w-6 flex-shrink-0" />
                <span className="truncate">PDIs da Equipe</span>
              </h3>
              <p className="text-muted-foreground mt-1">
                Acompanhe o desenvolvimento de todos os colaboradores
              </p>
            </div>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={pdiEquipeFilter === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPdiEquipeFilter('todos')}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Todos
            </Button>
            <Button
              variant={pdiEquipeFilter === 'ativos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPdiEquipeFilter('ativos')}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Ativos
            </Button>
            <Button
              variant={pdiEquipeFilter === 'finalizados' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPdiEquipeFilter('finalizados')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Finalizados
            </Button>
          </div>

          {loadingPdisEquipe ? 
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div> 
          : pdisEquipe.length === 0 ? 
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Nenhum PDI encontrado
              </h4>
              <p className="text-muted-foreground">
                Não há PDIs criados para a equipe no momento.
              </p>
            </Card> 
          : (() => {
              const filteredPdisEquipe = pdisEquipe.filter(pdi => {
                if (pdiEquipeFilter === 'ativos') return pdi.status !== 'concluido';
                if (pdiEquipeFilter === 'finalizados') return pdi.status === 'concluido';
                return true; // todos
              });
              
              return filteredPdisEquipe.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {pdiEquipeFilter === 'todos' ? 'Nenhum PDI encontrado' : 
                     pdiEquipeFilter === 'ativos' ? 'Nenhum PDI ativo' : 
                     'Nenhum PDI finalizado'}
                  </h4>
                  <p className="text-muted-foreground">
                    {pdiEquipeFilter === 'todos' ? 'Não há PDIs criados no momento.' :
                     pdiEquipeFilter === 'ativos' ? 'Não há PDIs ativos no momento.' :
                     'Não há PDIs finalizados no momento.'}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredPdisEquipe.map(pdi => (
                    <PDIEquipeCard 
                      key={pdi.id} 
                      pdi={pdi}
                    />
                  ))}
                </div>
              );
            })()
          }
        </section>
      )}

      {/* View Only Badge */}
      {!canCreateContent && <ViewOnlyBadge />}
      
      {desafioAtual && (
        <RegistrarAcaoModal
          open={showRegistrarAcao}
          onOpenChange={(open) => {
            setShowRegistrarAcao(open);
            if (!open) carregarDesafioAtual();
          }}
          desafioId={desafioAtual.id}
          onSuccess={() => {
            carregarDesafioAtual();
          }}
        />
      )}
    </div>;
}
;