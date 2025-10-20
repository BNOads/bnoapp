import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, History, Award, FileCheck } from "lucide-react";
import { DesafioAtual } from "./DesafioAtual";
import { RankingView } from "./RankingView";
import { HistoricoDesafios } from "./HistoricoDesafios";
import { MinhasConquistas } from "./MinhasConquistas";
import { ComprovacoesView } from "./ComprovacoesView";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export const GamificacaoView = () => {
  const [activeTab, setActiveTab] = useState("ranking");
  const [refreshKey, setRefreshKey] = useState(0);
  const { isAdmin, isMaster } = useUserPermissions();

  const handlePontosAtualizados = () => {
    // Forçar atualização do ranking
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Desafio
          </h1>
          <p className="text-muted-foreground mt-1">
            Participe dos desafios mensais e suba no ranking!
          </p>
        </div>
      </div>

      <DesafioAtual isAdmin={isAdmin || isMaster} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isAdmin || isMaster ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
          {(isAdmin || isMaster) && (
            <TabsTrigger value="comprovacoes" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Comprovações
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ranking" className="mt-6">
          <RankingView key={refreshKey} />
        </TabsContent>

        <TabsContent value="conquistas" className="mt-6">
          <MinhasConquistas />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoDesafios />
        </TabsContent>

        {(isAdmin || isMaster) && (
          <TabsContent value="comprovacoes" className="mt-6">
            <ComprovacoesView onPontosAtualizados={handlePontosAtualizados} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
