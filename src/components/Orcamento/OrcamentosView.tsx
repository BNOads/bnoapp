import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { NovoOrcamentoModal } from "./NovoOrcamentoModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Orcamento {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  ativo: boolean;
  cliente: {
    id: string;
    nome: string;
  };
}

export const OrcamentosView = () => {
  const { isAdmin, canCreateContent } = useUserPermissions();
  const { toast } = useToast();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null
  });

  useEffect(() => {
    loadOrcamentos();
  }, []);

  const loadOrcamentos = async () => {
    try {
      setLoading(true);
      
      // Primeiro, buscar os orçamentos
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos_funil')
        .select('id, nome_funil, valor_investimento, observacoes, created_at, updated_at, ativo, cliente_id')
        .eq('ativo', true)
        .order('updated_at', { ascending: false });

      if (orcamentosError) {
        console.error('Erro ao carregar orçamentos:', orcamentosError);
        toast({
          title: "Erro",
          description: "Erro ao carregar orçamentos",
          variant: "destructive",
        });
        return;
      }

      // Depois, buscar os dados dos clientes
      const clientesIds = [...new Set(orcamentosData?.map(o => o.cliente_id) || [])];
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', clientesIds);

      if (clientesError) {
        console.error('Erro ao carregar clientes:', clientesError);
        toast({
          title: "Erro",
          description: "Erro ao carregar clientes",
          variant: "destructive",
        });
        return;
      }

      // Combinar os dados
      const clientesMap = new Map(clientesData?.map(c => [c.id, c]) || []);
      const orcamentosFormatados = orcamentosData?.map(orcamento => {
        const cliente = clientesMap.get(orcamento.cliente_id);
        return {
          id: orcamento.id,
          nome_funil: orcamento.nome_funil,
          valor_investimento: orcamento.valor_investimento,
          observacoes: orcamento.observacoes,
          created_at: orcamento.created_at,
          updated_at: orcamento.updated_at,
          ativo: orcamento.ativo,
          cliente: {
            id: cliente?.id || '',
            nome: cliente?.nome || 'Cliente não encontrado'
          }
        };
      }) || [];

      setOrcamentos(orcamentosFormatados);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar orçamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orcamentos_funil')
        .update({ ativo: false })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar orçamento:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar orçamento",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Orçamento removido com sucesso",
      });

      setDeleteDialog({ open: false, id: null });
      loadOrcamentos();
    } catch (error) {
      console.error('Erro ao deletar orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao deletar orçamento",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalInvestimento = orcamentos.reduce((sum, orc) => sum + orc.valor_investimento, 0);
  const totalClientes = new Set(orcamentos.map(orc => orc.cliente.id)).size;
  const totalFunis = orcamentos.length;

  if (loading) {
    return <div className="flex justify-center p-8">Carregando orçamentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos por Funil</h1>
          <p className="text-muted-foreground">
            Gerencie os investimentos por funil de cada cliente
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Orçamento
          </Button>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestimento)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total dos orçamentos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              Clientes com orçamento ativo
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

      {/* Tabela de Orçamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Orçamentos Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {orcamentos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum orçamento cadastrado</p>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro orçamento
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentos.map((orcamento) => (
                  <TableRow key={orcamento.id}>
                    <TableCell className="font-medium">
                      {orcamento.cliente.nome}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{orcamento.nome_funil}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(orcamento.valor_investimento)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(orcamento.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(orcamento.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, id: orcamento.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Novo Orçamento */}
      <NovoOrcamentoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadOrcamentos}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este orçamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && handleDelete(deleteDialog.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};