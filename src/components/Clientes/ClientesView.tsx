import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, FileText, Link2, Video, Search, Plus, Copy, Eye, Trash2, Upload } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoClienteModal } from "./NovoClienteModal";
import { DeleteClienteModal } from "./DeleteClienteModal";
import { ImportarClientesModal } from "./ImportarClientesModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";

export const ClientesView = () => {
  const { canCreateContent } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<{id: string, nome: string} | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(clientes, ['nome', 'nicho', 'categoria']);

  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
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
      description: "O link foi copiado para a área de transferência.",
    });
  };

  const handleDeleteClick = (cliente: any) => {
    setClienteToDelete({ id: cliente.id, nome: cliente.nome });
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setClienteToDelete(null);
    carregarClientes();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Painéis dos Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os painéis personalizados e acompanhe o acesso dos clientes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canCreateContent && (
            <>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setImportModalOpen(true)}
              >
                <Upload className="h-5 w-5 mr-2" />
                Importar em Massa
              </Button>
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-5 w-5 mr-2" />
                Novo Painel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Indicator para usuários não-admin */}
      {!canCreateContent && <ViewOnlyBadge />}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar painéis de clientes..."
            className="pl-10 bg-background border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="shrink-0">
          Filtros
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
              <p className="text-sm text-muted-foreground">Total de Painéis</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-glow/10 p-3 rounded-xl">
              <Eye className="h-6 w-6 text-primary-glow" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {clientes.reduce((acc, cliente) => acc + (cliente.total_acessos || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total de Acessos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-secondary/10 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {clientes.filter(c => c.etapa_atual === 'ativo').length}
              </p>
              <p className="text-sm text-muted-foreground">Painéis Ativos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Clientes List */}
      <Card className="bg-card border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Lista de Painéis
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum painel de cliente encontrado.</p>
              {canCreateContent && (
                <Button 
                  onClick={() => setModalOpen(true)}
                  className="mt-4"
                >
                  Criar Primeiro Painel
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex items-center justify-between p-6 bg-muted/20 rounded-xl border border-border hover:shadow-card transition-all duration-300"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-foreground mb-1">
                          {cliente.nome}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {cliente.categoria === 'negocio_local' ? 'Negócio Local' : 'Infoproduto'}
                          </span>
                          {cliente.nicho && (
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              {cliente.nicho}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(cliente.etapa_atual)}>
                        {getStatusLabel(cliente.etapa_atual)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {cliente.progresso_etapa || 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Progresso</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${cliente.progresso_etapa || 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">
                          {cliente.total_acessos || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Total de Acessos</p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {formatarDataAcesso(cliente.ultimo_acesso)}
                        </p>
                        <p className="text-xs text-muted-foreground">Último Acesso</p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {cliente.funis_trabalhando?.length || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Funis Ativos</p>
                      </div>
                    </div>

                    {cliente.funis_trabalhando && cliente.funis_trabalhando.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Funis Trabalhando:</p>
                        <div className="flex flex-wrap gap-1">
                          {cliente.funis_trabalhando.map((funil: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {funil}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => navigate(`/painel/${cliente.id}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Painel
                      </Button>
                      {cliente.link_painel && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(cliente.link_painel, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Link Externo
                        </Button>
                      )}
                      {cliente.pasta_drive_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(cliente.pasta_drive_url, '_blank')}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          Drive
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(cliente.link_painel || '')}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar Link
                      </Button>
                      {canCreateContent && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteClick(cliente)}
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <NovoClienteModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          carregarClientes(); // Recarregar lista após criar
        }}
      />
      
      <DeleteClienteModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) {
            setClienteToDelete(null);
          }
        }}
        cliente={clienteToDelete}
        onSuccess={handleDeleteSuccess}
      />
      
      <ImportarClientesModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => {
          carregarClientes(); // Recarregar lista após importar
        }}
      />
    </div>
  );
};