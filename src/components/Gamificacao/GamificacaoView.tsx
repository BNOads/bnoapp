import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, History, Award } from "lucide-react";
import { DesafioAtual } from "./DesafioAtual";
import { RankingView } from "./RankingView";
import { HistoricoDesafios } from "./HistoricoDesafios";
import { MinhasConquistas } from "./MinhasConquistas";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export const GamificacaoView = () => {
  const [activeTab, setActiveTab] = useState("desafio");
  const { isAdmin, isMaster } = useUserPermissions();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Gamificação
          </h1>
          <p className="text-muted-foreground mt-1">
            Participe dos desafios mensais e suba no ranking!
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="desafio" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Desafio Atual
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="conquistas" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Minhas Conquistas
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="desafio" className="mt-6">
          <DesafioAtual isAdmin={isAdmin || isMaster} />
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <RankingView />
        </TabsContent>

        <TabsContent value="conquistas" className="mt-6">
          <MinhasConquistas />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoDesafios />
        </TabsContent>
      </Tabs>
    </div>
  );
};
