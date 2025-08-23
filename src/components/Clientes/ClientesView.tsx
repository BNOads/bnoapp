import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, FileText, Link2, Video, Search, Plus, Copy, Eye } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoClienteModal } from "./NovoClienteModal";

export const ClientesView = () => {
  const { canCreateContent } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const clientes = [
    {
      id: 1,
      nome: "Loja Virtual ABC",
      linkPainel: "https://bnoads.com/painel/abc123",
      ultimoAcesso: "Hoje, 14:30",
      status: "ativo",
      reunioes: 8,
      tarefas: 12,
      documentos: 25
    },
    {
      id: 2,
      nome: "Consultoria XYZ",
      linkPainel: "https://bnoads.com/painel/xyz456",
      ultimoAcesso: "Ontem, 16:45",
      status: "ativo",
      reunioes: 15,
      tarefas: 8,
      documentos: 32
    },
    {
      id: 3,
      nome: "Empresa DEF",
      linkPainel: "https://bnoads.com/painel/def789",
      ultimoAcesso: "2 dias atrás",
      status: "pausado",
      reunioes: 5,
      tarefas: 3,
      documentos: 18
    },
    {
      id: 4,
      nome: "Startup GHI",
      linkPainel: "https://bnoads.com/painel/ghi012",
      ultimoAcesso: "3 dias atrás",
      status: "ativo",
      reunioes: 12,
      tarefas: 15,
      documentos: 28
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'pausado':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'pausado':
        return 'Pausado';
      default:
        return 'Inativo';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Add toast notification here
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
        {canCreateContent && (
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Painel
          </Button>
        )}
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
          />
        </div>
        <Button variant="outline" className="shrink-0">
          Filtros
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <ExternalLink className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">89</p>
              <p className="text-sm text-muted-foreground">Painéis Ativos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-glow/10 p-3 rounded-xl">
              <Video className="h-6 w-6 text-primary-glow" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">245</p>
              <p className="text-sm text-muted-foreground">Gravações</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-secondary/10 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">1,234</p>
              <p className="text-sm text-muted-foreground">Documentos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-accent/50 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">156</p>
              <p className="text-sm text-muted-foreground">Reuniões</p>
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
          <div className="space-y-4">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                className="flex items-center justify-between p-6 bg-muted/20 rounded-xl border border-border hover:shadow-card transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-primary p-3 rounded-xl">
                    <ExternalLink className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">
                      {cliente.nome}
                    </h4>
                    <div className="flex items-center space-x-1 mt-1">
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-mono">
                        {cliente.linkPainel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Último acesso: {cliente.ultimoAcesso}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* Stats */}
                  <div className="flex space-x-4 text-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cliente.reunioes}
                      </p>
                      <p className="text-xs text-muted-foreground">Reuniões</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cliente.tarefas}
                      </p>
                      <p className="text-xs text-muted-foreground">Tarefas</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cliente.documentos}
                      </p>
                      <p className="text-xs text-muted-foreground">Docs</p>
                    </div>
                  </div>

                  <Badge className={getStatusColor(cliente.status)}>
                    {getStatusLabel(cliente.status)}
                  </Badge>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(cliente.linkPainel)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Example Client Panel Preview */}
      <Card className="bg-gradient-subtle border border-border shadow-elegant">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Preview do Painel do Cliente
          </h3>
          <p className="text-sm text-muted-foreground">
            Exemplo de como os clientes visualizam seus painéis personalizados
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-card/50 border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Video className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Gravações</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Últimas reuniões e calls gravadas
              </p>
            </Card>
            <Card className="p-4 bg-card/50 border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Documentos</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Planilhas, relatórios e materiais
              </p>
            </Card>
            <Card className="p-4 bg-card/50 border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Calendário</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Próximos encontros e eventos
              </p>
            </Card>
            <Card className="p-4 bg-card/50 border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Tarefas</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Lista de pendências e status
              </p>
            </Card>
          </div>
        </div>
      </Card>

      {/* Modal */}
      <NovoClienteModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          console.log('Cliente criado com sucesso!');
        }}
      />
    </div>
  );
};