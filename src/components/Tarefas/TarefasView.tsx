import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TarefasLista } from "./TarefasLista";
import { TarefasFiltros } from "./TarefasFiltros";
import { NovaTarefaModal } from "./NovaTarefaModal";

export const TarefasView = () => {
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
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <TarefasFiltros filtros={filtros} onFiltrosChange={setFiltros} />

      <Tabs defaultValue="ativas" className="w-full">
        <TabsList>
          <TabsTrigger value="ativas">Ativas</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="mt-6">
          <TarefasLista tipo="ativas" filtros={filtros} />
        </TabsContent>

        <TabsContent value="concluidas" className="mt-6">
          <TarefasLista tipo="concluidas" filtros={filtros} />
        </TabsContent>
      </Tabs>

      <NovaTarefaModal
        open={modalAberto}
        onOpenChange={setModalAberto}
      />
    </div>
  );
};
