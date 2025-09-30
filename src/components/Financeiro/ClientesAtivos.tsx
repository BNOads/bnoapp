import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Search, TrendingUp, TrendingDown } from 'lucide-react';

export const ClientesAtivos = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      const { data } = await supabase
        .from('financeiro_clientes_ativos')
        .select(`
          *,
          clientes (
            nome,
            categoria,
            primary_gestor_user_id
          )
        `)
        .order('mrr', { ascending: false });

      if (data) {
        setClientes(data);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.clientes?.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Resumo de Clientes Ativos</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">MRR (R$)</TableHead>
                <TableHead className="text-right">Tempo Ativo</TableHead>
                <TableHead className="text-right">LTV (R$)</TableHead>
                <TableHead>Variação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">
                    {cliente.clientes?.nome || 'Cliente não identificado'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatarMoeda(Number(cliente.mrr) || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {cliente.tempo_ativo_meses} {cliente.tempo_ativo_meses === 1 ? 'mês' : 'meses'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatarMoeda(Number(cliente.ltv) || 0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Estável</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {clientesFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
