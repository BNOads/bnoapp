import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, FileText, Link2, Video, Search, Plus, Copy, Eye, Trash2, Upload, Edit, UserCheck, Filter, ArrowUpDown, EditIcon, Users } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoClienteModal } from "./NovoClienteModal";
import { DeleteClienteModal } from "./DeleteClienteModal";
import { ImportarClientesModal } from "./ImportarClientesModal";
import { EditarClienteModal } from "./EditarClienteModal";
import { EdicaoMassaModal } from "./EdicaoMassaModal";
import { AlocacaoClientes } from "./AlocacaoClientes";
import { KickoffModal } from "./KickoffModal";
import { TeamAssignmentModal } from "./TeamAssignmentModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";

interface Cliente {
  id: string;
  nome: string;
  categoria?: string;
  nicho?: string;
  status_cliente?: string;
  etapa_atual?: string;
  funis_trabalhando?: string[];
  primary_gestor_user_id?: string;
  primary_cs_user_id?: string;
  primary_gestor?: {
    id: string;
    nome: string;
    avatar_url?: string;
  };
  primary_cs?: {
    id: string;
    nome: string;
    avatar_url?: string;
  };
  client_roles?: Array<{
    user_id: string;
    role: 'gestor' | 'cs';
    is_primary: boolean;
  }>;
}

