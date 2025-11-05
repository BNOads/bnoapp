import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClienteStatus {
  id: string;
  nome: string;
  google_sheet_id: string | null;
  google_sheet_aba: string | null;
  google_sheet_ultima_sync: string | null;
  google_sheet_sync_status: string;
  google_sheet_erro: string | null;
}

export const GoogleSheetsAdmin = () => {
  const [clientes, setClientes] = useState<ClienteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, google_sheet_id, google_sheet_aba, google_sheet_ultima_sync, google_sheet_sync_status, google_sheet_erro')
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  const syncCliente = async (clienteId: string) => {
    setSyncing(clienteId);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-cliente', {
        body: { cliente_id: clienteId, refresh: true }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Sincronização concluída com sucesso!');
        loadClientes();
      } else {
        throw new Error(data.error || 'Erro na sincronização');
      }
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      toast.error(error.message || 'Erro ao sincronizar planilha');
    } finally {
      setSyncing(null);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Sucesso</Badge>;
      case 'erro':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'em_andamento':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1 animate-spin" />Sincronizando</Badge>;
      default:
        return <Badge variant="outline">Nunca sincronizado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Integrações Google Sheets - Status</CardTitle>
          <Button onClick={loadClientes} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Planilha</TableHead>
              <TableHead>Última Sincronização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erros</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="font-medium">{cliente.nome}</TableCell>
                <TableCell>
                  {cliente.google_sheet_id ? (
                    <div className="text-sm">
                      <div className="font-mono text-xs">{cliente.google_sheet_id.substring(0, 15)}...</div>
                      <div className="text-muted-foreground">Aba: {cliente.google_sheet_aba || 'Dashboard'}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {cliente.google_sheet_ultima_sync ? (
                    new Date(cliente.google_sheet_ultima_sync).toLocaleString('pt-BR')
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(cliente.google_sheet_sync_status)}
                </TableCell>
                <TableCell>
                  {cliente.google_sheet_erro ? (
                    <div className="text-sm text-destructive max-w-xs truncate" title={cliente.google_sheet_erro}>
                      {cliente.google_sheet_erro}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {cliente.google_sheet_id && (
                    <Button
                      onClick={() => syncCliente(cliente.id)}
                      disabled={syncing === cliente.id || !cliente.google_sheet_id}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing === cliente.id ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {clientes.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
};
