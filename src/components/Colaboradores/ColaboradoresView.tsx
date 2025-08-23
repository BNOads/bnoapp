import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, User, Mail, Calendar, BookOpen, MoreVertical } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoColaboradorModal } from "./NovoColaboradorModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";

export const ColaboradoresView = () => {
  const { canCreateContent } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(colaboradores, ['nome', 'email', 'nivel_acesso']);

  const carregarColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setColaboradores(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar colaboradores:', error);
      toast({
        title: "Erro ao carregar colaboradores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarColaboradores();
  }, []);

  const getStatusColor = (ativo: boolean, userIod: string | null) => {
    if (!ativo) return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    if (userIod) return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  };

  const getStatusLabel = (ativo: boolean, userId: string | null) => {
    if (!ativo) return 'Inativo';
    if (userId) return 'Ativo';
    return 'Aguardando Registro';
  };

  const formatarData = (data: string) => {
    if (!data) return 'N/A';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const calcularProgresso = () => {
    // Simular progresso baseado em dados aleatórios
    return Math.floor(Math.random() * 100);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Colaboradores</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gerencie a equipe e acompanhe o progresso dos treinamentos
          </p>
        </div>
        {canCreateContent && (
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Colaborador
          </Button>
        )}
      </div>

      {/* Indicator para usuários não-admin */}
      {!canCreateContent && <ViewOnlyBadge />}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaboradores..."
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 sm:p-3 rounded-xl">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{colaboradores.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total de Colaboradores</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-glow/10 p-2 sm:p-3 rounded-xl">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary-glow" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {colaboradores.filter(c => c.user_id).length * 12}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Treinamentos Concluídos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-secondary/10 p-2 sm:p-3 rounded-xl">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {colaboradores.filter(c => c.user_id).length > 0 ? 
                  Math.round((colaboradores.filter(c => c.user_id).length / colaboradores.length) * 100) : 0}%
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Taxa de Ativação</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Colaboradores List */}
      <Card className="bg-card border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Lista de Colaboradores
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum colaborador encontrado.</p>
              {canCreateContent && (
                <Button 
                  onClick={() => setModalOpen(true)}
                  className="mt-4"
                >
                  Adicionar Primeiro Colaborador
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((colaborador) => (
                <div
                  key={colaborador.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/20 rounded-xl border border-border hover:shadow-card transition-all duration-300 space-y-4 sm:space-y-0"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      {colaborador.avatar_url && (
                        <AvatarImage 
                          src={colaborador.avatar_url} 
                          alt={colaborador.nome} 
                        />
                      )}
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-sm">
                        {colaborador.nome.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {colaborador.nome}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {colaborador.nivel_acesso === 'admin' ? 'Administrador' : 
                         colaborador.nivel_acesso === 'gestor_trafego' ? 'Gestor de Tráfego' : 'Customer Success'}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-1">
                        <div className="flex items-center space-x-1 min-w-0">
                          <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {colaborador.email}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {formatarData(colaborador.data_admissao)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-6">
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-medium text-foreground">
                        {calcularProgresso()}%
                      </p>
                      <p className="text-xs text-muted-foreground">Progresso</p>
                      <div className="w-16 bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calcularProgresso()}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-medium text-foreground">
                        {colaborador.user_id ? Math.floor(Math.random() * 20) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Concluídos</p>
                    </div>

                    <Badge className={getStatusColor(colaborador.ativo, colaborador.user_id)}>
                      {getStatusLabel(colaborador.ativo, colaborador.user_id)}
                    </Badge>

                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <NovoColaboradorModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          carregarColaboradores(); // Recarregar lista após criar
        }}
      />
    </div>
  );
};