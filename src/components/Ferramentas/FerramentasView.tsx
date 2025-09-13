import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferenciasView } from "@/components/Referencias/ReferenciasView";
import DebriefingsView from "@/components/Debriefings/DebriefingsView";
import { BlocoNotasView } from "./BlocoNotasView";
import { MapaMentalView } from "./MapaMentalView";
import { CriadorFunilView } from "./CriadorFunilView";
import { FileText, Palette, NotebookPen, Brain, Workflow } from "lucide-react";

export const FerramentasView = () => {
  const [activeTab, setActiveTab] = useState("referencias");

  const tabs = [
    {
      id: "referencias",
      label: "Referências",
      icon: Palette,
      component: <ReferenciasView />
    },
    {
      id: "debriefings", 
      label: "Debriefings",
      icon: FileText,
      component: <DebriefingsView />
    },
    {
      id: "notas",
      label: "Bloco de Notas",
      icon: NotebookPen,
      component: <BlocoNotasView />
    },
    {
      id: "mapa-mental",
      label: "Mapa Mental",
      icon: Brain,
      component: <MapaMentalView />
    },
    {
      id: "criador-funil",
      label: "Criador de Funil",
      icon: Workflow,
      component: <CriadorFunilView />
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ferramentas</h1>
        <p className="text-muted-foreground">
          Centro de ferramentas para produtividade e criação
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-6">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};