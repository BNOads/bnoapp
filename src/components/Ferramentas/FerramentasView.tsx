import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DebriefingsView from "@/components/Debriefings/DebriefingsView";
import { BlocoNotasView } from "./BlocoNotasView";
import { OrcamentosView } from "@/components/Orcamento/OrcamentosView";
import { FileText, Palette, NotebookPen, BarChart3, ArrowLeft, Calendar, Link, Key, CheckCircle, MessageSquare, GripVertical, Eye, EyeOff, RotateCcw, Trophy, BookOpen, Clock, Users, MessageCircle, Filter, Download, Heart, FlaskConical, Calculator, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
import LancamentosView from "@/components/Lancamentos/LancamentosView";
import { UTMBuilderView } from "./UTMBuilderView";
import { AcessosLoginsView } from "./AcessosLoginsView";
import { MensagensSemanaisView } from "./MensagensSemanaisView";
import { LinksView } from "./LinksView";
import { CreativeDownloaderView } from "./CreativeDownloaderView";
import { DocumentosView } from "./DocumentosView";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgLight: string;
  borderLight: string;
  component: React.ReactNode;
  comingSoon?: boolean;
  hideHeader?: boolean;
}

// Componente de card draggable
const SortableToolCard = ({ tool, onSelect, isEditMode }: { tool: Tool; onSelect: (id: string) => void; isEditMode: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const Icon = tool.icon;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        relative h-full flex flex-col group overflow-hidden transition-all duration-300
        ${tool.comingSoon
          ? 'cursor-not-allowed opacity-70 bg-muted/20 border-border/40 grayscale-[0.5]'
          : `cursor-pointer border-border/50 bg-background/50 hover:bg-background hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.03)] hover:-translate-y-1 hover:border-transparent`
        }
      `}
      onClick={() => !isEditMode && !tool.comingSoon && onSelect(tool.id)}
    >
      {/* Subtle border top that lights up on hover */}
      {!tool.comingSoon && (
        <div className={`absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${tool.bgLight.replace('bg-', 'bg-').split('/')[0]}`} style={{ backgroundColor: 'currentColor' }} />
      )}

      {/* Add a subtle glow inside the card based on the tool color */}
      {!tool.comingSoon && (
        <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${tool.bgLight.split('/')[0]}`} />
      )}

      {tool.comingSoon && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-muted/80 text-muted-foreground text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-border/50">
            <Clock className="w-3 h-3" />
            Em Breve
          </div>
        </div>
      )}

      <CardHeader className="pb-2 pt-5 px-5 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl transition-all duration-300 ${tool.comingSoon ? 'bg-muted text-muted-foreground' : `${tool.bgLight} ${tool.color} group-hover:scale-110 group-hover:shadow-sm`}`}>
            <Icon className="h-6 w-6" />
          </div>
          {isEditMode && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grabbing p-1.5 hover:bg-muted/80 rounded-md touch-none text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
        </div>
        <CardTitle className={`text-base font-bold tracking-tight ${tool.comingSoon ? 'text-muted-foreground' : 'text-foreground/90 group-hover:text-foreground'}`}>
          {tool.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0 flex-1 relative z-10">
        <p className={`text-sm leading-relaxed line-clamp-2 ${tool.comingSoon ? 'text-muted-foreground/70' : 'text-muted-foreground/80 group-hover:text-muted-foreground'}`}>
          {tool.description}
        </p>
      </CardContent>
    </Card>
  );
};

