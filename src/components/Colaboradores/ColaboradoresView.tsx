import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, User, Mail, Calendar, MoreVertical, Cake, Trash2, Edit, Key } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoColaboradorModal } from "./NovoColaboradorModal";
import { EditarColaboradorModal } from "./EditarColaboradorModal";
import { AlterarSenhaModal } from "./AlterarSenhaModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const ColaboradoresView = () => {
  const { isAdmin } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [colaboradorToDelete, setColaboradorToDelete] = useState<any>(null);
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
    
    try {
      const hoje = new Date();
      const nascimento = new Date(dataNascimento);
      
      // Verificar se a data é válida
      if (isNaN(nascimento.getTime())) return null;
      
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
    } catch (error) {
      console.error('Erro ao calcular aniversário:', error);
      return null;
    }
  };

  const formatarAniversario = (dataNascimento: string) => {
    if (!dataNascimento) return 'Não informado';
    const diasRestantes = calcularDiasParaAniversario(dataNascimento);
    if (diasRestantes === null) return 'Data inválida';
    
    if (diasRestantes === 0) return 'Hoje! 🎂';
    if (diasRestantes === 1) return 'Amanhã! 🎂';
    if (diasRestantes <= 7) return `${diasRestantes} dias 🍰`;
    return `${diasRestantes} dias`;
  };

  const handleEditarColaborador = (colaborador: any) => {
    console.log('Editando colaborador:', colaborador);
    setSelectedColaborador(colaborador);
    setEditModalOpen(true);
  };

  const handleAlterarSenha = (colaborador: any) => {
    console.log('Alterando senha do colaborador:', colaborador);
    setSelectedColaborador(colaborador);
    setSenhaModalOpen(true);
  };

  const handleDeletarColaborador = (colaborador: any) => {
    console.log('Preparando para deletar colaborador:', colaborador);
    setColaboradorToDelete(colaborador);
    setDeleteDialogOpen(true);
  };

  const confirmarDelecao = async () => {
    if (!colaboradorToDelete) return;
    
    try {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', colaboradorToDelete.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Colaborador excluído!",
        description: `${colaboradorToDelete.nome} foi removido da equipe.`,
      });

      carregarColaboradores();
      setDeleteDialogOpen(false);
      setColaboradorToDelete(null);
    } catch (error: any) {
      console.error('Erro ao deletar colaborador:', error);
      toast({
        title: "Erro ao excluir colaborador",
        description: error.message,
        variant: "destructive",
      });
    }
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
        {isAdmin && (
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
      {!isAdmin && <ViewOnlyBadge />}

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
              {isAdmin && (
                <Button 
                  onClick={() => setModalOpen(true)}
                  className="mt-4"
                >
                  Adicionar Primeiro Colaborador
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((colaborador) => {
                const diasAniversario = calcularDiasParaAniversario(colaborador.data_nascimento);
                const isAniversarioProximo = diasAniversario !== null && diasAniversario >= 0 && diasAniversario <= 7;
                
                return (
                  <div
                    key={colaborador.id}
                    className={`p-4 rounded-xl border hover:shadow-lg transition-all duration-300 ${
                      isAniversarioProximo ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : 'bg-card border-border'
                    }`}
                  >
                    {/* Header do Card com Avatar e Menu */}
                    <div className="flex items-start justify-between mb-3">
                      <Avatar className="h-12 w-12 ring-2 ring-border">
                        {colaborador.avatar_url && (
                          <AvatarImage 
                            src={colaborador.avatar_url}
                            alt={colaborador.nome} 
                          />
                        )}
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                          {colaborador.nome.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg">
                            <DropdownMenuItem onClick={() => handleEditarColaborador(colaborador)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAlterarSenha(colaborador)}>
                              <Key className="h-4 w-4 mr-2" />
                              Alterar Senha
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeletarColaborador(colaborador)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Nome e Função */}
                    <div className="mb-3">
                      <h4 className="font-bold text-foreground text-lg leading-tight mb-1">
                        {colaborador.nome}
                      </h4>
                      <p className="text-sm font-medium text-primary">
                        {colaborador.nivel_acesso === 'dono' ? 'Dono' :
                         colaborador.nivel_acesso === 'admin' ? 'Administrador' : 
                         colaborador.nivel_acesso === 'gestor_trafego' ? 'Gestor de Tráfego' : 
                         colaborador.nivel_acesso === 'gestor_projetos' ? 'Gestor de Projetos' :
                         colaborador.nivel_acesso === 'webdesigner' ? 'Webdesigner' :
                         colaborador.nivel_acesso === 'editor_video' ? 'Editor de Vídeo' :
                         colaborador.nivel_acesso === 'cs' ? 'Customer Success' :
                         colaborador.nivel_acesso === 'midia_buyer' ? 'Mídia Buyer' :
                         colaborador.nivel_acesso === 'copywriter' ? 'Copywriter' :
                         colaborador.nivel_acesso === 'designer' ? 'Designer' : colaborador.nivel_acesso}
                      </p>
                    </div>

                    {/* Email e Aniversário */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
                        <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-sm text-foreground truncate">{colaborador.email}</p>
                      </div>
                      
                      <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                        isAniversarioProximo ? 'bg-yellow-100 border border-yellow-200' : 'bg-muted/30'
                      }`}>
                        <Cake className={`h-4 w-4 flex-shrink-0 ${
                          isAniversarioProximo ? 'text-yellow-600' : 'text-primary'
                        }`} />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Aniversário</p>
                          <p className={`text-sm font-medium ${
                            isAniversarioProximo ? 'text-yellow-700' : 'text-foreground'
                          }`}>
                            {formatarAniversario(colaborador.data_nascimento)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-muted-foreground">Ativo</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Modal de Novo Colaborador */}
      <NovoColaboradorModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          carregarColaboradores();
        }}
      />

      {/* Modal de Editar Colaborador */}
      <EditarColaboradorModal 
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        colaborador={selectedColaborador}
        onSuccess={() => {
          carregarColaboradores();
        }}
      />

      {/* Modal de Alterar Senha */}
      <AlterarSenhaModal 
        open={senhaModalOpen}
        onOpenChange={setSenhaModalOpen}
        colaborador={selectedColaborador}
        onSuccess={() => {
          carregarColaboradores();
        }}
      />

      {/* Dialog de Confirmação para Deletar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir {colaboradorToDelete?.nome}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarDelecao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};