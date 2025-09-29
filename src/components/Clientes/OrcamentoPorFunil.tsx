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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign, Calendar, History, Download, Plus, Edit2, Eye, Trash2, Search, Filter, Users, TrendingUp, Power } from "lucide-react";
import { OrcamentoStatusToggle } from "./OrcamentoStatusToggle";
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
  active: boolean;
}
interface HistoricoOrcamento {
  id: string;
  valor_anterior: number;
  valor_novo: number;
  motivo_alteracao: string;
  data_alteracao: string;
  alterado_por: string;
}
interface GestorOrcamento {
  gestor_nome: string;
  gestor_avatar?: string;
  gestor_user_id: string;
  total_clientes: number;
  total_orcamentos: number;
  total_investimento: number;
  funis: Array<{
    nome_funil: string;
    valor_investimento: number;
    cliente_nome: string;
  }>;
}
interface OrcamentoPorFunilProps {
  clienteId: string;
  isPublicView?: boolean;
  showGestorValues?: boolean;
}
export const OrcamentoPorFunil = ({
  clienteId,
  isPublicView = false,
  showGestorValues = true
}: OrcamentoPorFunilProps) => {
  const [orcamentos, setOrcamentos] = useState<OrcamentoFunil[]>([]);
  const [gestoresOrcamentos, setGestoresOrcamentos] = useState<GestorOrcamento[]>([]);
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
    isAdmin,
    canManageBudgets
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
    console.log('🚀 Iniciando carregamento - clienteId:', clienteId);
    carregarOrcamentos();
    if (showGestorValues) {
      carregarOrcamentosGestores();
    }
  }, [clienteId, showGestorValues]);
  const carregarOrcamentos = async () => {
    try {
      let clientInstance = supabase;
      if (isPublicView) {
        const {
          createPublicSupabaseClient
        } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }
      const {
        data,
        error
      } = await clientInstance.from('orcamentos_funil').select('*').eq('cliente_id', clienteId).order('created_at', {
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
  const carregarOrcamentosGestores = async () => {
    console.log('🔄 Carregando orçamentos dos gestores...');
    try {
      const {
        data: rawData,
        error: rawError
      } = await supabase.from('clientes').select(`
          id,
          nome,
          primary_gestor_user_id
        `).eq('ativo', true).not('primary_gestor_user_id', 'is', null);
      if (rawError) throw rawError;
      console.log('📊 Clientes encontrados:', rawData?.length);
      const {
        data: colaboradores,
        error: colabError
      } = await supabase.from('colaboradores').select('user_id, nome, avatar_url').eq('ativo', true);
      if (colabError) throw colabError;
      console.log('👥 Colaboradores encontrados:', colaboradores?.length);
      const {
        data: orcamentos,
        error: orcError
      } = await supabase.from('orcamentos_funil').select('cliente_id, nome_funil, valor_investimento, active');
      if (orcError) throw orcError;
      console.log('💰 Orçamentos encontrados:', orcamentos?.length);
      const gestoresMap = new Map<string, GestorOrcamento>();
      rawData?.forEach(cliente => {
        const colaborador = colaboradores?.find(c => c.user_id === cliente.primary_gestor_user_id);
        if (!colaborador) return;
        const gestorId = cliente.primary_gestor_user_id;
        if (!gestoresMap.has(gestorId)) {
          gestoresMap.set(gestorId, {
            gestor_nome: colaborador.nome,
            gestor_avatar: colaborador.avatar_url,
            gestor_user_id: gestorId,
            total_clientes: 0,
            total_orcamentos: 0,
            total_investimento: 0,
            funis: []
          });
        }
        const gestor = gestoresMap.get(gestorId)!;
        gestor.total_clientes++;
        const clienteOrcamentos = orcamentos?.filter(o => o.cliente_id === cliente.id) || [];
        clienteOrcamentos.forEach(orcamento => {
          // Só contar orçamentos ativos
          if (orcamento.active) {
            gestor.total_orcamentos++;
            gestor.total_investimento += Number(orcamento.valor_investimento);
          }
          gestor.funis.push({
            nome_funil: orcamento.nome_funil,
            valor_investimento: Number(orcamento.valor_investimento),
            cliente_nome: cliente.nome
          });
        });
      });
      console.log('📈 Gestores processados:', Array.from(gestoresMap.values()));
      setGestoresOrcamentos(Array.from(gestoresMap.values()));
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos gestores: " + error.message,
        variant: "destructive"
      });
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
        // Criar novo - orçamentos são criados ativos por padrão
        const {
          error
        } = await supabase.from('orcamentos_funil').insert({
          cliente_id: clienteId,
          nome_funil: formData.nome_funil,
          valor_investimento: valor,
          observacoes: formData.observacoes,
          active: true,
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

  const handleStatusChange = (orcamentoId: string, newStatus: boolean) => {
    setOrcamentos(prev => prev.map(o => 
      o.id === orcamentoId ? { ...o, active: newStatus } : o
    ));
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
          {canManageBudgets && !isPublicView && <Button onClick={() => setShowNovoModal(true)} size="sm" className="flex-1 lg:flex-none text-xs sm:text-sm">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="truncate">Novo Orçamento</span>
            </Button>}
        </div>
      </div>

      {/* Tabs para alternar entre visualizações */}
      <Tabs defaultValue={clienteId ? "cliente" : "gestores"} className="w-full">
        

        {/* Aba do Cliente Específico */}
        {clienteId && <TabsContent value="cliente" className="space-y-6">
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
        {orcamentosFiltrados.map(orcamento => <Card 
          key={orcamento.id} 
          className={`relative w-full ${!orcamento.active ? 'opacity-60' : ''}`}
        >
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 leading-tight pr-2">
                    {orcamento.nome_funil}
                  </CardTitle>
                   <OrcamentoStatusToggle
                    orcamentoId={orcamento.id}
                    currentStatus={orcamento.active}
                    onStatusChange={(newStatus) => handleStatusChange(orcamento.id, newStatus)}
                    disabled={isPublicView || !canManageBudgets}
                  />
                </div>
                <div className="flex gap-1 flex-shrink-0 self-end sm:self-start">
                  <Button variant="ghost" size="sm" onClick={() => abrirHistorico(orcamento)} className="h-7 w-7 p-0 sm:h-8 sm:w-8">
                    <History className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  {canManageBudgets && !isPublicView && <>
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
                <div className={`text-xl sm:text-2xl lg:text-3xl font-bold break-all ${
                  orcamento.active ? 'text-primary' : 'text-muted-foreground'
                }`}>
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
              {canManageBudgets && !isPublicView ? "Clique em 'Novo Orçamento' para adicionar o primeiro." : "Os orçamentos serão exibidos aqui quando cadastrados."}
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
          </TabsContent>}

        {/* Aba dos Gestores */}
        {showGestorValues && <TabsContent value="gestores" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {gestoresOrcamentos.map(gestor => <Card key={gestor.gestor_user_id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={gestor.gestor_avatar} />
                      <AvatarFallback>
                        {gestor.gestor_nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {gestor.gestor_nome}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{gestor.total_clientes} cliente{gestor.total_clientes !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{gestor.total_orcamentos} funis</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {formatarMoeda(gestor.total_investimento)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Investimento</p>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {gestor.funis.slice(0, 5).map((funil, index) => <div key={`${funil.cliente_nome}-${funil.nome_funil}-${index}`} className="flex justify-between items-center p-2 rounded border">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{funil.nome_funil}</p>
                          <p className="text-xs text-muted-foreground truncate">{funil.cliente_nome}</p>
                        </div>
                        <div className="text-sm font-semibold text-primary">
                          {formatarMoeda(funil.valor_investimento)}
                        </div>
                      </div>)}
                    {gestor.funis.length > 5 && <div className="text-center p-2 text-sm text-muted-foreground">
                        +{gestor.funis.length - 5} funis adicionais
                      </div>}
                  </div>
                </CardContent>
              </Card>)}
          </div>
          
          {gestoresOrcamentos.length === 0 && <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Nenhum gestor com orçamentos encontrado</h3>
                <p className="text-muted-foreground">
                  Os dados dos gestores aparecerão aqui quando houver orçamentos cadastrados e gestores atribuídos aos clientes.
                </p>
              </CardContent>
            </Card>}
        </TabsContent>}
      </Tabs>

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