export const FerramentasView = () => {
  const { toolName } = useParams();
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hiddenTools, setHiddenTools] = useState<string[]>([]);
  const [toolsOrder, setToolsOrder] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const tools: Tool[] = [
    {
      id: "laboratorio-testes",
      title: "Laboratório de Testes",
      description: "Registre, acompanhe e aprenda com testes de tráfego de forma centralizada",
      icon: FlaskConical,
      component: null,
      color: "text-violet-600 dark:text-violet-400",
      bgLight: "bg-violet-50 dark:bg-violet-950/30",
      borderLight: "border-violet-200 dark:border-violet-900/50"
    },
    {
      id: "criador-criativos",
      title: "Criador de Criativos",
      description: "Gere variações de criativos automaticamente com IA",
      icon: Palette,
      component: null,
      color: "text-purple-600 dark:text-purple-400",
      bgLight: "bg-purple-50 dark:bg-purple-950/30",
      borderLight: "border-purple-200 dark:border-purple-900/50"
    },
    {
      id: "downloader-criativos",
      title: "Downloader de Criativos",
      description: "Baixe vídeos de YouTube, Instagram e Meta Ad Library em MP4",
      icon: Download,
      component: <CreativeDownloaderView />,
      color: "text-orange-600 dark:text-orange-400",
      bgLight: "bg-orange-50 dark:bg-orange-950/30",
      borderLight: "border-orange-200 dark:border-orange-900/50"
    },
    {
      id: "arquivo-reuniao",
      title: "Arquivo de Reunião",
      description: "Arquivo anual de reuniões com índice de navegação e busca inteligente",
      icon: BookOpen,
      component: null,
      color: "text-teal-600 dark:text-teal-400",
      bgLight: "bg-teal-50 dark:bg-teal-950/30",
      borderLight: "border-teal-200 dark:border-teal-900/50"
    },
    {
      id: "referencias",
      title: "Referências",
      description: "Gerencie documentos multimédia para referência da equipe criativa",
      icon: Palette,
      component: null,
      color: "text-fuchsia-600 dark:text-fuchsia-400",
      bgLight: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
      borderLight: "border-fuchsia-200 dark:border-fuchsia-900/50"
    },
    {
      id: "debriefings",
      title: "Debriefings",
      description: "Crie e analise relatórios detalhados de campanhas e resultados",
      icon: FileText,
      component: <DebriefingsView />,
      color: "text-gray-600 dark:text-gray-400",
      bgLight: "bg-gray-100 dark:bg-gray-800/50",
      borderLight: "border-gray-200 dark:border-gray-700/50",
      comingSoon: true
    },
    {
      id: "notas",
      title: "Bloco de Notas",
      description: "Suas anotações pessoais e lembretes organizados em um só lugar",
      icon: NotebookPen,
      component: <BlocoNotasView />,
      color: "text-green-600 dark:text-green-400",
      bgLight: "bg-green-50 dark:bg-green-950/30",
      borderLight: "border-green-200 dark:border-green-900/50"
    },
    {
      id: "documentos",
      title: "Documentos",
      description: "Editor estilo Notion com pastas, favoritos e compartilhamento público",
      icon: FileText,
      component: <DocumentosView />,
      color: "text-sky-600 dark:text-sky-400",
      bgLight: "bg-sky-50 dark:bg-sky-950/30",
      borderLight: "border-sky-200 dark:border-sky-900/50"
    },
    {
      id: "orcamentos-funil",
      title: "Gestão de Funis",
      description: "Gerencie orçamentos de marketing organizados por funil",
      icon: Filter,
      component: <OrcamentosView />,
      color: "text-emerald-600 dark:text-emerald-400",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
      borderLight: "border-emerald-200 dark:border-emerald-900/50",
      hideHeader: true
    },
    {
      id: "lancamentos",
      title: "Gestão de Lançamentos",
      description: "Gerencie e acompanhe todos os lançamentos e campanhas",
      icon: BarChart3,
      component: <LancamentosView />,
      color: "text-blue-600 dark:text-blue-400",
      bgLight: "bg-blue-50 dark:bg-blue-950/30",
      borderLight: "border-blue-200 dark:border-blue-900/50"
    },
    {
      id: "utm-builder",
      title: "Criador de UTM",
      description: "Gere URLs com parâmetros UTM padronizados individual ou em massa",
      icon: Link,
      component: <UTMBuilderView />,
      color: "text-cyan-600 dark:text-cyan-400",
      bgLight: "bg-cyan-50 dark:bg-cyan-950/30",
      borderLight: "border-cyan-200 dark:border-cyan-900/50"
    },
    {
      id: "acessos-logins",
      title: "Acessos & Logins",
      description: "Gerencie credenciais e acessos da equipe de forma segura",
      icon: Key,
      component: <AcessosLoginsView />,
      color: "text-red-600 dark:text-red-400",
      bgLight: "bg-red-50 dark:bg-red-950/30",
      borderLight: "border-red-200 dark:border-red-900/50"
    },
    {
      id: "mensagens-semanais",
      title: "Mensagens Semanais",
      description: "Gerencie mensagens semanais dos clientes e controle de envio",
      icon: MessageSquare,
      component: <MensagensSemanaisView />,
      color: "text-indigo-600 dark:text-indigo-400",
      bgLight: "bg-indigo-50 dark:bg-indigo-950/30",
      borderLight: "border-indigo-200 dark:border-indigo-900/50"
    },
    {
      id: "links",
      title: "Links Importantes",
      description: "Central de links importantes organizados por cliente",
      icon: Link,
      component: <LinksView />,
      color: "text-emerald-600 dark:text-emerald-400",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
      borderLight: "border-emerald-200 dark:border-emerald-900/50"
    },
    {
      id: "simulador-funil",
      title: "Simulador de Funil",
      description: "Simule cenários e projete resultados de tráfego de forma independente",
      icon: Calculator,
      component: null,
      color: "text-blue-600 dark:text-blue-400",
      bgLight: "bg-blue-50 dark:bg-blue-950/30",
      borderLight: "border-blue-200 dark:border-blue-900/50"
    },
    {
      id: "nps",
      title: "NPS & Satisfação",
      description: "Acompanhe e gerencie a satisfação dos clientes com NPS",
      icon: BarChart3,
      component: null,
      color: "text-gray-500",
      bgLight: "bg-gray-100",
      borderLight: "border-gray-200",
      comingSoon: true
    },
    {
      id: "desafio",
      title: "Desafio",
      description: "Participe dos desafios mensais e acompanhe o ranking",
      icon: Trophy,
      component: null,
      color: "text-yellow-600 dark:text-yellow-500",
      bgLight: "bg-yellow-50 dark:bg-yellow-950/30",
      borderLight: "border-yellow-200 dark:border-yellow-900/50"
    },
    {
      id: "assistente",
      title: "Assistente IA",
      description: "Assistente virtual para auxílio em tarefas e dúvidas",
      icon: MessageCircle,
      component: null,
      color: "text-pink-600 dark:text-pink-400",
      bgLight: "bg-pink-50 dark:bg-pink-950/30",
      borderLight: "border-pink-200 dark:border-pink-900/50"
    },
    {
      id: "cultura-time",
      title: "Cultura & Time",
      description: "Cultura da empresa, time em campo, missão, visão e valores",
      icon: Heart,
      component: null,
      color: "text-rose-600 dark:text-rose-400",
      bgLight: "bg-rose-50 dark:bg-rose-950/30",
      borderLight: "border-rose-200 dark:border-rose-900/50"
    },
    {
      id: "admin-meta-ads",
      title: "Integração MetaAds",
      description: "Gerencie contas de anúncio, vincule a clientes e visualize status.",
      icon: Settings,
      component: null,
      color: "text-slate-700 dark:text-slate-400",
      bgLight: "bg-slate-100 dark:bg-slate-800/50",
      borderLight: "border-slate-200 dark:border-slate-700/50"
    },
  ];

  useEffect(() => {
    loadUserLayout();
  }, []);

  useEffect(() => {
    if (toolName && !selectedTool) {
      const tool = tools.find(t => t.id === toolName);
      if (tool) {
        setSelectedTool(toolName);
      }
    }
  }, [toolName, selectedTool, tools]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadUserLayout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_tools_layout')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const positions = data.positions as Array<{ tool_key: string; index: number }>;
        const hidden = data.hidden as string[];

        if (positions && positions.length > 0) {
          const savedIds = positions.map(p => p.tool_key);
          const allToolIds = tools.map(t => t.id);
          const newTools = allToolIds.filter(id => !savedIds.includes(id));

          const orderedIds = [
            ...positions.sort((a, b) => a.index - b.index).map(p => p.tool_key),
            ...newTools
          ];

          setToolsOrder(orderedIds);
        } else {
          setToolsOrder(tools.map(t => t.id));
        }

        setHiddenTools(hidden || []);
      } else {
        setToolsOrder(tools.map(t => t.id));
      }
    } catch (error: any) {
      console.error('Erro ao carregar layout:', error);
      setToolsOrder(tools.map(t => t.id));
    }
  };

  const saveUserLayout = async (newOrder: string[], newHidden: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const positions = newOrder.map((tool_key, index) => ({ tool_key, index }));

      const { error } = await supabase
        .from('user_tools_layout')
        .upsert({
          user_id: user.id,
          positions,
          hidden: newHidden,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Ordem salva",
        description: "Suas preferências foram salvas com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar preferências: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id || searchTerm) return;

    const oldIndex = toolsOrder.indexOf(active.id);
    const newIndex = toolsOrder.indexOf(over.id);

    const newOrder = arrayMove(toolsOrder, oldIndex, newIndex);
    setToolsOrder(newOrder);
  };

  const toggleToolVisibility = (toolId: string) => {
    const newHidden = hiddenTools.includes(toolId)
      ? hiddenTools.filter(id => id !== toolId)
      : [...hiddenTools, toolId];

    setHiddenTools(newHidden);
  };

  const resetLayout = () => {
    const defaultOrder = tools.map(t => t.id);
    setToolsOrder(defaultOrder);
    setHiddenTools([]);
    saveUserLayout(defaultOrder, []);
  };

  const finishEditing = () => {
    setIsEditMode(false);
    saveUserLayout(toolsOrder, hiddenTools);
  };

  const handleToolSelect = (toolId: string) => {
    const externalRoutes: Record<string, string> = {
      'laboratorio-testes': '/laboratorio-testes',
      'criador-criativos': '/criador-criativos',
      'referencias': '/referencias',
      'desafio': '/gamificacao',
      'nps': '/nps',
      'arquivo-reuniao': '/arquivo-reuniao',
      'assistente': '/assistente',
      'cultura-time': '/cultura-time',
      'simulador-funil': '/ferramentas/projecoes',
      'admin-meta-ads': '/admin/meta-ads'
    };

    if (externalRoutes[toolId]) {
      navigate(externalRoutes[toolId]);
      return;
    }

    setSelectedTool(toolId);
    navigate(`/ferramentas/${toolId}`);
  };

  const handleBackToTools = () => {
    setSelectedTool(null);
    navigate('/ferramentas');
  };

  const selectedToolData = tools.find(tool => tool.id === selectedTool);

  if (selectedTool && selectedToolData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToTools}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar às Ferramentas
          </Button>
        </div>

        {!selectedToolData.hideHeader && (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 mb-8 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-${selectedToolData.color.split('-')[1]}-500/10 to-transparent rounded-full blur-3xl`} />
            <div className="flex items-start gap-4 relative z-10">
              <div className={`p-4 rounded-2xl ${selectedToolData.bgLight} ${selectedToolData.color}`}>
                <selectedToolData.icon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground/90">{selectedToolData.title}</h1>
                <p className="text-muted-foreground text-lg mt-1 max-w-2xl">
                  {selectedToolData.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedToolData.component}
      </div>
    );
  }

  // Ordenar ferramentas de acordo com a ordem salva
  const orderedTools = toolsOrder.length > 0
    ? toolsOrder
      .map(id => tools.find(t => t.id === id))
      .filter((t): t is Tool => t !== undefined)
    : tools;

  // Filtrar pela busca e pela visibilidade
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const searchFilteredTools = orderedTools.filter(t =>
    t.title.toLowerCase().includes(normalizedSearch) ||
    t.description.toLowerCase().includes(normalizedSearch)
  );

  const allVisibleTools = searchFilteredTools.filter(t => isEditMode ? true : !hiddenTools.includes(t.id));
  const activeTools = allVisibleTools.filter(t => !t.comingSoon);
  const comingSoonTools = allVisibleTools.filter(t => t.comingSoon);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Ferramentas</h1>
          <p className="text-muted-foreground text-lg mt-2">
            Central de aplicativos, recursos e utilitários para turbinar a sua produtividade diária.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ferramentas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50 border-border/60 focus-visible:ring-1"
              disabled={isEditMode}
            />
          </div>

          {isEditMode ? (
            <div className="flex w-full sm:w-auto gap-2">
              <Button variant="outline" onClick={resetLayout} className="flex-1 sm:flex-none">
                <RotateCcw className="h-4 w-4 mr-2" />
                Redefinir
              </Button>
              <Button onClick={finishEditing} className="flex-1 sm:flex-none">
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => { setIsEditMode(true); setSearchTerm(""); }} className="w-full sm:w-auto">
              <GripVertical className="h-4 w-4 mr-2" />
              Organizar
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isEditMode && hiddenTools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-muted/30 border-dashed border-2 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Ferramentas Ocultas (clique para exibir)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {hiddenTools.map(toolId => {
                    const tool = tools.find(t => t.id === toolId);
                    if (!tool) return null;
                    return (
                      <Button
                        key={toolId}
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleToolVisibility(toolId)}
                        className="gap-2 bg-background hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {tool.title}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid de Ferramentas Ativas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={activeTools.map(t => t.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {activeTools.length > 0 ? activeTools.map((tool, i) => (
              <motion.div
                key={tool.id}
                initial={isEditMode ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="relative group h-full"
              >
                <SortableToolCard
                  tool={tool}
                  onSelect={handleToolSelect}
                  isEditMode={isEditMode}
                />
                {isEditMode && (
                  <Button
                    variant="outline"
                    size="icon"
                    className={`absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-sm z-20 
                      ${hiddenTools.includes(tool.id) ? 'bg-muted text-muted-foreground' : 'bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleToolVisibility(tool.id);
                    }}
                  >
                    {hiddenTools.includes(tool.id) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                )}
              </motion.div>
            )) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma ferramenta encontrada para "{searchTerm}".</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Grid de Ferramentas Em Breve */}
      {comingSoonTools.length > 0 && !isEditMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-16 pt-8 border-t border-border/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground/80">
              Próximas Atualizações
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {comingSoonTools.map((tool) => (
              <div key={tool.id} className="h-full">
                <SortableToolCard
                  tool={tool}
                  onSelect={() => { }}
                  isEditMode={false}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
