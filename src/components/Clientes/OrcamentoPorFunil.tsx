import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Calendar, History, Download, Plus, Edit2, Eye, Trash2, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useSearch } from "@/hooks/useSearch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
interface OrcamentoFunil {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  data_atualizacao: string;
  observacoes: string;
  created_by: string;
}
interface HistoricoOrcamento {
  id: string;
  valor_anterior: number;
  valor_novo: number;
  motivo_alteracao: string;
  data_alteracao: string;
  alterado_por: string;
}
interface OrcamentoPorFunilProps {
  clienteId: string;
  isPublicView?: boolean;
}
export const OrcamentoPorFunil = ({
  clienteId,
  isPublicView = false
}: OrcamentoPorFunilProps) => {
  const [orcamentos, setOrcamentos] = useState<OrcamentoFunil[]>([]);
  const [historico, setHistorico] = useState<HistoricoOrcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<OrcamentoFunil | null>(null);
  const [selectedFunil, setSelectedFunil] = useState<string>("todos");
  const [formData, setFormData] = useState({
    nome_funil: "",
    valor_investimento: "",
    observacoes: ""
  });
  const {
    toast
  } = useToast();
  const {
    isAdmin
  } = useUserPermissions();

  // Hook de pesquisa
  const {
    searchTerm,
    setSearchTerm,
    filteredItems
  } = useSearch(orcamentos, ['nome_funil', 'observacoes']);

  // Filtro por funil
  const orcamentosFiltrados = filteredItems.filter(orcamento => selectedFunil === "todos" || orcamento.nome_funil === selectedFunil);

  // Lista única de funis para o filtro
  const funisUnicos = Array.from(new Set(orcamentos.map(o => o.nome_funil))).sort();
  useEffect(() => {
    carregarOrcamentos();
  }, [clienteId]);
  const carregarOrcamentos = async () => {
    try {
      let clientInstance = supabase;
      
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }
      
      const {
        data,
        error
      } = await clientInstance.from('orcamentos_funil').select('*').eq('cliente_id', clienteId).eq('ativo', true).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar orçamentos: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const carregarHistorico = async (orcamentoId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('historico_orcamentos').select('*').eq('orcamento_id', orcamentoId).order('data_alteracao', {
        ascending: false
      });
      if (error) throw error;
      setHistorico(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico: " + error.message,
        variant: "destructive"
      });
    }
  };
  const salvarOrcamento = async () => {
    try {
      const valor = parseFloat(formData.valor_investimento);
      if (isNaN(valor)) {
        toast({
          title: "Erro",
          description: "Valor do investimento deve ser um número válido",
          variant: "destructive"
        });
        return;
      }
      if (selectedOrcamento) {
        // Editar existente
        const {
          error
        } = await supabase.from('orcamentos_funil').update({
          nome_funil: formData.nome_funil,
          valor_investimento: valor,
          observacoes: formData.observacoes,
          data_atualizacao: new Date().toISOString()
        }).eq('id', selectedOrcamento.id);
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Orçamento atualizado com sucesso!"
        });
        setShowEditarModal(false);
      } else {
        // Criar novo
        const {
          error
        } = await supabase.from('orcamentos_funil').insert({
          cliente_id: clienteId,
          nome_funil: formData.nome_funil,
          valor_investimento: valor,
          observacoes: formData.observacoes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Orçamento criado com sucesso!"
        });
        setShowNovoModal(false);
      }
      setFormData({
        nome_funil: "",
        valor_investimento: "",
        observacoes: ""
      });
      setSelectedOrcamento(null);
      carregarOrcamentos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar orçamento: " + error.message,
        variant: "destructive"
      });
    }
  };
  const abrirEdicao = (orcamento: OrcamentoFunil) => {
    setSelectedOrcamento(orcamento);
    setFormData({
      nome_funil: orcamento.nome_funil,
      valor_investimento: orcamento.valor_investimento.toString(),
      observacoes: orcamento.observacoes || ""
    });
    setShowEditarModal(true);
  };
  const abrirHistorico = (orcamento: OrcamentoFunil) => {
    setSelectedOrcamento(orcamento);
    carregarHistorico(orcamento.id);
    setShowHistoricoModal(true);
  };
  const exportarCSV = () => {
    const headers = ["Funil", "Valor", "Data de Atualização", "Observações"];
    const rows = orcamentos.map(o => [o.nome_funil, `R$ ${o.valor_investimento.toFixed(2)}`, format(new Date(o.data_atualizacao), "dd/MM/yyyy", {
      locale: ptBR
    }), o.observacoes || ""]);
    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orcamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
  const excluirOrcamento = async (orcamento: OrcamentoFunil) => {
    try {
      const {
        error
      } = await supabase.from('orcamentos_funil').update({
        ativo: false
      }).eq('id', orcamento.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso!"
      });
      carregarOrcamentos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao excluir orçamento: " + error.message,
        variant: "destructive"
      });
    }
  };
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };
  if (loading) {
    return <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6 mx-0 my-0 py-0 px-0">
      {/* Header Responsivo */}
      <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:justify-between lg:items-start">
        <div className="min-w-0 flex-1">
          
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Visualize o investimento de cada funil e seu histórico
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 w-full lg:w-auto lg:flex-shrink-0">
          <Button variant="outline" onClick={exportarCSV} disabled={orcamentos.length === 0} size="sm" className="flex-1 lg:flex-none text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="truncate">Exportar CSV</span>
          </Button>
          {isAdmin && <Button onClick={() => setShowNovoModal(true)} size="sm" className="flex-1 lg:flex-none text-xs sm:text-sm">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="truncate">Novo Orçamento</span>
            </Button>}
        </div>
      </div>

      {/* Filtros de Pesquisa */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por nome do funil ou observações..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2 sm:min-w-[200px]">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedFunil} onValueChange={setSelectedFunil}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por funil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os funis</SelectItem>
              {funisUnicos.map(funil => <SelectItem key={funil} value={funil}>
                  {funil}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Orçamentos - Mobile First Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {orcamentosFiltrados.map(orcamento => <Card key={orcamento.id} className="relative w-full">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 leading-tight pr-2">
                  {orcamento.nome_funil}
                </CardTitle>
                <div className="flex gap-1 flex-shrink-0 self-end sm:self-start">
                  <Button variant="ghost" size="sm" onClick={() => abrirHistorico(orcamento)} className="h-7 w-7 p-0 sm:h-8 sm:w-8">
                    <History className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  {isAdmin && <>
                      <Button variant="ghost" size="sm" onClick={() => abrirEdicao(orcamento)} className="h-7 w-7 p-0 sm:h-8 sm:w-8">
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => excluirOrcamento(orcamento)} className="text-destructive hover:text-destructive h-7 w-7 p-0 sm:h-8 sm:w-8">
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary break-all">
                  {formatarMoeda(orcamento.valor_investimento)}
                </div>
                
                <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-tight">
                    Atualizado em {format(new Date(orcamento.data_atualizacao), "dd/MM/yyyy", {
                  locale: ptBR
                })}
                  </span>
                </div>
                
                {orcamento.observacoes && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {orcamento.observacoes}
                  </p>}
              </div>
            </CardContent>
          </Card>)}
      </div>

      {orcamentos.length === 0 && <Card>
          <CardContent className="py-8 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum orçamento cadastrado</h3>
            <p className="text-muted-foreground">
              {isAdmin ? "Clique em 'Novo Orçamento' para adicionar o primeiro." : "Os orçamentos serão exibidos aqui quando cadastrados."}
            </p>
          </CardContent>
        </Card>}

      {orcamentos.length > 0 && orcamentosFiltrados.length === 0 && <Card>
          <CardContent className="py-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de pesquisa ou remover alguns termos.
            </p>
          </CardContent>
        </Card>}

      {/* Modal Novo Orçamento */}
      <Dialog open={showNovoModal} onOpenChange={setShowNovoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome_funil">Nome do Funil</Label>
              <Input id="nome_funil" value={formData.nome_funil} onChange={e => setFormData({
              ...formData,
              nome_funil: e.target.value
            })} placeholder="Ex: Facebook Ads" />
            </div>
            <div>
              <Label htmlFor="valor_investimento">Valor do Investimento (R$)</Label>
              <Input id="valor_investimento" type="number" step="0.01" value={formData.valor_investimento} onChange={e => setFormData({
              ...formData,
              valor_investimento: e.target.value
            })} placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={e => setFormData({
              ...formData,
              observacoes: e.target.value
            })} placeholder="Informações adicionais sobre o orçamento..." rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNovoModal(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarOrcamento}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Orçamento */}
      <Dialog open={showEditarModal} onOpenChange={setShowEditarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_nome_funil">Nome do Funil</Label>
              <Input id="edit_nome_funil" value={formData.nome_funil} onChange={e => setFormData({
              ...formData,
              nome_funil: e.target.value
            })} />
            </div>
            <div>
              <Label htmlFor="edit_valor_investimento">Valor do Investimento (R$)</Label>
              <Input id="edit_valor_investimento" type="number" step="0.01" value={formData.valor_investimento} onChange={e => setFormData({
              ...formData,
              valor_investimento: e.target.value
            })} />
            </div>
            <div>
              <Label htmlFor="edit_observacoes">Observações</Label>
              <Textarea id="edit_observacoes" value={formData.observacoes} onChange={e => setFormData({
              ...formData,
              observacoes: e.target.value
            })} rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditarModal(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarOrcamento}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Histórico */}
      <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Histórico de Alterações - {selectedOrcamento?.nome_funil}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {historico.length > 0 ? <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor Anterior</TableHead>
                    <TableHead>Valor Novo</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map(item => <TableRow key={item.id}>
                      <TableCell>
                        {format(new Date(item.data_alteracao), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  })}
                      </TableCell>
                      <TableCell>
                        {item.valor_anterior ? formatarMoeda(item.valor_anterior) : '-'}
                      </TableCell>
                      <TableCell>
                        {formatarMoeda(item.valor_novo)}
                      </TableCell>
                      <TableCell>
                        {item.motivo_alteracao}
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table> : <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum histórico de alterações encontrado</p>
              </div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};