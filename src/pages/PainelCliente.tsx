import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Link2, Video, Search, Copy, Eye, Upload, FolderOpen, DollarSign, Share2, Edit2, Palette, Rocket } from "lucide-react";
import { MessageCircle, ArrowLeft, LogIn, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StatusCliente } from "@/components/Clientes/StatusCliente";
import { GravacoesReunioes } from "@/components/Clientes/GravacoesReunioes";
import { TarefasListEnhanced } from "@/components/Clientes/TarefasListEnhanced";
import { LinksImportantesEnhanced } from "@/components/Clientes/LinksImportantesEnhanced";
import { OrcamentoPorFunil } from "@/components/Clientes/OrcamentoPorFunil";
import { EditarClienteModal } from "@/components/Clientes/EditarClienteModal";
import { BrandingConfigModal } from "@/components/Clientes/BrandingConfigModal";
import { MensagemSemanal } from "@/components/Clientes/MensagemSemanal";
import { HistoricoMensagensCliente } from "@/components/Clientes/HistoricoMensagensCliente";
import { DiarioBordo } from "@/components/Clientes/DiarioBordo";
import { ChecklistCriativosView } from "@/components/Clientes/ChecklistCriativos";
import { NPSPopup } from "@/components/NPS/NPSPopup";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ClienteBrandingProvider } from "@/components/Clientes/ClienteBrandingProvider";
import { ClienteBrandingHeader } from "@/components/Clientes/ClienteBrandingHeader";
import { LancamentoCard } from "@/components/Lancamentos/LancamentoCard";
import type { User } from "@supabase/supabase-js";
const PainelCliente = () => {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('gravacoes');
  const [cliente, setCliente] = useState<any>(null);
  const [lancamentosAtivos, setLancamentosAtivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const { canManageBudgets, canCreateContent } = useUserPermissions();
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
    console.log('Tentando carregar cliente com ID ou slug:', clienteId);
    try {
      // Use public supabase client for unauthenticated access
      const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
      const publicSupabase = createPublicSupabaseClient();
      
      // Verificar se clienteId é um UUID ou slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clienteId || '');
      
      console.log('Fazendo query pública para cliente:', clienteId, 'isUUID:', isUUID);
      
      let query = publicSupabase.from('clientes').select('*');
      
      if (isUUID) {
        query = query.eq('id', clienteId);
      } else {
        query = query.eq('slug', clienteId);
      }
      
      const { data, error } = await query;

      console.log('Query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('Nenhum cliente encontrado com este ID ou slug');
        setCliente(null);
        setLoading(false);
        return;
      }

      console.log('Cliente encontrado:', data[0]);
      setCliente(data[0]);
      
      // Buscar lançamentos ativos do cliente
      console.log('🚀 Buscando lançamentos ativos para cliente:', data[0].id);
      const { data: lancamentos, error: lancError } = await publicSupabase
        .from('lancamentos')
        .select('*')
        .eq('cliente_id', data[0].id)
        .eq('ativo', true)
        .in('status_lancamento', ['em_captacao', 'cpl', 'remarketing'])
        .order('data_inicio_captacao', { ascending: false });
      
      console.log('🚀 Resultado da busca de lançamentos:', { 
        count: lancamentos?.length || 0, 
        lancamentos, 
        error: lancError 
      });
      
      setLancamentosAtivos(lancamentos || []);
      console.log('🚀 State atualizado com lançamentos:', lancamentos?.length || 0);
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
    // Preferir usar o slug se disponível, senão usar o ID
    const identifier = cliente?.slug || clienteId;
    const panelLink = `${currentDomain}/painel/${identifier}`;
    
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
    <ClienteBrandingProvider cliente={cliente}>
      <Helmet>
        <title>{`${cliente.nome} - Painel do Cliente | BNOads`}</title>
        <meta name="description" content={`Acesse o painel personalizado de ${cliente.nome} na BNOads. Acompanhe gravações de reuniões, tarefas, links importantes, orçamento de funis e muito mais.`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="BNOads" />
        <meta property="og:title" content={`${cliente.nome} - Painel do Cliente`} />
        <meta property="og:description" content={`Acesse o painel personalizado de ${cliente.nome} na BNOads. Acompanhe gravações, tarefas, links e orçamento dos seus funis de tráfego.`} />
        <meta property="og:image" content={cliente.branding_enabled && cliente.branding_logo ? cliente.branding_logo : `${window.location.origin}/bnoads-logo-share.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={window.location.href} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${cliente.nome} - Painel do Cliente | BNOads`} />
        <meta name="twitter:description" content={`Acesse o painel personalizado de ${cliente.nome} na BNOads. Acompanhe gravações, tarefas, links e orçamento dos seus funis.`} />
        <meta name="twitter:image" content={cliente.branding_enabled && cliente.branding_logo ? cliente.branding_logo : `${window.location.origin}/bnoads-logo-share.png`} />
      </Helmet>
      
      {/* NPS Popup - mostrar apenas para não autenticados (clientes) */}
      {!isAuthenticated && <NPSPopup clienteId={cliente.id} clienteNome={cliente.nome} />}
      
      <div 
        className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border"
        style={{
          backgroundColor: cliente.branding_enabled && cliente.branding_bg 
            ? cliente.branding_bg 
            : undefined
        }}
      >
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
                  <ClienteBrandingHeader clienteNome={cliente.nome} />
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex gap-2">
              {!isAuthenticated && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate(`/painel/${cliente.slug || clienteId}/nps`)}
                  className="flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  <span>Avaliar</span>
                </Button>
              )}
              
              {isAuthenticated && canCreateContent && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setBrandingModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Branding</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Editar Cliente</span>
                  </Button>
                </>
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
          
          {/* DEBUG: Mostrar sempre para verificar */}
          <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
            DEBUG: {lancamentosAtivos.length} lançamentos encontrados
          </div>
          
          {/* Lançamentos Ativos - Destaque visual com animação */}
          {lancamentosAtivos.length > 0 && (
            <section className="space-y-3 sm:space-y-4 animate-in fade-in-50 duration-500">
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center gap-2 flex-1">
                  <div 
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: cliente.branding_enabled && cliente.branding_primary 
                        ? `${cliente.branding_primary}20` 
                        : 'hsl(var(--primary) / 0.1)'
                    }}
                  >
                    <Rocket 
                      className="h-5 w-5 sm:h-6 sm:w-6" 
                      style={{
                        color: cliente.branding_enabled && cliente.branding_primary 
                          ? cliente.branding_primary 
                          : undefined
                      }}
                    />
                  </div>
                  <h2 
                    className="text-lg sm:text-xl lg:text-2xl font-bold"
                    style={{
                      color: cliente.branding_enabled && cliente.branding_primary 
                        ? cliente.branding_primary 
                        : undefined
                    }}
                  >
                    Lançamentos Ativos
                  </h2>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {lancamentosAtivos.length} {lancamentosAtivos.length === 1 ? 'Ativo' : 'Ativos'}
                </Badge>
              </div>
              <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
                {lancamentosAtivos.map(lanc => (
                  <LancamentoCard 
                    key={lanc.id} 
                    lancamento={lanc}
                    compact={false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Links e Tarefas - Stack em Mobile, Grid em Desktop */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 xl:gap-6 2xl:gap-8">
            <section className="space-y-3 sm:space-y-4 min-w-0">
              <h2 
                className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1"
                style={{
                  color: cliente.branding_enabled && cliente.branding_primary 
                    ? cliente.branding_primary 
                    : undefined
                }}
              >
                <Link2 
                  className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" 
                  style={{
                    color: cliente.branding_enabled && cliente.branding_primary 
                      ? cliente.branding_primary 
                      : undefined
                  }}
                />
                <span className="truncate">Links Importantes</span>
              </h2>
              <div className="w-full overflow-hidden">
               <LinksImportantesEnhanced clienteId={cliente.id} isPublicView={!isAuthenticated} />
              </div>
            </section>

            <section className="space-y-3 sm:space-y-4 min-w-0">
              <h2 
                className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1"
                style={{
                  color: cliente.branding_enabled && cliente.branding_primary 
                    ? cliente.branding_primary 
                    : undefined
                }}
              >
                <FileText 
                  className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" 
                  style={{
                    color: cliente.branding_enabled && cliente.branding_primary 
                      ? cliente.branding_primary 
                      : undefined
                  }}
                />
                <span className="truncate">Tarefas</span>
              </h2>
              <div className="w-full overflow-hidden">
                <TarefasListEnhanced clienteId={cliente.id} tipo="cliente" isPublicView={!isAuthenticated} />
              </div>
              
              {/* Checklist de Criativos - Below tasks */}
              <div className="mt-6">
                <ChecklistCriativosView clienteId={cliente.id} isPublicView={!isAuthenticated} />
              </div>
              
              {/* Diário de Bordo - Positioned below checklist on the right side */}
              <div className="mt-6">
                <DiarioBordo clienteId={cliente.id} />
              </div>
            </section>
          </div>

          {/* Gravações - Prioridade Mobile */}
          <section className="space-y-3 sm:space-y-4">
            <h2 
              className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1"
              style={{
                color: cliente.branding_enabled && cliente.branding_primary 
                  ? cliente.branding_primary 
                  : undefined
              }}
            >
              <Video 
                className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" 
                style={{
                  color: cliente.branding_enabled && cliente.branding_primary 
                    ? cliente.branding_primary 
                    : undefined
                }}
              />
              <span className="truncate">Gravações e Reuniões</span>
            </h2>
            <div className="w-full overflow-hidden">
              <GravacoesReunioes clienteId={cliente.id} isPublicView={!isAuthenticated} />
            </div>
          </section>

          {/* Mensagem Semanal e Histórico */}
          <section className="space-y-3 sm:space-y-4">
            <div className="w-full overflow-hidden space-y-4">
              {isAuthenticated && (
                <MensagemSemanal 
                  clienteId={cliente.id} 
                  gestorId={cliente.primary_gestor_user_id}
                  csId={cliente.cs_id}
                />
              )}
              <HistoricoMensagensCliente 
                clienteId={cliente.id} 
                clienteNome={cliente.nome}
                isPublicView={!isAuthenticated} 
              />
            </div>
          </section>

          {/* Orçamento por Funil - Adaptativo */}
          <section className="space-y-3 sm:space-y-4">
            <h2 
              className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1"
              style={{
                color: cliente.branding_enabled && cliente.branding_primary 
                  ? cliente.branding_primary 
                  : undefined
              }}
            >
              <DollarSign 
                className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mx-0" 
                style={{
                  color: cliente.branding_enabled && cliente.branding_primary 
                    ? cliente.branding_primary 
                    : undefined
                }}
              />
              <span className="truncate">Orçamento por Funil</span>
            </h2>
            <div className="w-full overflow-hidden">
              <OrcamentoPorFunil clienteId={cliente.id} isPublicView={!isAuthenticated} showGestorValues={false} />
            </div>
          </section>
        </div>
      </div>

      {/* Modais */}
      <EditarClienteModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        cliente={cliente}
        onSuccess={handleEditSuccess}
      />
      
      <BrandingConfigModal
        open={brandingModalOpen}
        onOpenChange={setBrandingModalOpen}
        cliente={cliente}
        onSuccess={handleEditSuccess}
      />
    </ClienteBrandingProvider>
  );
};

export default PainelCliente;