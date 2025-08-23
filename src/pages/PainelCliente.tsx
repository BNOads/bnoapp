import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Link2, Video, Search, Copy, Eye, Upload, FolderOpen } from "lucide-react";
import { MessageCircle, ArrowLeft, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Layout/Header";
import { StatusCliente } from "@/components/Clientes/StatusCliente";
import { GravacoesReunioes } from "@/components/Clientes/GravacoesReunioes";
import { TarefasList } from "@/components/Clientes/TarefasList";
import { LinksImportantes } from "@/components/Clientes/LinksImportantes";
import type { User } from "@supabase/supabase-js";

const PainelCliente = () => {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('gravacoes');
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ultimasAtualizacoes, setUltimasAtualizacoes] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    console.log('=== PAINEL CLIENTE DEBUG ===');
    console.log('clienteId from useParams:', clienteId);
    console.log('typeof clienteId:', typeof clienteId);
    console.log('location.pathname:', window.location.pathname);
    
    setDebugInfo({
      clienteId,
      pathname: window.location.pathname,
      params: { clienteId }
    });

    // Verificar autenticação
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsAuthenticated(!!user);
      console.log('Usuario autenticado:', !!user, user?.email);
    };

    checkAuth();

    if (clienteId) {
      carregarDadosCliente();
      carregarUltimasAtualizacoes();
    } else {
      console.log('ClienteId não encontrado na URL');
      setLoading(false);
    }
  }, [clienteId]);

  const carregarDadosCliente = async () => {
    console.log('=== CARREGAR DADOS CLIENTE ===');
    console.log('Tentando carregar cliente com ID:', clienteId);
    
    try {
      // Primeiro vamos verificar se o usuário está autenticado
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('Usuario autenticado:', authData.user?.email, authError);
      
      const { data, error } = await supabase
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
      toast({
        title: "Erro",
        description: `Erro ao carregar dados do cliente: ${error.message}`,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const carregarUltimasAtualizacoes = async () => {
    try {
      // Apenas carregar se o usuário estiver autenticado
      if (!isAuthenticated) {
        setUltimasAtualizacoes([]);
        return;
      }
      // Buscar diferentes tipos de atividades recentes
      const [interacoes, tarefas, reunioes] = await Promise.all([
        supabase
          .from('interacoes')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('tarefas')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('reunioes')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      const atualizacoes: any[] = [
        ...(interacoes.data || []).map(item => ({
          id: item.id,
          titulo: item.titulo,
          tipo: 'Interação',
          data: item.created_at,
          descricao: item.descricao || ''
        })),
        ...(tarefas.data || []).map(item => ({
          id: item.id,
          titulo: item.titulo,
          tipo: 'Tarefa',
          data: item.created_at,
          descricao: item.descricao || ''
        })),
        ...(reunioes.data || []).map(item => ({
          id: item.id,
          titulo: item.titulo,
          tipo: 'Reunião',
          data: item.created_at,
          descricao: item.descricao || ''
        }))
      ];

      // Ordenar por data e pegar apenas as 5 mais recentes
      atualizacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setUltimasAtualizacoes(atualizacoes.slice(0, 5));

    } catch (error) {
      console.error('Erro ao carregar atualizações:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarTempoRelativo = (data: string) => {
    const agora = new Date();
    const dataItem = new Date(data);
    const diffMs = agora.getTime() - dataItem.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHoras < 1) return 'Agora mesmo';
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias} dias atrás`;
    return dataItem.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated ? (
          <Header activeTab="clientes" onTabChange={(tab) => navigate(`/${tab}`)} />
        ) : (
          <div className="bg-background border-b border-border">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Painel do Cliente</h1>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/auth')}
                  size="sm"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Fazer Login
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando cliente...</p>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Debug Info:</p>
                <pre className="bg-muted p-2 rounded text-xs">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated ? (
          <Header activeTab="clientes" onTabChange={(tab) => navigate(`/${tab}`)} />
        ) : (
          <div className="bg-background border-b border-border">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Painel do Cliente</h1>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/auth')}
                  size="sm"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Fazer Login
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Cliente não encontrado</h1>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isAuthenticated ? 'Voltar ao Dashboard' : 'Voltar'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? (
        <Header activeTab="clientes" onTabChange={(tab) => navigate(`/${tab}`)} />
      ) : (
        <div className="bg-background border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Painel do Cliente</h1>
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                size="sm"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Fazer Login
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header do Cliente */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                {isAuthenticated && (
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/')}
                    className="p-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {cliente.nome}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{cliente.categoria}</Badge>
                    <Badge variant="outline">{cliente.nicho}</Badge>
                  </div>
                </div>
              </div>
            </div>
            
            {cliente.whatsapp_grupo_url && (
              <Button asChild>
                <a href={cliente.whatsapp_grupo_url} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Grupo WhatsApp
                </a>
              </Button>
            )}
          </div>
          
          <div className="container mx-auto p-6 max-w-7xl">
            {/* Cards de Ação Rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="hover:shadow-card transition-all duration-300 cursor-pointer group" onClick={() => setActiveTab('gravacoes')}>
                <CardContent className="p-4 sm:p-6 text-center">
                  <Video className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-medium text-foreground mb-1 text-sm sm:text-base">Gravações</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Ver reuniões gravadas</p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-card transition-all duration-300 cursor-pointer group" onClick={() => setActiveTab('links')}>
                <CardContent className="p-4 sm:p-6 text-center">
                  <Link2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-medium text-foreground mb-1 text-sm sm:text-base">Links</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Links importantes</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-card transition-all duration-300 cursor-pointer group" onClick={() => setActiveTab('tarefas')}>
                <CardContent className="p-4 sm:p-6 text-center">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-medium text-foreground mb-1 text-sm sm:text-base">Tarefas</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Acompanhar atividades</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-card transition-all duration-300 cursor-pointer group" onClick={() => navigate(`/criativos/${clienteId}`)}>
                <CardContent className="p-4 sm:p-6 text-center">
                  <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-medium text-foreground mb-1 text-sm sm:text-base">Criativos</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Catálogo de materiais</p>
                </CardContent>
              </Card>
            </div>

            {/* Navegação por Abas */}
            <div className="flex flex-wrap gap-2 sm:gap-1 border-b border-border mb-6">
              <Button
                variant={activeTab === 'gravacoes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('gravacoes')}
                className="text-xs sm:text-sm"
              >
                <Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Gravações</span>
                <span className="sm:hidden">Vídeos</span>
              </Button>
              <Button
                variant={activeTab === 'links' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('links')}
                className="text-xs sm:text-sm"
              >
                <Link2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Links
              </Button>
              <Button
                variant={activeTab === 'tarefas' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('tarefas')}
                className="text-xs sm:text-sm"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Tarefas
              </Button>
            </div>

            {/* Conteúdo das Abas */}
            <div>
              {activeTab === 'gravacoes' && <GravacoesReunioes clienteId={clienteId} />}
              {activeTab === 'links' && <LinksImportantes clienteId={clienteId} />}
              {activeTab === 'tarefas' && <TarefasList clienteId={clienteId} tipo="cliente" />}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2"></div>
          <div className="space-y-8">
            {/* Últimas Atualizações */}
            <Card>
              <CardHeader>
                <CardTitle>Últimas Atualizações</CardTitle>
              </CardHeader>
              <CardContent>
                {ultimasAtualizacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atualização recente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ultimasAtualizacoes.map((atualizacao) => (
                      <div key={atualizacao.id} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm">{atualizacao.titulo}</h4>
                          <Badge variant="outline" className="text-xs">
                            {atualizacao.tipo}
                          </Badge>
                        </div>
                        {atualizacao.descricao && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {atualizacao.descricao}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatarTempoRelativo(atualizacao.data)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PainelCliente;