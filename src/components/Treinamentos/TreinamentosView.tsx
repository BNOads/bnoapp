import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Search, Plus, Star, Award, GraduationCap, FileText, Edit, MoreVertical, Filter, Clock, CheckCircle, Users } from "lucide-react";
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
import { PDIEquipeCard } from "@/components/Dashboard/PDIEquipeCard";

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

  // States for PDIs da Equipe
  const [pdisEquipe, setPdisEquipe] = useState<any[]>([]);
  const [loadingPdisEquipe, setLoadingPdisEquipe] = useState(false);
  const [pdiEquipeFilter, setPdiEquipeFilter] = useState<'todos' | 'ativos' | 'finalizados'>('todos');

  const carregarPdisEquipe = async () => {
    if (!isAdmin) return;

    try {
      setLoadingPdisEquipe(true);
      const { data, error } = await supabase
        .from('pdis')
        .select(`
          *,
          colaboradores!pdis_colaborador_id_fkey (
            nome,
            avatar_url
          ),
          pdi_aulas (
            id,
            concluida
          )
        `)
        .order('data_limite', { ascending: true });

      if (error) throw error;

      const formatarPdisEquipe = (data || []).map(pdi => {
        const totalAulas = (pdi.pdi_aulas?.length || 0) + (Array.isArray(pdi.aulas_externas) ? pdi.aulas_externas.length : 0);
        const aulasConcluidas = (pdi.pdi_aulas?.filter((a: any) => a.concluida).length || 0) +
          (Array.isArray(pdi.aulas_externas) ? pdi.aulas_externas.filter((a: any) => a.concluida).length : 0);
        const progresso = totalAulas > 0 ? (aulasConcluidas / totalAulas) * 100 : 0;

        return {
          id: pdi.id,
          titulo: pdi.titulo,
          descricao: pdi.descricao,
          data_limite: pdi.data_limite,
          status: pdi.status,
          colaborador: {
            nome: pdi.colaboradores?.nome || 'Colaborador',
            avatar_url: pdi.colaboradores?.avatar_url
          },
          progresso,
          total_aulas: totalAulas,
          aulas_concluidas: aulasConcluidas
        };
      });

      setPdisEquipe(formatarPdisEquipe);
    } catch (error) {
      console.error('Erro ao carregar PDIs da equipe:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar PDIs da equipe",
        variant: "destructive"
      });
    } finally {
      setLoadingPdisEquipe(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      carregarPdisEquipe();
    }
  }, [isAdmin]);

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
        <TabsList className={`grid w-full max-w-md ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="cursos" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Cursos
          </TabsTrigger>
          <TabsTrigger value="pops" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            POPs
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="pdis-equipe" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              PDIs da Equipe
            </TabsTrigger>
          )}
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


        <TabsContent value="pdis-equipe">
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Acompanhamento da Equipe</h3>
                <p className="text-muted-foreground">Monitore o desenvolvimento dos colaboradores</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={pdiEquipeFilter === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPdiEquipeFilter('todos')}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Todos
                </Button>
                <Button
                  variant={pdiEquipeFilter === 'ativos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPdiEquipeFilter('ativos')}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Ativos
                </Button>
                <Button
                  variant={pdiEquipeFilter === 'finalizados' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPdiEquipeFilter('finalizados')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Finalizados
                </Button>
              </div>
            </div>

            {loadingPdisEquipe ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : pdisEquipe.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum PDI encontrado
                </h4>
                <p className="text-muted-foreground">
                  Não há PDIs criados para a equipe no momento.
                </p>
              </Card>
            ) : (() => {
              const filteredPdisEquipe = pdisEquipe.filter(pdi => {
                if (pdiEquipeFilter === 'ativos') return pdi.status !== 'concluido';
                if (pdiEquipeFilter === 'finalizados') return pdi.status === 'concluido';
                return true;
              });

              return filteredPdisEquipe.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum PDI encontrado com filtro atual
                  </h4>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPdisEquipe.map(pdi => (
                    <PDIEquipeCard
                      key={pdi.id}
                      pdi={pdi}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
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
    </div >
  );
};
