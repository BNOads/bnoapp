import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookOpen, CheckCircle, ArrowLeft, Play, ExternalLink } from "lucide-react";
import { PDIExternalLinks } from "@/components/PDI/PDIExternalLinks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PDIDetalhes {
  id: string;
  titulo: string;
  descricao: string;
  data_limite: string;
  status: string;
  links_externos?: Array<{
    titulo: string;
    url: string;
  }>;
  aulas: Array<{
    id: string;
    aula_id: string;
    titulo: string;
    descricao: string;
    duracao: number;
    concluida: boolean;
    data_conclusao?: string;
    treinamento: {
      titulo: string;
    };
  }>;
}

export default function PDIDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [pdi, setPdi] = useState<PDIDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      carregarPDI();
    }
  }, [id]);

  const carregarPDI = async () => {
    try {
      const { data, error } = await supabase
        .from('pdis')
        .select(`
          id,
          titulo,
          descricao,
          data_limite,
          status,
          links_externos,
          pdi_aulas (
            id,
            aula_id,
            concluida,
            data_conclusao,
            aulas (
              id,
              titulo,
              descricao,
              duracao,
              treinamentos (
                titulo
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const pdiFormatado: PDIDetalhes = {
          id: data.id,
          titulo: data.titulo,
          descricao: data.descricao,
          data_limite: data.data_limite,
          status: data.status,
          links_externos: (data.links_externos as any) || [],
          aulas: data.pdi_aulas.map((pa: any) => ({
            id: pa.id,
            aula_id: pa.aula_id,
            titulo: pa.aulas.titulo,
            descricao: pa.aulas.descricao,
            duracao: pa.aulas.duracao,
            concluida: pa.concluida,
            data_conclusao: pa.data_conclusao,
            treinamento: {
              titulo: pa.aulas.treinamentos.titulo
            }
          }))
        };

        setPdi(pdiFormatado);
      }
    } catch (error) {
      console.error('Erro ao carregar PDI:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar detalhes do PDI",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarAulaConcluida = async (aulaId: string) => {
    setLoadingAction(aulaId);
    try {
      const { error } = await supabase
        .from('pdi_aulas')
        .update({
          concluida: true,
          data_conclusao: new Date().toISOString()
        })
        .eq('id', aulaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aula marcada como concluída!"
      });

      // Recarregar dados
      carregarPDI();
    } catch (error) {
      console.error('Erro ao marcar aula como concluída:', error);
      toast({
        title: "Erro",
        description: "Falha ao marcar aula como concluída",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const verAula = async (aulaId: string) => {
    try {
      // Buscar dados da aula para obter o treinamento_id
      const { data: aulaData, error } = await supabase
        .from('aulas')
        .select('treinamento_id')
        .eq('id', aulaId)
        .single();

      if (error) throw error;

      if (aulaData) {
        navigate(`/curso/${aulaData.treinamento_id}/aula/${aulaId}`);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da aula:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados da aula",
        variant: "destructive"
      });
    }
  };

  const concluirPDI = async () => {
    setLoadingAction('pdi');
    try {
      const { error } = await supabase
        .from('pdis')
        .update({
          status: 'concluido'
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Parabéns!",
        description: "PDI concluído com sucesso!"
      });

      const from = location.state?.from || '/?tab=colaboradores';
      navigate(from);
    } catch (error) {
      console.error('Erro ao concluir PDI:', error);
      toast({
        title: "Erro",
        description: "Falha ao concluir PDI",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando PDI...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pdi) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">PDI não encontrado</h1>
           <Button onClick={() => {
             const from = location.state?.from || '/?tab=colaboradores';
             navigate(from);
           }} variant="outline">
             <ArrowLeft className="h-4 w-4 mr-2" />
             Voltar
           </Button>
        </div>
      </div>
    );
  }

  const aulasCompletas = pdi.aulas.filter(aula => aula.concluida).length;
  const totalAulas = pdi.aulas.length;
  const progresso = totalAulas > 0 ? (aulasCompletas / totalAulas) * 100 : 0;
  
  const dataLimite = new Date(pdi.data_limite);
  const hoje = new Date();
  const diasRestantes = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  const getStatusColor = () => {
    if (progresso === 100) return "bg-green-500";
    if (diasRestantes < 0) return "bg-red-500";
    if (diasRestantes <= 7) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getStatusText = () => {
    if (progresso === 100) return "Concluído";
    if (diasRestantes < 0) return "Atrasado";
    if (diasRestantes <= 7) return "Urgente";
    return "Em andamento";
  };

  const todosConcluido = progresso === 100;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
          <Button onClick={() => {
            const from = location.state?.from || '/?tab=colaboradores';
            navigate(from);
          }} variant="outline" size="sm">
           <ArrowLeft className="h-4 w-4 mr-2" />
           Voltar
         </Button>
        <div>
          <h1 className="text-3xl font-bold">{pdi.titulo}</h1>
          <p className="text-muted-foreground">{pdi.descricao}</p>
        </div>
      </div>

      {/* Status e Progresso */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso do PDI</CardTitle>
            <Badge variant="outline" className={`${getStatusColor()} text-white`}>
              {getStatusText()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso Geral</span>
              <span>{aulasCompletas}/{totalAulas} aulas concluídas</span>
            </div>
            <Progress value={progresso} className="h-3" />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Prazo: {new Date(pdi.data_limite).toLocaleDateString('pt-BR')}
                {diasRestantes >= 0 
                  ? ` (${diasRestantes} dias restantes)`
                  : ` (Atrasado há ${Math.abs(diasRestantes)} dias)`
                }
              </span>
            </div>
          </div>

          {todosConcluido && (
            <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Parabéns! Você concluiu todas as aulas do PDI!</span>
              </div>
              <Button 
                onClick={concluirPDI}
                disabled={loadingAction === 'pdi'}
                className="bg-green-600 hover:bg-green-700"
              >
                {loadingAction === 'pdi' ? "Concluindo..." : "Concluir PDI"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Aulas */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Aulas do PDI</h2>
        
        <div className="grid gap-4">
          {pdi.aulas.map((aula, index) => (
            <Card key={aula.id} className={`${aula.concluida ? 'bg-green-50 border-green-200' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">#{index + 1}</span>
                      <CardTitle className="text-lg">{aula.titulo}</CardTitle>
                      {aula.concluida && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {aula.treinamento.titulo}
                    </CardDescription>
                    {aula.descricao && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {aula.descricao}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {aula.duracao}min
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aula.concluida ? (
                      <span className="text-sm text-green-600 font-medium">
                        Concluída em {new Date(aula.data_conclusao!).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Não iniciada
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => verAula(aula.aula_id)}
                      variant="outline"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Ver Aula
                    </Button>
                    
                    {!aula.concluida && (
                      <Button 
                        onClick={() => marcarAulaConcluida(aula.id)}
                        disabled={loadingAction === aula.id}
                        size="sm"
                      >
                        {loadingAction === aula.id ? "Marcando..." : "Marcar como Concluída"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Links Externos */}
      {pdi.links_externos && pdi.links_externos.length > 0 && (
        <PDIExternalLinks
          pdiId={pdi.id}
          links={pdi.links_externos}
          onLinksUpdate={(links) => setPdi(prev => prev ? { ...prev, links_externos: links } : null)}
          canEdit={false}
        />
      )}
    </div>
  );
}