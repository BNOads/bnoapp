import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DebriefingsView from "@/components/Debriefings/DebriefingsView";
import { BlocoNotasView } from "./BlocoNotasView";
import { OrcamentosView } from "@/components/Orcamento/OrcamentosView";
import { FileText, Palette, NotebookPen, DollarSign, BarChart3, ArrowLeft, Calendar, Link, Key, CheckCircle, MessageSquare, GripVertical, Eye, EyeOff, RotateCcw, Trophy, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
import LancamentosView from "@/components/Lancamentos/LancamentosView";
import { UTMBuilderView } from "./UTMBuilderView";
import { AcessosLoginsView } from "./AcessosLoginsView";
import { MensagensSemanaisView } from "./MensagensSemanaisView";
import { LinksView } from "./LinksView";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  component: React.ReactNode;
  color: string;
}

// Componente de card draggable
const SortableToolCard = ({ tool, onSelect, isEditMode }: { tool: Tool; onSelect: (id: string) => void; isEditMode: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tool.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = tool.icon;

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 group ${!isEditMode && 'hover:scale-[1.02]'}`}
      onClick={() => !isEditMode && onSelect(tool.id)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          {isEditMode && (
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
            <Icon className={`h-6 w-6 ${tool.color}`} />
          </div>
        </div>
        <CardTitle className="text-xl">{tool.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">
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
  const { toast } = useToast();

  const tools: Tool[] = [
    {
      id: "criador-criativos",
      title: "Criador de Criativos",
      description: "Gere variações de criativos automaticamente com IA",
      icon: Palette,
      component: null,
      color: "text-purple-600"
    },
    {
      id: "arquivo-reuniao",
      title: "Arquivo de Reunião",
      description: "Arquivo anual de reuniões com índice de navegação e busca inteligente",
      icon: BookOpen,
      component: null, // Redirecionamento para /arquivo-reuniao
      color: "text-teal-600"
    },
    {
      id: "referencias",
      title: "Referências",
      description: "Gerencie documentos multimídia para referência da equipe criativa",
      icon: Palette,
      component: null, // Redirecionamento para /referencias
      color: "text-purple-600"
    },
    {
      id: "debriefings", 
      title: "Debriefings",
      description: "Crie e analise relatórios detalhados de campanhas e resultados",
      icon: FileText,
      component: <DebriefingsView />,
      color: "text-blue-600"
    },
    {
      id: "notas",
      title: "Bloco de Notas",
      description: "Suas anotações pessoais e lembretes organizados em um só lugar",
      icon: NotebookPen,
      component: <BlocoNotasView />,
      color: "text-green-600"
    },
    {
      id: "orcamentos-funil",
      title: "Orçamentos por Funil",
      description: "Gerencie orçamentos de marketing organizados por funil",
      icon: DollarSign,
      component: <OrcamentosView />,
      color: "text-emerald-600"
    },
    {
      id: "lancamentos",
      title: "Gestão de Lançamentos",
      description: "Gerencie e acompanhe todos os lançamentos e campanhas",
      icon: BarChart3,
      component: <LancamentosView />,
      color: "text-blue-500"
    },
    {
      id: "utm-builder",
      title: "Criador de UTM",
      description: "Gere URLs com parâmetros UTM padronizados individual ou em massa",
      icon: Link,
      component: <UTMBuilderView />,
      color: "text-cyan-600"
    },
    {
      id: "acessos-logins",
      title: "Acessos & Logins",
      description: "Gerencie credenciais e acessos da equipe de forma segura",
      icon: Key,
      component: <AcessosLoginsView />,
      color: "text-red-600"
    },
    {
      id: "mensagens-semanais",
      title: "Mensagens Semanais",
      description: "Gerencie mensagens semanais dos clientes e controle de envio",
      icon: MessageSquare,
      component: <MensagensSemanaisView />,
      color: "text-indigo-600"
    },
    {
      id: "links",
      title: "Links Importantes",
      description: "Central de links importantes organizados por cliente",
      icon: Link,
      component: <LinksView />,
      color: "text-emerald-600"
    },
    {
      id: "nps",
      title: "NPS & Satisfação",
      description: "Acompanhe e gerencie a satisfação dos clientes com NPS",
      icon: BarChart3,
      component: null, // Redirecionamento para /nps
      color: "text-pink-600"
    },
    {
      id: "desafio",
      title: "Desafio",
      description: "Participe dos desafios mensais e acompanhe o ranking",
      icon: Trophy,
      component: null, // Redirecionamento para /gamificacao
      color: "text-yellow-600"
    },
  ];

  // Carregar preferências do usuário
  useEffect(() => {
    loadUserLayout();
  }, []);

  // Handle URL parameter for direct tool access
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
          // Pegar IDs salvos
          const savedIds = positions.map(p => p.tool_key);
          
          // Adicionar novos cards que não estavam salvos (como "desafio")
          const allToolIds = tools.map(t => t.id);
          const newTools = allToolIds.filter(id => !savedIds.includes(id));
          
          // Criar ordem completa: salvos primeiro, depois novos
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
    
    if (!over || active.id === over.id) return;

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
    // Redirecionar para /criador-criativos
    if (toolId === 'criador-criativos') {
      navigate('/criador-criativos');
      return;
    }
    // Redirecionar para /referencias ao invés de usar ferramenta inline
    if (toolId === 'referencias') {
      navigate('/referencias');
      return;
    }
    // Redirecionar para /gamificacao
    if (toolId === 'desafio') {
      navigate('/gamificacao');
      return;
    }
    // Redirecionar para /nps
    if (toolId === 'nps') {
      navigate('/nps');
      return;
    }
    // Redirecionar para /arquivo-reuniao
    if (toolId === 'arquivo-reuniao') {
      navigate('/arquivo-reuniao');
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
            variant="outline" 
            size="sm" 
            onClick={handleBackToTools}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar às Ferramentas
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <selectedToolData.icon className={`h-8 w-8 ${selectedToolData.color}`} />
              {selectedToolData.title}
            </h1>
            <p className="text-muted-foreground">
              {selectedToolData.description}
            </p>
          </div>
        </div>
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

  // Filtrar ferramentas ocultas
  const visibleTools = orderedTools.filter(t => !hiddenTools.includes(t.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ferramentas</h1>
          <p className="text-muted-foreground">
            Centro de ferramentas para produtividade e criação
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" size="sm" onClick={resetLayout}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Redefinir
              </Button>
              <Button size="sm" onClick={finishEditing}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
              <GripVertical className="h-4 w-4 mr-2" />
              Organizar
            </Button>
          )}
        </div>
      </div>

      {isEditMode && hiddenTools.length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Ferramentas Ocultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hiddenTools.map(toolId => {
                const tool = tools.find(t => t.id === toolId);
                if (!tool) return null;
                return (
                  <Button
                    key={toolId}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleToolVisibility(toolId)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {tool.title}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleTools.map(t => t.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTools.map((tool) => (
              <div key={tool.id} className="relative group">
                <SortableToolCard 
                  tool={tool} 
                  onSelect={handleToolSelect}
                  isEditMode={isEditMode}
                />
                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleToolVisibility(tool.id);
                    }}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};