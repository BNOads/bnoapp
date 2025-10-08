import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Filtros {
  responsavel: string;
  cliente: string;
  prioridade: string;
  status: string;
}

interface TarefasFiltrosProps {
  filtros: Filtros;
  onFiltrosChange: (filtros: Filtros) => void;
}

export const TarefasFiltros = ({ filtros, onFiltrosChange }: TarefasFiltrosProps) => {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    loadColaboradores();
    loadClientes();
  }, []);

  const loadColaboradores = async () => {
    const { data } = await supabase
      .from("colaboradores")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    if (data) setColaboradores(data);
  };

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    if (data) setClientes(data);
  };

  return (
    <div className="flex gap-4 flex-wrap">
      <Select
        value={filtros.responsavel}
        onValueChange={(value) => onFiltrosChange({ ...filtros, responsavel: value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {colaboradores.map((col) => (
            <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.cliente}
        onValueChange={(value) => onFiltrosChange({ ...filtros, cliente: value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="bnoapp">Tarefas do BNOapp</SelectItem>
          {clientes.map((cli) => (
            <SelectItem key={cli.id} value={cli.id}>{cli.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.prioridade}
        onValueChange={(value) => onFiltrosChange({ ...filtros, prioridade: value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas</SelectItem>
          <SelectItem value="copa_mundo">🔴 Copa do Mundo</SelectItem>
          <SelectItem value="libertadores">🟠 Libertadores</SelectItem>
          <SelectItem value="brasileirao">🔵 Brasileirão</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filtros.status}
        onValueChange={(value) => onFiltrosChange({ ...filtros, status: value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="em_andamento">Em Andamento</SelectItem>
          <SelectItem value="adiada">Adiada</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
