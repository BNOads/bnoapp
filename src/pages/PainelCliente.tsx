import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Link2, Video, Search, Copy, Eye, Upload, FolderOpen, DollarSign, Share2, Edit2 } from "lucide-react";
import { MessageCircle, ArrowLeft, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StatusCliente } from "@/components/Clientes/StatusCliente";
import { GravacoesReunioes } from "@/components/Clientes/GravacoesReunioes";
import { TarefasListEnhanced } from "@/components/Clientes/TarefasListEnhanced";
import { LinksImportantesEnhanced } from "@/components/Clientes/LinksImportantesEnhanced";
import { OrcamentoPorFunil } from "@/components/Clientes/OrcamentoPorFunil";
import { EditarClienteModal } from "@/components/Clientes/EditarClienteModal";
import { MensagemSemanal } from "@/components/Clientes/MensagemSemanal";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import type { User } from "@supabase/supabase-js";
const PainelCliente = () => {
  const {
    clienteId
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState('gravacoes');
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { canManageBudgets } = useUserPermissions();
  useEffect(() => {
    console.log('=== PAINEL CLIENTE DEBUG ===');
    console.log('clienteId from useParams:', clienteId);
    console.log('typeof clienteId:', typeof clienteId);
    console.log('location.pathname:', window.location.pathname);
    setDebugInfo({
      clienteId,
      pathname: window.location.pathname,
      params: {
        clienteId
      }
    });

    // Verificar autenticação (opcional - não bloqueia o acesso)
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setIsAuthenticated(!!user);
        console.log('Usuario autenticado:', !!user, user?.email);
      } catch (error) {
        console.log('Erro na autenticação (não crítico):', error);
        setUser(null);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
    
    if (clienteId) {
      carregarDadosCliente();
    } else {
      console.log('ClienteId não encontrado na URL');
      setLoading(false);
    }
  }, [clienteId]);
  const carregarDadosCliente = async () => {
    console.log('=== CARREGAR DADOS CLIENTE ===');
    console.log('Tentando carregar cliente com ID:', clienteId);
    try {
      // Use public supabase client for unauthenticated access
      const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
      const publicSupabase = createPublicSupabaseClient();
      
      console.log('Fazendo query pública para cliente:', clienteId);
      const { data, error } = await publicSupabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId);

      console.log('Query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('Nenhum cliente encontrado com este ID');
        setCliente(null);
        setLoading(false);
        return;
      }

      console.log('Cliente encontrado:', data[0]);
      setCliente(data[0]);
      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar dados do cliente:', error);
      console.error('Detalhes do erro:', error.message, error.details, error.hint);
      toast({
        title: "Erro",
        description: `Erro ao carregar dados do cliente: ${error.message}`,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleSharePanel = async () => {
    // Use the current domain instead of hardcoded one
    const currentDomain = window.location.origin;
    const panelLink = `${currentDomain}/painel/${clienteId}`;
    
    try {
      await navigator.clipboard.writeText(panelLink);
      toast({
        title: "Link copiado!",
        description: "O link do painel foi copiado para a área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    carregarDadosCliente();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }
  
  if (!cliente) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Cliente não encontrado</h1>
        <Button onClick={() => {
          const from = location.state?.from || '/?tab=clientes';
          navigate(from);
        }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isAuthenticated ? 'Voltar' : 'Voltar'}
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-start gap-2 sm:gap-4 mb-4">
                 {isAuthenticated && <Button variant="ghost" onClick={() => {
                     const from = location.state?.from || '/?tab=clientes';
                     navigate(from);
                   }} className="p-2 flex-shrink-0">
                     <ArrowLeft className="h-4 w-4" />
                   </Button>}
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">
                    {cliente.nome}
                  </h1>
                  
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex gap-2">
              {isAuthenticated && canManageBudgets && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar Cliente</span>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSharePanel}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Compartilhar</span>
              </Button>
              
              {cliente.whatsapp_grupo_url && (
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <a href={cliente.whatsapp_grupo_url} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Grupo WhatsApp</span>
                    <span className="sm:hidden">WhatsApp</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* Conteúdo Principal - Mobile-First */}
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Links e Tarefas - Stack em Mobile, Grid em Desktop */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 xl:gap-6 2xl:gap-8">
            <section className="space-y-3 sm:space-y-4 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
                <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Links Importantes</span>
              </h2>
              <div className="w-full overflow-hidden">
               <LinksImportantesEnhanced clienteId={clienteId} isPublicView={!isAuthenticated} />
              </div>
            </section>

            <section className="space-y-3 sm:space-y-4 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Tarefas</span>
              </h2>
              <div className="w-full overflow-hidden">
                <TarefasListEnhanced clienteId={clienteId} tipo="cliente" isPublicView={!isAuthenticated} />
              </div>
            </section>
          </div>

          {/* Gravações - Prioridade Mobile */}
          <section className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
              <Video className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span className="truncate">Gravações e Reuniões</span>
            </h2>
            <div className="w-full overflow-hidden">
              <GravacoesReunioes clienteId={clienteId} isPublicView={!isAuthenticated} />
            </div>
          </section>

          {/* Mensagem Semanal - Apenas para Usuários Autenticados */}
          {isAuthenticated && (
            <section className="space-y-3 sm:space-y-4">
              <div className="w-full overflow-hidden">
                <MensagemSemanal 
                  clienteId={clienteId!} 
                  gestorId={cliente.primary_gestor_user_id}
                  csId={cliente.cs_id}
                />
              </div>
            </section>
          )}

          {/* Orçamento por Funil - Adaptativo */}
          <section className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mx-0" />
              <span className="truncate">Orçamento por Funil</span>
            </h2>
            <div className="w-full overflow-hidden">
              <OrcamentoPorFunil clienteId={clienteId} isPublicView={!isAuthenticated} showGestorValues={false} />
            </div>
          </section>
        </div>
      </div>

      {/* Modal de Edição */}
      <EditarClienteModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        cliente={cliente}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default PainelCliente;