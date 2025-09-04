import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, User, Mail, Calendar, MoreVertical, Cake } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoColaboradorModal } from "./NovoColaboradorModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const ColaboradoresView = () => {
  const { canCreateContent, isAdmin } = useUserPermissions();
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

  const formatarData = (data: string) => {
    if (!data) return 'N/A';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const calcularDiasParaAniversario = (dataNascimento: string) => {
    if (!dataNascimento) return null;
    
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const anoAtual = hoje.getFullYear();
    
    // Criar data de aniversário para o ano atual
    const aniversarioEsteAno = new Date(anoAtual, nascimento.getMonth(), nascimento.getDate());
    
    // Se o aniversário já passou este ano, calcular para o próximo ano
    if (aniversarioEsteAno < hoje) {
      aniversarioEsteAno.setFullYear(anoAtual + 1);
    }
    
    // Calcular diferença em dias
    const diferenca = Math.ceil((aniversarioEsteAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diferenca;
  };

  const formatarAniversario = (dataNascimento: string) => {
    if (!dataNascimento) return 'N/A';
    const diasRestantes = calcularDiasParaAniversario(dataNascimento);
    if (diasRestantes === null) return 'N/A';
    
    if (diasRestantes === 0) return 'Hoje! 🎂';
    if (diasRestantes === 1) return 'Amanhã! 🎂';
    if (diasRestantes <= 7) return `${diasRestantes} dias 🍰`;
    return `${diasRestantes} dias`;
  };

  const handleEditarColaborador = (colaborador: any) => {
    // Implementar edição
    toast({
      title: "Editar Colaborador",
      description: `Editando ${colaborador.nome}`,
    });
  };

  const handleDelegarColaborador = (colaborador: any) => {
    // Implementar delegação
    toast({
      title: "Delegar Colaborador",
      description: `Delegando responsabilidades para ${colaborador.nome}`,
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Equipe BNOads</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Conheça todos os membros da nossa equipe
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

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membros da equipe..."
            className="pl-10 bg-background border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Statistics Card */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 sm:p-3 rounded-xl">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{colaboradores.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Membros da Equipe</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Colaboradores List */}
      <Card className="bg-card border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Nossa Equipe
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum membro encontrado.</p>
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
              {filteredItems.map((colaborador) => {
                const diasAniversario = calcularDiasParaAniversario(colaborador.data_nascimento);
                const isAniversarioProximo = diasAniversario !== null && diasAniversario <= 7;
                
                return (
                  <div
                    key={colaborador.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border hover:shadow-card transition-all duration-300 space-y-4 sm:space-y-0 ${
                      isAniversarioProximo ? 'bg-yellow-50 border-yellow-200' : 'bg-muted/20 border-border'
                    }`}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
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
                        <h4 className="font-semibold text-foreground text-base sm:text-lg">
                          {colaborador.nome}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {colaborador.nivel_acesso === 'admin' ? 'Administrador' : 
                           colaborador.nivel_acesso === 'gestor_trafego' ? 'Gestor de Tráfego' : 'Customer Success'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{colaborador.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Desde {formatarData(colaborador.data_admissao)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Cake className="h-3 w-3 flex-shrink-0" />
                            <span>{formatarAniversario(colaborador.data_nascimento)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="flex-shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditarColaborador(colaborador)}>
                              Editar Colaborador
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelegarColaborador(colaborador)}>
                              Delegar Colaborador
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <NovoColaboradorModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          carregarColaboradores();
        }}
      />
    </div>
  );
};