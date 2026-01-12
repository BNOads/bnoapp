import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Search, Plus, Star, Award, GraduationCap, FileText, Edit, MoreVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { NovoTreinamentoModal } from "./NovoTreinamentoModal";
import { EditarTreinamentoModal } from "./EditarTreinamentoModal";
import { NovoPDIModal } from "@/components/PDI/NovoPDIModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { POPViewNova } from "./POPViewNova";

interface Aula {
  id: string;
  titulo: string;
  descricao: string | null;
  treinamento_id: string;
  ordem: number;
}

interface Treinamento {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  nivel: string;
  tipo: string;
}

export const TreinamentosView = () => {
  const { canCreateContent, isAdmin } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [treinamentoEditandoId, setTreinamentoEditandoId] = useState<string | null>(null);
  const [pdiModalOpen, setPdiModalOpen] = useState(false);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const carregarDados = async () => {
    try {
      const [treinamentosRes, aulasRes] = await Promise.all([
        supabase.from('treinamentos').select('*').eq('ativo', true).order('created_at', { ascending: false }),
        supabase.from('aulas').select('id, titulo, descricao, treinamento_id, ordem').eq('ativo', true)
      ]);

      if (treinamentosRes.error) throw treinamentosRes.error;
      if (aulasRes.error) throw aulasRes.error;

      setTreinamentos(treinamentosRes.data || []);
      setAulas(aulasRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtrar treinamentos e aulas com base no termo de pesquisa
  const { filteredTreinamentos, filteredAulas } = useMemo(() => {
    if (!searchTerm.trim()) {
      return { filteredTreinamentos: treinamentos, filteredAulas: [] };
    }

    const term = searchTerm.toLowerCase();

    const matchedTreinamentos = treinamentos.filter(t =>
      t.titulo?.toLowerCase().includes(term) ||
      t.categoria?.toLowerCase().includes(term) ||
      t.nivel?.toLowerCase().includes(term)
    );

    const matchedAulas = aulas.filter(a =>
      a.titulo?.toLowerCase().includes(term) ||
      a.descricao?.toLowerCase().includes(term)
    );

    // Adicionar treinamentos das aulas encontradas que não estão nos resultados
    const treinamentoIdsFromAulas = matchedAulas.map(a => a.treinamento_id);
    const additionalTreinamentos = treinamentos.filter(
      t => treinamentoIdsFromAulas.includes(t.id) && !matchedTreinamentos.find(mt => mt.id === t.id)
    );

    return {
      filteredTreinamentos: [...matchedTreinamentos, ...additionalTreinamentos],
      filteredAulas: matchedAulas
    };
  }, [treinamentos, aulas, searchTerm]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'video': return Play;
      case 'documento': return BookOpen;
      case 'apresentacao': return Award;
      case 'quiz': return Star;
      default: return BookOpen;
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'iniciante': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'intermediario': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'avancado': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
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

  const handleEditarTreinamento = (treinamentoId: string) => {
    setTreinamentoEditandoId(treinamentoId);
    setEditModalOpen(true);
  };

  const getTreinamentoTitulo = (treinamentoId: string) => {
    return treinamentos.find(t => t.id === treinamentoId)?.titulo || 'Curso';
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
              <Input 
                placeholder="Buscar cursos e aulas..." 
                className="pl-10 bg-background border-border" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <Button variant="outline" className="shrink-0">
              Filtros
            </Button>
          </div>

          {/* Aulas encontradas */}
          {searchTerm && filteredAulas.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Aulas Encontradas ({filteredAulas.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAulas.map(aula => (
                  <Card 
                    key={aula.id} 
                    className="p-4 hover:shadow-card transition-all duration-300 cursor-pointer border-primary/20 bg-primary/5"
                    onClick={() => navigate(`/aula/${aula.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                        <Play className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-foreground line-clamp-1">
                          {aula.titulo}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {aula.descricao || 'Sem descrição'}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {getTreinamentoTitulo(aula.treinamento_id)}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Treinamentos Grid */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground">
              {searchTerm ? `Cursos (${filteredTreinamentos.length})` : 'Cursos Disponíveis'}
            </h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredTreinamentos.length === 0 && filteredAulas.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum treinamento encontrado'}
                </h4>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Tente buscar por outros termos.' 
                    : 'Ainda não há treinamentos disponíveis na biblioteca.'}
                </p>
                {canCreateContent && !searchTerm && (
                  <Button onClick={() => setModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Treinamento
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTreinamentos.map(treinamento => {
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
                          
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditarTreinamento(treinamento.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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
                    </Card>
                  );
                })}
              </div>
            )}
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
          carregarDados();
        }} 
      />

      <EditarTreinamentoModal 
        open={editModalOpen} 
        onOpenChange={setEditModalOpen}
        treinamentoId={treinamentoEditandoId}
        onSuccess={() => {
          carregarDados();
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
