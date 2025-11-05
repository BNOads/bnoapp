import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteStatus | null>(null);
  const [formData, setFormData] = useState({ google_sheet_id: '', google_sheet_aba: 'Dashboard' });

  const loadClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, google_sheet_id, google_sheet_aba, google_sheet_ultima_sync, google_sheet_sync_status, google_sheet_erro')
        .eq('ativo', true)
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

  const openEditModal = (cliente: ClienteStatus) => {
    setEditingCliente(cliente);
    setFormData({
      google_sheet_id: cliente.google_sheet_id || '',
      google_sheet_aba: cliente.google_sheet_aba || 'Dashboard'
    });
    setEditModalOpen(true);
  };

  const extractSheetId = (input: string): string => {
    // Se já for um ID (não contém /), retorna direto
    if (!input.includes('/')) {
      return input.trim();
    }

    // Extrai ID do link: https://docs.google.com/spreadsheets/d/{ID}/edit
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  const handleSheetInputChange = (value: string) => {
    const extractedId = extractSheetId(value);
    setFormData({ ...formData, google_sheet_id: extractedId });
  };

  const handleSaveConfig = async () => {
    if (!editingCliente) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          google_sheet_id: formData.google_sheet_id || null,
          google_sheet_aba: formData.google_sheet_aba || 'Dashboard'
        })
        .eq('id', editingCliente.id);

      if (error) throw error;

      toast.success('Configuração salva com sucesso!');
      setEditModalOpen(false);
      loadClientes();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
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
      // Atualiza a lista para refletir status de erro ou reverter "em_andamento"
      loadClientes();
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
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => openEditModal(cliente)}
                      size="sm"
                      variant="outline"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    {cliente.google_sheet_id && (
                      <Button
                        onClick={() => syncCliente(cliente.id)}
                        disabled={syncing === cliente.id}
                        size="sm"
                        variant="outline"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncing === cliente.id ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                  </div>
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

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Google Sheets - {editingCliente?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-id">Link ou ID da Planilha</Label>
              <Input
                id="sheet-id"
                value={formData.google_sheet_id}
                onChange={(e) => handleSheetInputChange(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1AbCdEfG... ou 1AbCdEfG..."
              />
              <p className="text-xs text-muted-foreground">
                Cole o link completo da planilha ou apenas o ID (extraído automaticamente)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-aba">Nome da Aba</Label>
              <Input
                id="sheet-aba"
                value={formData.google_sheet_aba}
                onChange={(e) => setFormData({ ...formData, google_sheet_aba: e.target.value })}
                placeholder="Dashboard"
              />
              <p className="text-xs text-muted-foreground">
                Nome da aba/sheet que contém os dados
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
