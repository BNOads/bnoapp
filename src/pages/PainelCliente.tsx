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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated ? (
          <Header activeTab="clientes" onTabChange={(tab) => {
            if (tab === 'clientes') return;
            navigate(`/?tab=${tab}`);
          }} />
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
          <Header activeTab="clientes" onTabChange={(tab) => {
            if (tab === 'clientes') return;
            navigate(`/?tab=${tab}`);
          }} />
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
        <Header activeTab="clientes" onTabChange={(tab) => {
          if (tab === 'clientes') return;
          navigate(`/?tab=${tab}`);
        }} />
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


            {/* Conteúdo Principal */}
            <div className="space-y-8">
              {/* Gravações */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Video className="h-5 w-5 mr-2 text-primary" />
                  Gravações e Reuniões
                </h2>
                <GravacoesReunioes clienteId={clienteId} />
              </div>

              {/* Links e Tarefas em duas colunas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Link2 className="h-5 w-5 mr-2 text-primary" />
                    Links Importantes
                  </h2>
                  <LinksImportantes clienteId={clienteId} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Tarefas
                  </h2>
                  <TarefasList clienteId={clienteId} tipo="cliente" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PainelCliente;