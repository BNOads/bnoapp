import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Calendar, BookOpen, BarChart3, MessageSquare, Wrench, GraduationCap, CheckCircle, Clock, LayoutDashboard, Play, Palette, FileText, ClipboardList, TrendingDown, Network, LogIn, User, Lock, Edit2, Check, X, Filter, Settings, Trophy, ArrowRight, Plus, MessageCircle, CalendarDays } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { OrcamentosView } from "@/components/Orcamento/OrcamentosView";

import { GlobalSearch } from "@/components/Dashboard/GlobalSearch";
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
import { AtalhosRapidos } from "@/components/Dashboard/AtalhosRapidos";

import { AniversariosProximos } from "@/components/Dashboard/AniversariosProximos";
import { TestesProximosVencer } from "@/components/Dashboard/TestesProximosVencer";
import { DesafioSidebar } from "@/components/Dashboard/DesafioSidebar";
import { LancamentosSidebar } from "@/components/Dashboard/LancamentosSidebar";
import { TodaysTasks } from "@/components/tasks/widgets/TodaysTasks";

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

  // Carregar desafio apenas para usar na modal de registrar ação, se necessário
  // A visualização principal do desafio agora é no Sidebar
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

  return <div className="space-y-3 lg:scale-[0.85] lg:origin-top-left lg:w-[117%] px-4">
    {/* Header Section */}
    <div className={`${getCurrentColorClass()} rounded-xl p-5 text-white shadow-glow relative`}>
      <div className="flex flex-col lg:flex-row gap-8 justify-between items-stretch">
        {/* Left Column: Welcome, Subtitle, Buttons */}
        <div className="flex-1 flex flex-col gap-2 justify-center min-h-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold truncate">Bem-vindo à BNOads!</h2>


            {/* Color Picker moved here */}
            <div className="relative inline-block" ref={colorPickerRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="text-white hover:bg-white/20 border-2 border-white/20 h-10 w-10 rounded-full"
              >
                <Palette className="h-5 w-5" />
              </Button>

              {showColorPicker && (
                <div className="absolute left-full top-0 ml-2 bg-popover rounded-lg shadow-lg border p-4 z-20 min-w-[280px]">
                  <h3 className="text-sm font-medium text-foreground mb-3">Escolha uma cor:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => handleColorChange(color.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors ${selectedBgColor === color.id ? 'ring-2 ring-primary' : ''
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
          <div>
            <p className="text-white/90 text-lg lg:text-xl font-light tracking-wide">
              Sua central de navegação e atalhos rápidos
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-1">
            <Button
              variant="ghost"
              className="bg-white hover:bg-white/90 text-blue-600 border border-transparent h-11 px-6 text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] gap-2"
              onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfWcsLJsV0Wc7HOfUFbqa4Kl10e9AkBoq9UeOxGFdNCa_LXnw/viewform', '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              Conversa Franca
            </Button>
            <Button
              variant="ghost"
              className="bg-white hover:bg-white/90 text-blue-600 border border-transparent h-11 px-6 text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] gap-2"
              onClick={() => window.open('https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0cWtPyvaNzPZUaGIaDsYjDGshuYHKA_BhbvCN1YOWxny-lU4EfOpteOvNPjfzj8aBxfbP9baoo', '_blank')}
            >
              <CalendarDays className="h-4 w-4" />
              Marcar 1x1
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="bg-white hover:bg-white/90 text-blue-600 border border-transparent h-11 px-6 text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Atalhos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Meus Atalhos</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <AtalhosRapidos variant="grid" />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Middle Column: Search */}
        <div className="hidden lg:flex flex-col justify-center min-w-[350px] max-w-[500px] flex-1 px-4">
          <GlobalSearch />
        </div>

        {/* Right Section: Desafio + Birthday + Settings */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch w-full lg:w-auto">
          <div className="w-full lg:w-[320px] text-foreground h-full">
            <DesafioSidebar />
          </div>
          {/* Birthday & Settings */}
          <div className="min-w-0 w-full lg:w-[280px] h-full">
            <AniversariosProximos compact={true} className="h-full flex flex-col" />
          </div>

        </div>
      </div>
    </div>
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar - Agora com Desafio e Lançamentos */}
      <aside className="w-full lg:w-1/4 min-w-[260px] space-y-2">
        {/* Desafio Moved to Header */}
        {(isAdmin || isMaster || canManageBudgets) && (
          <LancamentosSidebar />
        )}

        <TestesProximosVencer />

        {/* PDI Section - Moved to Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground">Meus PDIs</h3>
          </div>

          {loadingPdis ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map(i => (
                <Card key={i} className="p-4 flex flex-col gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : pdis.length === 0 ? (
            <Card className="p-4 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground">Nenhum PDI ativo</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {allPdis.filter(pdi => pdi.status === 'ativo').map(pdi => (
                <PDICard
                  key={pdi.id}
                  pdi={pdi}
                  onViewDetails={handleViewPdiDetails}
                  isCompleted={false}
                  compact={true}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">



        {/* View Only Badge */}
        {!canCreateContent && <ViewOnlyBadge />}

        <div className="w-full">
          <TodaysTasks />
        </div>

        {
          desafioAtual && (
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
          )
        }
      </div>
    </div>
  </div >;
}
;