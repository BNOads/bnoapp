import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Plus, CheckCircle, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NovaAulaModal } from "@/components/Treinamentos/NovaAulaModal";
import { EditarTreinamentoModal } from "@/components/Treinamentos/EditarTreinamentoModal";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Header } from "@/components/Layout/Header";

interface Treinamento {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  nivel: string;
  tipo: string;
}

interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  url_youtube: string;
  ordem: number;
  duracao: number;
}

interface ProgressoAula {
  aula_id: string;
  concluido: boolean;
}

export default function CursoDetalhes() {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserPermissions();
  
  const [treinamento, setTreinamento] = useState<Treinamento | null>(null);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<ProgressoAula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovaAula, setShowNovaAula] = useState(false);
  const [showEditarTreinamento, setShowEditarTreinamento] = useState(false);

  useEffect(() => {
    if (cursoId) {
      carregarDados();
    }
  }, [cursoId]);

  const carregarDados = async () => {
    console.log('CursoDetalhes carregarDados iniciado', { cursoId });
    try {
      // Carregar dados do treinamento
      const { data: treinamentoData, error: treinamentoError } = await supabase
        .from('treinamentos')
        .select('*')
        .eq('id', cursoId)
        .maybeSingle();

      console.log('Dados do treinamento:', { treinamentoData, treinamentoError });
      if (treinamentoError) throw treinamentoError;
      if (!treinamentoData) throw new Error('Treinamento não encontrado');
      setTreinamento(treinamentoData);

      // Carregar aulas
      const { data: aulasData, error: aulasError } = await supabase
        .from('aulas')
        .select('*')
        .eq('treinamento_id', cursoId)
        .eq('ativo', true)
        .order('ordem');

      console.log('Dados das aulas:', { aulasData, aulasError });
      if (aulasError) throw aulasError;
      setAulas(aulasData || []);

      // Carregar progresso do usuário
      const user = await supabase.auth.getUser();
      console.log('Usuario para progresso:', user.data.user?.id);
      
      const { data: progressoData, error: progressoError } = await supabase
        .from('progresso_aulas')
        .select('aula_id, concluido')
        .eq('treinamento_id', cursoId)
        .eq('user_id', user.data.user?.id);

      console.log('Dados do progresso das aulas:', { progressoData, progressoError });
      if (progressoError) throw progressoError;
      setProgressoAulas(progressoData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do curso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAulaConcluida = (aulaId: string) => {
    return progressoAulas.find(p => p.aula_id === aulaId)?.concluido || false;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  if (!treinamento) {
    return <div className="text-center">Curso não encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab="treinamentos" onTabChange={(tab) => { console.log('Header navigation clicked:', tab); navigate(`/${tab}`); }} />
      <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
         <Button 
           variant="ghost" 
           onClick={() => navigate('/?tab=treinamentos')}
           className="mb-4"
         >
           <ArrowLeft className="w-4 h-4 mr-2" />
           Voltar para Treinamentos
         </Button>

        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{treinamento.titulo}</h1>
              <p className="text-muted-foreground mb-4">{treinamento.descricao}</p>
              
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {treinamento.categoria?.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline">{treinamento.nivel}</Badge>
                <Badge variant="outline">{treinamento.tipo}</Badge>
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEditarTreinamento(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Curso
                </Button>
                <Button onClick={() => setShowNovaAula(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Aula
                </Button>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Total de {aulas.length} aulas • {progressoAulas.filter(p => p.concluido).length} concluídas
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Aulas do Curso</h2>
        
        {aulas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma aula disponível neste curso ainda.</p>
              {isAdmin && (
                <Button 
                  onClick={() => setShowNovaAula(true)}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeira Aula
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          aulas.map((aula, index) => (
            <Card 
               key={aula.id}
               className="cursor-pointer hover:shadow-lg transition-shadow"
               onClick={() => navigate(`/curso/${cursoId}/aula/${aula.id}`, { 
                 state: { from: `/curso/${cursoId}` } 
               })}
             >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                      <span className="text-lg font-bold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {aula.titulo}
                        {isAulaConcluida(aula.id) && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </CardTitle>
                      <CardDescription>{aula.descricao}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {showNovaAula && (
        <NovaAulaModal
          isOpen={showNovaAula}
          onClose={() => setShowNovaAula(false)}
          treinamentoId={cursoId!}
          onSuccess={() => {
            setShowNovaAula(false);
            carregarDados();
          }}
        />
      )}

      <EditarTreinamentoModal
        open={showEditarTreinamento}
        onOpenChange={setShowEditarTreinamento}
        treinamentoId={cursoId}
        onSuccess={() => {
          carregarDados(); // Recarregar dados após editar
        }}
      />
      </div>
    </div>
  );
}