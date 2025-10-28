import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function NPSTabelaClientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      const { data } = await supabase
        .from('nps_stats_por_cliente' as any)
        .select('*')
        .order('alertas_pendentes', { ascending: false });

      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Última Nota</TableHead>
            <TableHead>Semanal</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Última Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente) => (
            <TableRow key={cliente.cliente_id}>
              <TableCell className="font-medium">{cliente.cliente_nome}</TableCell>
              <TableCell>{cliente.nps_medio?.toFixed(1) || '-'}</TableCell>
              <TableCell>{'⭐'.repeat(Math.round(cliente.satisfacao_semanal_media || 0))}</TableCell>
              <TableCell>
                {cliente.alertas_pendentes > 0 ? (
                  <Badge variant="destructive">🚨 Ação urgente</Badge>
                ) : (
                  <Badge variant="default">OK ✅</Badge>
                )}
              </TableCell>
              <TableCell>{cliente.gestor_nome || cliente.cs_nome || '-'}</TableCell>
              <TableCell>{cliente.ultima_resposta ? new Date(cliente.ultima_resposta).toLocaleDateString() : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