export const ClientesView = () => {
  const {
    canCreateContent
  } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [edicaoMassaModalOpen, setEdicaoMassaModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [clienteToEdit, setClienteToEdit] = useState<any | null>(null);
  const [kickoffModalOpen, setKickoffModalOpen] = useState(false);
  const [clienteKickoff, setClienteKickoff] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [clienteTeam, setClienteTeam] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [nichoFilter, setNichoFilter] = useState<string>('all');
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          primary_gestor:colaboradores!clientes_primary_gestor_user_id_fkey(user_id, nome, avatar_url),
          primary_cs:colaboradores!clientes_primary_cs_user_id_fkey(user_id, nome, avatar_url),
          client_roles(
            user_id, role, is_primary,
            colaboradores(user_id, nome, avatar_url)
          )
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      setClientes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('user_id, nome, email, avatar_url, nivel_acesso')
        .eq('ativo', true);

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error('Error loading colaboradores:', error);
    }
  };
  useEffect(() => {
    carregarClientes();
    carregarColaboradores();
  }, []);
  const getStatusColor = (etapa: string) => {
    switch (etapa) {
      case 'ativo':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'implantacao':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'negociacao':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'pausa':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const getStatusLabel = (etapa: string) => {
    switch (etapa) {
      case 'ativo':
        return 'Ativo';
      case 'implantacao':
        return 'Implantação';
      case 'negociacao':
        return 'Negociação';
      case 'pausa':
        return 'Em Pausa';
      case 'prospecção':
        return 'Prospecção';
      case 'apresentacao':
        return 'Apresentação';
      case 'contrato':
        return 'Contrato';
      default:
        return 'Indefinido';
    }
  };
  const formatarDataAcesso = (data: string) => {
    if (!data) return 'Nunca';
    const agora = new Date();
    const acesso = new Date(data);
    const diff = agora.getTime() - acesso.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const dias = Math.floor(horas / 24);
    if (horas < 1) return 'Agora há pouco';
    if (horas < 24) return `${horas}h atrás`;
    if (dias === 1) return '1 dia atrás';
    return `${dias} dias atrás`;
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência."
    });
  };
  const handleDeleteClick = (cliente: any) => {
    setClienteToDelete({
      id: cliente.id,
      nome: cliente.nome
    });
    setDeleteModalOpen(true);
  };
  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setClienteToDelete(null);
    carregarClientes();
  };
  const handleEditClick = (cliente: any) => {
    setClienteToEdit(cliente);
    setEditModalOpen(true);
  };
  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setClienteToEdit(null);
    carregarClientes();
  };
  const handleEdicaoMassaSuccess = () => {
    setEdicaoMassaModalOpen(false);
    setClientesSelecionados([]);
    carregarClientes();
  };

  // Filtrar clientes baseado nos filtros ativos
  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) || cliente.nicho?.toLowerCase().includes(searchTerm.toLowerCase()) || cliente.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFilter === 'all' || !categoriaFilter || cliente.categoria === categoriaFilter;
    const matchesNicho = nichoFilter === 'all' || !nichoFilter || cliente.nicho === nichoFilter;
    return matchesSearch && matchesCategoria && matchesNicho;
  });

  // Funções de seleção múltipla
  const toggleClienteSelection = (clienteId: string) => {
    setClientesSelecionados(prev => prev.includes(clienteId) ? prev.filter(id => id !== clienteId) : [...prev, clienteId]);
  };
  const toggleSelectAll = () => {
    if (clientesSelecionados.length === filteredClientes.length) {
      setClientesSelecionados([]);
    } else {
      setClientesSelecionados(filteredClientes.map(c => c.id));
    }
  };

  // Função de ordenação
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Aplicar ordenação aos clientes filtrados
  const sortedAndFilteredClientes = [...filteredClientes].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Tratar valores nulos
    if (!aValue) aValue = '';
    if (!bValue) bValue = '';

    // Para campos de string
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Obter listas únicas para os filtros
  const categorias = [...new Set(clientes.map(c => c.categoria).filter(Boolean))];
  const nichos = [...new Set(clientes.map(c => c.nicho).filter(Boolean))];
  const limparFiltros = () => {
    setCategoriaFilter('all');
    setNichoFilter('all');
    setSearchTerm('');
    setClientesSelecionados([]);
  };
  return <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Clientes</h2>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            Gerencie painéis, alocações e acompanhe o acesso dos clientes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
          {canCreateContent && <>
              <Button variant="outline" size="sm" className="sm:size-default lg:size-lg w-full sm:w-auto" onClick={() => setImportModalOpen(true)}>
                <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Importar em Massa</span>
                <span className="sm:hidden">Importar</span>
              </Button>
              <Button variant="hero" size="sm" className="sm:size-default lg:size-lg w-full sm:w-auto" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Novo Painel
              </Button>
            </>}
        </div>
      </div>

      {/* Indicator para usuários não-admin */}
      {!canCreateContent && <ViewOnlyBadge />}

      {/* Tabs */}
      <div className="space-y-6">

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar clientes por nome, nicho ou categoria..." className="pl-10 bg-background border-border" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categorias.map(categoria => <SelectItem key={categoria} value={categoria}>
                      {categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
                    </SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={nichoFilter} onValueChange={setNichoFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Nicho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos nichos</SelectItem>
                  {nichos.map(nicho => <SelectItem key={nicho} value={nicho}>
                      {nicho}
                    </SelectItem>)}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={limparFiltros}>
                <Filter className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>

      {/* Tabela de Clientes */}
      <Card className="bg-card border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Lista de Clientes ({sortedAndFilteredClientes.length})
            </h3>
            {clientesSelecionados.length > 0 && canCreateContent && <Button onClick={() => setEdicaoMassaModalOpen(true)} variant="outline" size="sm">
                <EditIcon className="h-4 w-4 mr-2" />
                Editar {clientesSelecionados.length} selecionado(s)
              </Button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div> : sortedAndFilteredClientes.length === 0 ? <div className="text-center py-8">
              <p className="text-muted-foreground">
                {clientes.length === 0 ? "Nenhum cliente encontrado." : "Nenhum cliente corresponde aos filtros aplicados."}
              </p>
              {clientes.length === 0 && canCreateContent && <Button onClick={() => setModalOpen(true)} className="mt-4">
                  Criar Primeiro Painel
                </Button>}
              {clientes.length > 0 && <Button onClick={limparFiltros} variant="outline" className="mt-4">
                  Limpar Filtros
                </Button>}
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  {canCreateContent && <TableHead className="w-12">
                      <Checkbox checked={clientesSelecionados.length === sortedAndFilteredClientes.length} onCheckedChange={toggleSelectAll} />
                    </TableHead>}
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('nome')}>
                    <div className="flex items-center">
                      Cliente
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('categoria')}>
                    <div className="flex items-center">
                      Categoria
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('nicho')}>
                    <div className="flex items-center">
                      Nicho
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                   <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status_cliente')}>
                     <div className="flex items-center">
                       Status
                       <ArrowUpDown className="ml-2 h-4 w-4" />
                     </div>
                   </TableHead>
                   <TableHead className="text-center">Gestor</TableHead>
                   <TableHead className="text-center">CS</TableHead>
                   <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredClientes.map(cliente => <TableRow key={cliente.id} className="hover:bg-muted/50">
                    {canCreateContent && <TableCell>
                        <Checkbox checked={clientesSelecionados.includes(cliente.id)} onCheckedChange={() => toggleClienteSelection(cliente.id)} />
                      </TableCell>}
                     <TableCell>
                      <div>
                        <button onClick={() => navigate(`/painel/${cliente.id}`, {
                        state: {
                          from: '/?tab=clientes'
                        }
                      })} className="font-medium text-foreground hover:text-primary transition-colors text-left">
                          {cliente.nome}
                        </button>
                        {cliente.funis_trabalhando && cliente.funis_trabalhando.length > 0 && <div className="flex flex-wrap gap-1 mt-1">
                            {cliente.funis_trabalhando.slice(0, 2).map((funil: string, index: number) => <Badge key={index} variant="outline" className="text-xs">
                                {funil}
                              </Badge>)}
                            {cliente.funis_trabalhando.length > 2 && <Badge variant="outline" className="text-xs">
                                +{cliente.funis_trabalhando.length - 2}
                              </Badge>}
                          </div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${cliente.categoria === 'negocio_local' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
                        {cliente.categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cliente.nicho ? <span className="text-sm text-muted-foreground">{cliente.nicho}</span> : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(cliente.status_cliente || cliente.etapa_atual)} text-xs`}>
                        {getStatusLabel(cliente.status_cliente || cliente.etapa_atual)}
                      </Badge>
                     </TableCell>
                     
                     {/* Gestor Column */}
                     <TableCell className="text-center">
                       {cliente.primary_gestor ? (
                         <div className="flex justify-center">
                           <Avatar 
                             className="h-8 w-8 cursor-pointer hover:opacity-80" 
                             onClick={() => {
                               setClienteTeam({ id: cliente.id, nome: cliente.nome });
                               setTeamModalOpen(true);
                             }}
                           >
                             <AvatarImage src={cliente.primary_gestor.avatar_url} />
                             <AvatarFallback className="text-xs">
                               {cliente.primary_gestor.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                             </AvatarFallback>
                           </Avatar>
                         </div>
                       ) : (
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-8 w-8 p-0 text-muted-foreground"
                           onClick={() => {
                             setClienteTeam({ id: cliente.id, nome: cliente.nome });
                             setTeamModalOpen(true);
                           }}
                         >
                           <Users className="h-4 w-4" />
                         </Button>
                       )}
                     </TableCell>

                     {/* CS Column */}
                     <TableCell className="text-center">
                       {(() => {
                         const csTeam = cliente.client_roles?.filter(cr => cr.role === 'cs') || [];
                         const primaryCs = cliente.primary_cs;
                         
                         if (primaryCs) {
                           return (
                             <div className="flex justify-center items-center gap-1">
                               <Avatar 
                                 className="h-8 w-8 cursor-pointer hover:opacity-80" 
                                 onClick={() => {
                                   setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                   setTeamModalOpen(true);
                                 }}
                               >
                                 <AvatarImage src={primaryCs.avatar_url} />
                                 <AvatarFallback className="text-xs">
                                   {primaryCs.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                 </AvatarFallback>
                               </Avatar>
                               {csTeam.length > 1 && (
                                 <Badge variant="secondary" className="text-xs px-1 h-5">
                                   +{csTeam.length - 1}
                                 </Badge>
                               )}
                             </div>
                           );
                         } else {
                           return (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-8 w-8 p-0 text-muted-foreground"
                               onClick={() => {
                                 setClienteTeam({ id: cliente.id, nome: cliente.nome });
                                 setTeamModalOpen(true);
                               }}
                             >
                               <Users className="h-4 w-4" />
                             </Button>
                           );
                         }
                       })()}
                     </TableCell>
                     
                     <TableCell>
                      <div className="flex items-center justify-center space-x-1">
                         

                        {canCreateContent && <Button variant="ghost" size="sm" onClick={() => {
                        setClienteKickoff({
                          id: cliente.id,
                          nome: cliente.nome
                        });
                        setKickoffModalOpen(true);
                      }} className="h-8 w-8 p-0" title="Kickoff">
                            <span className="text-lg text-blue-500">📄</span>
                          </Button>}
                        
                        {canCreateContent && <Button variant="ghost" size="sm" onClick={() => handleEditClick(cliente)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>}
                        
                        <Button variant="ghost" size="sm" onClick={() => {
                        const fullLink = cliente.link_painel?.startsWith('http') ? cliente.link_painel : `${window.location.origin}${cliente.link_painel}`;
                        copyToClipboard(fullLink);
                      }} className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                        
                        {cliente.pasta_drive_url && <Button variant="ghost" size="sm" onClick={() => window.open(cliente.pasta_drive_url, '_blank')} className="h-8 w-8 p-0" title="Pasta do Drive">
                          <span className="text-lg">📁</span>
                        </Button>}
                        
                        {canCreateContent && <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(cliente)} className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </div>
      </Card>
        </div>
      </div>

      {/* Modals */}
      <NovoClienteModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={() => {
      carregarClientes(); // Recarregar lista após criar
    }} />
      
      <DeleteClienteModal open={deleteModalOpen} onOpenChange={open => {
      setDeleteModalOpen(open);
      if (!open) {
        setClienteToDelete(null);
      }
    }} cliente={clienteToDelete} onSuccess={handleDeleteSuccess} />
      
      <ImportarClientesModal open={importModalOpen} onOpenChange={setImportModalOpen} onSuccess={() => {
      carregarClientes(); // Recarregar lista após importar
    }} />
      
      <EditarClienteModal open={editModalOpen} onOpenChange={open => {
      setEditModalOpen(open);
      if (!open) {
        setClienteToEdit(null);
      }
    }} cliente={clienteToEdit} onSuccess={handleEditSuccess} />

      <EdicaoMassaModal isOpen={edicaoMassaModalOpen} onClose={() => setEdicaoMassaModalOpen(false)} onSuccess={handleEdicaoMassaSuccess} clientesSelecionados={clientes.filter(c => clientesSelecionados.includes(c.id))} />

      {clienteKickoff && <KickoffModal isOpen={kickoffModalOpen} onClose={() => {
      setKickoffModalOpen(false);
      setClienteKickoff(null);
    }} clienteId={clienteKickoff.id} clienteNome={clienteKickoff.nome} />}

      {clienteTeam && (
        <TeamAssignmentModal 
          isOpen={teamModalOpen} 
          onClose={() => {
            setTeamModalOpen(false);
            setClienteTeam(null);
          }} 
          clienteId={clienteTeam.id} 
          clienteNome={clienteTeam.nome}
          onSuccess={() => {
            carregarClientes();
          }}
        />
      )}
  </div>
);
};