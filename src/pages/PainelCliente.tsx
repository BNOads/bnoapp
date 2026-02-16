import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditarClienteModal } from "@/components/Clientes/EditarClienteModal";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import type { User } from "@supabase/supabase-js";
import { ClientDashboardContent } from "@/components/Clientes/ClientDashboardContent";

const PainelCliente = () => {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<any>(null);
  const [lancamentosAtivos, setLancamentosAtivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [currentColaboradorId, setCurrentColaboradorId] = useState<string | null>(null);
  const { canCreateContent } = useUserPermissions(); // removed canManageBudgets if unused locally

  useEffect(() => {
    // Verificar autenticação (opcional - não bloqueia o acesso)
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setIsAuthenticated(!!user);
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
      setLoading(false);
    }
  }, [clienteId]);

  const carregarDadosCliente = async () => {
    try {
      // Use public supabase client for unauthenticated access
      const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
      const publicSupabase = createPublicSupabaseClient();

      // Verificar se clienteId é um UUID ou slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clienteId || '');

      let query = publicSupabase.from('clientes').select('*');

      if (isUUID) {
        query = query.eq('id', clienteId);
      } else {
        query = query.eq('slug', clienteId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setCliente(null);
        setLoading(false);
        return;
      }

      const clientData = data[0];
      setCliente(clientData);

      // Buscar lançamentos ativos do cliente
      const { data: lancamentos } = await publicSupabase
        .from('lancamentos')
        .select('*')
        .eq('cliente_id', clientData.id)
        .eq('ativo', true)
        .in('status_lancamento', ['em_captacao', 'cpl', 'remarketing'])
        .order('data_inicio_captacao', { ascending: false });


      setLancamentosAtivos(lancamentos || []);

      // Se autenticado, buscar o ID do colaborador
      if (user) {
        const { data: colaborador } = await publicSupabase
          .from('colaboradores')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (colaborador) {
          setCurrentColaboradorId(colaborador.id);
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar dados do cliente:', error);
      toast({
        title: "Erro",
        description: `Erro ao carregar dados do cliente: ${error.message}`,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleSharePanel = async () => {
    const currentDomain = window.location.origin;
    const identifier = cliente?.slug || clienteId;
    const panelLink = `${currentDomain}/painel/${identifier}`;

    try {
      await navigator.clipboard.writeText(panelLink);
      toast({
        title: "Link copiado!",
        description: "O link do painel foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
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
      <ClientDashboardContent
        cliente={cliente}
        lancamentosAtivos={lancamentosAtivos}
        isAuthenticated={isAuthenticated}
        canCreateContent={canCreateContent}
        currentUser={user}
        currentColaboradorId={currentColaboradorId}
        onEditClient={() => setEditModalOpen(true)}
        onShare={handleSharePanel}
        onNavigateBack={() => {
          const from = location.state?.from || '/?tab=clientes';
          navigate(from);
        }}
      />

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
