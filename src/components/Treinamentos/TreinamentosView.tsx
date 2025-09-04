import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, Users, Clock, Search, Plus, Star, Award, GraduationCap, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoTreinamentoModal } from "./NovoTreinamentoModal";
import { NovoPDIModal } from "@/components/PDI/NovoPDIModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";
import { POPViewNova } from "./POPViewNova";
export const TreinamentosView = () => {
  const {
    canCreateContent
  } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [pdiModalOpen, setPdiModalOpen] = useState(false);
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    searchTerm,
    setSearchTerm,
    filteredItems
  } = useSearch(treinamentos, ['titulo', 'categoria', 'nivel']);
  const carregarTreinamentos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('treinamentos').select('*').eq('ativo', true).order('created_at', {
        ascending: false
      });
      if (error) {
        throw error;
      }
      setTreinamentos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar treinamentos:', error);
      toast({
        title: "Erro ao carregar treinamentos",
        description: error.message,
        variant: "destructive"
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPdiModalOpen(true)}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Criar PDI
            </Button>
            <Button variant="hero" size="lg" onClick={() => setModalOpen(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Novo Curso
            </Button>
          </div>
        )}
      </div>

      {/* Indicator para usuários não-admin */}
      {!canCreateContent && <ViewOnlyBadge />}

      {/* Tabs */}
      <Tabs defaultValue="cursos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="cursos" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Cursos
          </TabsTrigger>
          <TabsTrigger value="pops" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            POPs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cursos" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar treinamentos..." className="pl-10 bg-background border-border" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" className="shrink-0">
              Filtros
            </Button>
          </div>

          {/* Treinamentos Grid */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground">Cursos Disponíveis</h3>
            
            {loading ? <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div> : filteredItems.length === 0 ? <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum treinamento encontrado
                </h4>
                <p className="text-muted-foreground mb-4">
                  Ainda não há treinamentos disponíveis na biblioteca.
                </p>
                {canCreateContent && <Button onClick={() => setModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Treinamento
                  </Button>}
              </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(treinamento => {
              const TipoIcon = getTipoIcon(treinamento.tipo);
              return <Card key={treinamento.id} className="overflow-hidden hover:shadow-card transition-all duration-300">
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
                          <Button className="w-full" variant="default" onClick={() => navigate(`/curso/${treinamento.id}`)}>
                            <Play className="h-4 w-4 mr-2" />
                            Acessar Curso
                          </Button>
                        </div>
                      </div>
                    </Card>;
            })}
              </div>}
          </div>
        </TabsContent>

        <TabsContent value="pops">
          <POPViewNova />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NovoTreinamentoModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onSuccess={() => {
          carregarTreinamentos(); // Recarregar lista após criar
        }} 
      />
      
      <NovoPDIModal 
        open={pdiModalOpen} 
        onOpenChange={setPdiModalOpen} 
        onSuccess={() => {
          // PDI criado com sucesso
        }} 
      />
    </div>
  );
};