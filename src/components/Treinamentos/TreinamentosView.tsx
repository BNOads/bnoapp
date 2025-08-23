import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, Users, Clock, Search, Plus, Star, Award } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoTreinamentoModal } from "./NovoTreinamentoModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const TreinamentosView = () => {
  const { canCreateContent } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const carregarTreinamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('treinamentos')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTreinamentos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar treinamentos:', error);
      toast({
        title: "Erro ao carregar treinamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTreinamentos();
  }, []);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'video':
        return Play;
      case 'documento':
        return BookOpen;
      case 'apresentacao':
        return Award;
      case 'quiz':
        return Star;
      default:
        return BookOpen;
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'iniciante':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'intermediario':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'avancado':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatarDuracao = (minutos: number) => {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatarCategoria = (categoria: string) => {
    const categorias: Record<string, string> = {
      facebook_ads: 'Facebook Ads',
      google_ads: 'Google Ads',
      analytics: 'Analytics',
      criativos: 'Criativos',
      copywriting: 'Copywriting',
      estrategia: 'Estratégia',
      ferramentas: 'Ferramentas',
      processos: 'Processos'
    };
    return categorias[categoria] || categoria;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Biblioteca de Treinamentos</h2>
          <p className="text-muted-foreground mt-1">
            Explore cursos, tutoriais e materiais de capacitação
          </p>
        </div>
        {canCreateContent && (
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Curso
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
            placeholder="Buscar treinamentos..."
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
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{treinamentos.length}</p>
              <p className="text-sm text-muted-foreground">Total de Cursos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-glow/10 p-3 rounded-xl">
              <Play className="h-6 w-6 text-primary-glow" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {treinamentos.filter(t => t.tipo === 'video').length}
              </p>
              <p className="text-sm text-muted-foreground">Vídeos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-secondary/10 p-3 rounded-xl">
              <Users className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {treinamentos.reduce((acc, t) => acc + (t.visualizacoes || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Visualizações</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-accent/10 p-3 rounded-xl">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(treinamentos.reduce((acc, t) => acc + (t.duracao || 0), 0) / 60)}h
              </p>
              <p className="text-sm text-muted-foreground">Duração Total</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Treinamentos Grid */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-foreground">Cursos Disponíveis</h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : treinamentos.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">
              Nenhum treinamento encontrado
            </h4>
            <p className="text-muted-foreground mb-4">
              Ainda não há treinamentos disponíveis na biblioteca.
            </p>
            {canCreateContent && (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Treinamento
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {treinamentos.map((treinamento) => {
              const TipoIcon = getTipoIcon(treinamento.tipo);
              return (
                <Card key={treinamento.id} className="overflow-hidden hover:shadow-card transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <TipoIcon className="h-4 w-4 text-primary" />
                        </div>
                        <Badge className={getNivelColor(treinamento.nivel)}>
                          {treinamento.nivel}
                        </Badge>
                      </div>
                    </div>

                    <h4 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                      {treinamento.titulo}
                    </h4>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {treinamento.descricao || 'Sem descrição disponível'}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Categoria:</span>
                        <Badge variant="outline" className="text-xs">
                          {formatarCategoria(treinamento.categoria)}
                        </Badge>
                      </div>

                    </div>

                    <div className="mt-6 space-y-2">
                      <Button 
                        className="w-full" 
                        variant="default"
                        onClick={() => navigate(`/curso/${treinamento.id}`)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Acessar Curso
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <NovoTreinamentoModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          carregarTreinamentos(); // Recarregar lista após criar
        }}
      />
    </div>
  );
};