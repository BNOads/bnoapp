import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  url_youtube: string;
  ordem: number;
  duracao: number;
  treinamento_id: string;
}

interface Treinamento {
  id: string;
  titulo: string;
}

export default function AulaDetalhes() {
  const { cursoId, aulaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [aula, setAula] = useState<Aula | null>(null);
  const [treinamento, setTreinamento] = useState<Treinamento | null>(null);
  const [concluida, setConcluida] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marcandoConcluida, setMarcandoConcluida] = useState(false);

  useEffect(() => {
    if (aulaId && cursoId) {
      carregarDados();
    }
  }, [aulaId, cursoId]);

  const carregarDados = async () => {
    console.log('carregarDados iniciado', { aulaId, cursoId });
    try {
      // Carregar dados da aula
      const { data: aulaData, error: aulaError } = await supabase
        .from('aulas')
        .select('*')
        .eq('id', aulaId)
        .maybeSingle();

      console.log('Dados da aula:', { aulaData, aulaError });
      if (aulaError) throw aulaError;
      if (!aulaData) throw new Error('Aula não encontrada');
      setAula(aulaData);

      // Carregar dados do treinamento
      const { data: treinamentoData, error: treinamentoError } = await supabase
        .from('treinamentos')
        .select('id, titulo')
        .eq('id', cursoId)
        .maybeSingle();

      console.log('Dados do treinamento:', { treinamentoData, treinamentoError });
      if (treinamentoError) throw treinamentoError;
      if (!treinamentoData) throw new Error('Treinamento não encontrado');
      setTreinamento(treinamentoData);

      // Verificar se a aula está concluída
      const user = await supabase.auth.getUser();
      console.log('Usuario para progresso:', user.data.user?.id);
      
      const { data: progressoData, error: progressoError } = await supabase
        .from('progresso_aulas')
        .select('concluido')
        .eq('aula_id', aulaId)
        .eq('user_id', user.data.user?.id)
        .maybeSingle();

      console.log('Dados do progresso:', { progressoData, progressoError });
      if (progressoError) throw progressoError;
      setConcluida(progressoData?.concluido || false);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da aula",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoConcluida = async () => {
    console.log('marcarComoConcluida iniciado', { aula, marcandoConcluida, concluida });
    if (!aula || marcandoConcluida) return;

    setMarcandoConcluida(true);
    try {
      const user = await supabase.auth.getUser();
      console.log('Usuario obtido:', user.data.user?.id);
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const novoStatus = !concluida;
      console.log('Novo status:', novoStatus);

      const { error } = await supabase
        .from('progresso_aulas')
        .upsert({
          user_id: user.data.user.id,
          aula_id: aula.id,
          treinamento_id: aula.treinamento_id,
          concluido: novoStatus
        }, {
          onConflict: 'user_id,aula_id'
        });

      console.log('Resultado upsert:', { error });
      if (error) throw error;

      setConcluida(novoStatus);
      toast({
        title: "Sucesso",
        description: novoStatus ? "Aula marcada como concluída" : "Aula desmarcada como concluída",
      });

    } catch (error) {
      console.error('Erro ao marcar aula:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar progresso da aula",
        variant: "destructive",
      });
    } finally {
      setMarcandoConcluida(false);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    // Converter URL do YouTube para formato embed
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  if (!aula || !treinamento) {
    return <div className="text-center">Aula não encontrada</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => {
              const from = location.state?.from || `/curso/${cursoId}`;
              navigate(from);
            }}
            className="mb-4"
          >
           <ArrowLeft className="w-4 h-4 mr-2" />
           Voltar para o curso
         </Button>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">{treinamento.titulo}</p>
          <h1 className="text-3xl font-bold mb-2">{aula.titulo}</h1>
          {aula.descricao && (
            <p className="text-muted-foreground">{aula.descricao}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Player de Vídeo */}
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video">
              <iframe
                src={getYouTubeEmbedUrl(aula.url_youtube)}
                title={aula.titulo}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>

        {/* Controles da Aula */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Progresso da Aula</span>
              <Button 
                onClick={marcarComoConcluida}
                disabled={marcandoConcluida}
                variant={concluida ? "outline" : "default"}
                className={concluida ? "text-green-600 border-green-600" : ""}
              >
                <CheckCircle className={`w-4 h-4 mr-2 ${concluida ? 'text-green-600' : ''}`} />
                {marcandoConcluida 
                  ? "Atualizando..." 
                  : concluida 
                    ? "Marcar como não concluída" 
                    : "Marcar como concluída"
                }
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${concluida ? 'bg-green-600' : 'bg-gray-300'}`} />
              <span className="text-sm text-muted-foreground">
                {concluida ? "Aula concluída" : "Aula pendente"}
              </span>
              {aula.duracao && (
                <span className="text-sm text-muted-foreground">
                  • Duração: {Math.floor(aula.duracao / 60)}:{(aula.duracao % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}