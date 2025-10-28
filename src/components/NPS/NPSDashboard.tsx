import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NPSOverview } from "./NPSOverview";
import { NPSTabelaClientes } from "./NPSTabelaClientes";
import { NPSAlertas } from "./NPSAlertas";
import { NPSInsightsIA } from "./NPSInsightsIA";
import { NPSRankingGestores } from "./NPSRankingGestores";
import { BarChart3 } from "lucide-react";

export function NPSDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">NPS e Satisfação dos Clientes</h1>
          <p className="text-muted-foreground">Acompanhe a satisfação e feedbacks em tempo real</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="ranking">Ranking Gestores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <NPSOverview />
        </TabsContent>

        <TabsContent value="clientes">
          <NPSTabelaClientes />
        </TabsContent>

        <TabsContent value="alertas">
          <NPSAlertas />
        </TabsContent>

        <TabsContent value="insights">
          <NPSInsightsIA />
        </TabsContent>

        <TabsContent value="ranking">
          <NPSRankingGestores />
        </TabsContent>
      </Tabs>
    </div>
  );
}
