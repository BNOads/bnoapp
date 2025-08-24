import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Search, Filter, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Cliente {
  id: string;
  nome: string;
  status_cliente: string;
  data_inicio: string;
  traffic_manager_id?: string;
  cs_id?: string;
  traffic_manager?: { id: string; nome: string };
  cs?: { id: string; nome: string };
}

interface Colaborador {
  id: string;
  nome: string;
  nivel_acesso: string;
}

export function AlocacaoClientes() {
  const { toast } = useToast();
  const { isAdmin } = useUserPermissions();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ traffic_manager_id?: string; cs_id?: string }>({});

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      console.log('Carregando dados de alocação...');
      
      // Carregar clientes com suas alocações
      const { data: clientesData, error: clientesError } = await supabase.functions.invoke('clients-assignments', {
        method: 'GET'
      });
      
      if (clientesError) {
        console.error('Erro ao carregar clientes:', clientesError);
        throw clientesError;
      }
      
      console.log('Clientes carregados:', clientesData?.data?.length || 0);
      setClientes(clientesData?.data || []);

      // Carregar colaboradores ativos
      const { data: colaboradoresData, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select('id, nome, nivel_acesso')
        .eq('ativo', true)
        .order('nome');

      if (colaboradoresError) {
        console.error('Erro ao carregar colaboradores:', colaboradoresError);
        throw colaboradoresError;
      }
      
      console.log('Colaboradores carregados:', colaboradoresData?.length || 0);
      setColaboradores(colaboradoresData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados de alocação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (clienteId: string, cliente: Cliente) => {
    setEditingClient(clienteId);
    setEditData({
      traffic_manager_id: cliente.traffic_manager_id || "",
      cs_id: cliente.cs_id || ""
    });
  };

  const handleSave = async (clienteId: string) => {
    try {
      console.log('Salvando alocação para cliente:', clienteId, editData);
      
      const { data, error } = await supabase.functions.invoke('clients-assignments', {
        method: 'PATCH',
        body: {
          client_id: clienteId,
          traffic_manager_id: editData.traffic_manager_id || null,
          cs_id: editData.cs_id || null
        }
      });

      if (error) {
        console.error('Erro detalhado na resposta da API:', error);
        console.error('Dados enviados:', {
          client_id: clienteId,
          traffic_manager_id: editData.traffic_manager_id || null,
          cs_id: editData.cs_id || null
        });
        throw error;
      }

      console.log('Alocação salva com sucesso:', data);

      toast({
        title: "Sucesso",
        description: "Alocação atualizada com sucesso!"
      });

      setEditingClient(null);
      setEditData({});
      carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar alocação:', error);
      
      let errorMessage = "Falha ao atualizar alocação";
      if (error?.details) {
        errorMessage += `: ${error.details}`;
      } else if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingClient(null);
    setEditData({});
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ativo: "bg-green-100 text-green-800",
      inativo: "bg-red-100 text-red-800",
      pausado: "bg-yellow-100 text-yellow-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || cliente.status_cliente === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const gestoresTrafego = colaboradores.filter(c => 
    c.nivel_acesso === 'admin' || c.nivel_acesso === 'gestor_trafego'
  );
  
  const csTeam = colaboradores.filter(c => 
    c.nivel_acesso === 'admin' || c.nivel_acesso === 'cs'
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Controle de Alocação de Clientes
          </CardTitle>
          <CardDescription>
            Gerencie a distribuição de clientes entre gestores de tráfego e CS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Gestor de Tráfego</TableHead>
                  <TableHead>Customer Success</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>
                      {editingClient === cliente.id ? (
                        <Select
                          value={editData.traffic_manager_id || "none"}
                          onValueChange={(value) => setEditData(prev => ({ 
                            ...prev, 
                            traffic_manager_id: value === "none" ? "" : value 
                          }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecionar gestor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {gestoresTrafego.map((gestor) => (
                              <SelectItem key={gestor.id} value={gestor.id}>
                                {gestor.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">
                          {cliente.traffic_manager?.nome || 
                            <Badge variant="outline" className="text-muted-foreground">
                              Não atribuído
                            </Badge>
                          }
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === cliente.id ? (
                        <Select
                          value={editData.cs_id || "none"}
                          onValueChange={(value) => setEditData(prev => ({ 
                            ...prev, 
                            cs_id: value === "none" ? "" : value 
                          }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecionar CS" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {csTeam.map((cs) => (
                              <SelectItem key={cs.id} value={cs.id}>
                                {cs.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">
                          {cliente.cs?.nome || 
                            <Badge variant="outline" className="text-muted-foreground">
                              Não atribuído
                            </Badge>
                          }
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(cliente.status_cliente)}>
                        {cliente.status_cliente}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {cliente.data_inicio ? 
                        new Date(cliente.data_inicio).toLocaleDateString('pt-BR') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {editingClient === cliente.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(cliente.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(cliente.id, cliente)}
                          disabled={!isAdmin}
                          className="h-8 w-8 p-0"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredClientes.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}