import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenciasView } from "@/components/Referencias/ReferenciasView";
import DebriefingsView from "@/components/Debriefings/DebriefingsView";
import { BlocoNotasView } from "./BlocoNotasView";
import { MapaMentalView } from "./MapaMentalView";
import { CriadorFunilView } from "./CriadorFunilView";
import { OrcamentosView } from "@/components/Orcamento/OrcamentosView";
import { PautaReuniaoView } from "@/components/Reunioes/PautaReuniaoView";
import { FileText, Palette, NotebookPen, Brain, Workflow, DollarSign, BarChart3, ArrowLeft, Calendar, Link, Key, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
import LancamentosView from "@/components/Lancamentos/LancamentosView";
import { UTMBuilderView } from "./UTMBuilderView";
import { AcessosLoginsView } from "./AcessosLoginsView";


interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  component: React.ReactNode;
  color: string;
}

export const FerramentasView = () => {
  const { toolName } = useParams();
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const tools: Tool[] = [
    {
      id: "pauta-reuniao",
      title: "Pauta de Reunião",
      description: "Organize pautas e atas de reuniões por data com navegação por títulos",
      icon: Calendar,
      component: <PautaReuniaoView />,
      color: "text-indigo-600"
    },
    {
      id: "referencias",
      title: "Referências",
      description: "Gerencie documentos multimídia para referência da equipe criativa",
      icon: Palette,
      component: <ReferenciasView />,
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
      id: "mapa-mental",
      title: "Mapa Mental",
      description: "Organize suas ideias visualmente com mapas mentais interativos",
      icon: Brain,
      component: <MapaMentalView />,
      color: "text-orange-600"
    },
    {
      id: "criador-funil",
      title: "Criador de Funil",
      description: "Projete e visualize funis de marketing completos",
      icon: Workflow,
      component: <CriadorFunilView />,
      color: "text-red-600"
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
  ];

  // Handle URL parameter for direct tool access
  useEffect(() => {
    if (toolName && !selectedTool) {
      const tool = tools.find(t => t.id === toolName);
      if (tool) {
        setSelectedTool(toolName);
      }
    }
  }, [toolName, selectedTool, tools]);

  const handleToolSelect = (toolId: string) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ferramentas</h1>
        <p className="text-muted-foreground">
          Centro de ferramentas para produtividade e criação
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card 
              key={tool.id} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
              onClick={() => handleToolSelect(tool.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
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
        })}
      </div>
    </div>
  );
};