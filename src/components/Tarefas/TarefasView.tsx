import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, List, LayoutGrid } from "lucide-react";
import { TarefasLista } from "./TarefasLista";
import { TarefasKanban } from "./TarefasKanban";
import { TarefasFiltros } from "./TarefasFiltros";
import { NovaTarefaModal } from "./NovaTarefaModal";

export const TarefasView = () => {
  const [visualizacao, setVisualizacao] = useState<"lista" | "kanban">("lista");
  const [modalAberto, setModalAberto] = useState(false);
  const [filtros, setFiltros] = useState({
    responsavel: "",
    cliente: "",
    prioridade: "",
    status: "",
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={visualizacao === "lista" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setVisualizacao("lista")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={visualizacao === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setVisualizacao("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setModalAberto(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <TarefasFiltros filtros={filtros} onFiltrosChange={setFiltros} />

      <Tabs defaultValue="ativas" className="w-full">
        <TabsList>
          <TabsTrigger value="ativas">Ativas</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="mt-6">
          {visualizacao === "lista" ? (
            <TarefasLista tipo="ativas" filtros={filtros} />
          ) : (
            <TarefasKanban tipo="ativas" filtros={filtros} />
          )}
        </TabsContent>

        <TabsContent value="concluidas" className="mt-6">
          {visualizacao === "lista" ? (
            <TarefasLista tipo="concluidas" filtros={filtros} />
          ) : (
            <TarefasKanban tipo="concluidas" filtros={filtros} />
          )}
        </TabsContent>
      </Tabs>

      <NovaTarefaModal
        open={modalAberto}
        onOpenChange={setModalAberto}
      />
    </div>
  );
};
