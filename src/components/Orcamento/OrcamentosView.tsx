import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, Trash2, TrendingUp, Users, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { NovoOrcamentoModal } from './NovoOrcamentoModal';

interface Orcamento {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  observacoes?: string;
  created_at: string;
  cliente_id: string;
  cliente_nome?: string;
}

export const OrcamentosView = () => {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orcamentoToDelete, setOrcamentoToDelete] = useState<string | null>(null);

  const { toast } = useToast();
  const { canManageBudgets } = useUserPermissions();

  useEffect(() => {
    loadOrcamentos();
  }, []);

  const loadOrcamentos = async () => {
    try {
      setLoading(true);
      
      // Buscar orçamentos com dados do cliente
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos_funil')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (orcamentosError) throw orcamentosError;

      // Buscar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true);

      if (clientesError) throw clientesError;

      // Combinar dados
      const orcamentosComCliente = orcamentosData?.map(orcamento => {
        const cliente = clientesData?.find(c => c.id === orcamento.cliente_id);
        return {
          ...orcamento,
          cliente_nome: cliente?.nome || 'Cliente não encontrado'
        };
      }) || [];

      setOrcamentos(orcamentosComCliente);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar orçamentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!orcamentoToDelete) return;

    try {
      const { error } = await supabase
        .from('orcamentos_funil')
        .update({ ativo: false })
        .eq('id', orcamentoToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso"
      });

      loadOrcamentos();
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir orçamento",
        variant: "destructive"
      });
    } finally {
      setDeleteModalOpen(false);
      setOrcamentoToDelete(null);
    }
  };

  const filteredOrcamentos = orcamentos.filter(orcamento => {
    const matchesSearch = 
      orcamento.nome_funil.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orcamento.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orcamento.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCliente = clienteFiltro === 'all' || orcamento.cliente_id === clienteFiltro;
    
    return matchesSearch && matchesCliente;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular totais
  const totalInvestimento = filteredOrcamentos.reduce((sum, o) => sum + o.valor_investimento, 0);
  const totalClientes = new Set(filteredOrcamentos.map(o => o.cliente_id)).size;
  const totalFunis = filteredOrcamentos.length;

  const uniqueClientesMap = new Map<string, string>();
  orcamentos.forEach((o) => {
    if (o.cliente_id && o.cliente_nome) uniqueClientesMap.set(o.cliente_id, o.cliente_nome);
  });
  const uniqueClientes = Array.from(uniqueClientesMap, ([id, nome]) => ({ id, nome }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando orçamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Orçamentos por Funil</h1>
          <p className="text-muted-foreground">
            Gerencie orçamentos de marketing organizados por funil
          </p>
        </div>
        
        {canManageBudgets && (
          <Button onClick={() => setModalNovo(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Orçamento
          </Button>
        )}
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestimento)}</div>
            <p className="text-xs text-muted-foreground">
              Soma de todos os orçamentos ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              Clientes com orçamentos configurados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funis Configurados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFunis}</div>
            <p className="text-xs text-muted-foreground">
              Total de funis com orçamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por funil, cliente ou observações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {uniqueClientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de orçamentos */}
      {filteredOrcamentos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm || (clienteFiltro !== 'all') ? 'Nenhum orçamento encontrado para os filtros selecionados.' : 'Nenhum orçamento cadastrado ainda.'}
              </p>
              {canManageBudgets && !searchTerm && (clienteFiltro === 'all') && (
                <Button onClick={() => setModalNovo(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Orçamento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data Criação</TableHead>
                  {canManageBudgets && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrcamentos.map((orcamento) => (
                  <TableRow key={orcamento.id}>
                    <TableCell className="font-medium">
                      {orcamento.cliente_nome}
                    </TableCell>
                    <TableCell>{orcamento.nome_funil}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatCurrency(orcamento.valor_investimento)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(orcamento.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {canManageBudgets && (
                      <TableCell>
                        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrcamentoToDelete(orcamento.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NovoOrcamentoModal
        open={modalNovo}
        onOpenChange={setModalNovo}
        onSuccess={loadOrcamentos}
      />
    </div>
  );
};