import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Brain, Calendar, Users, CheckSquare, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TranscricaoResult {
  id: string;
  tipo: string;
  titulo: string;
  cliente_nome: string;
  data_reuniao: string;
  resumo_ia?: string;
  topicos_principais?: string[];
  decisoes_tomadas?: Array<{
    decisao: string;
    responsavel?: string;
    contexto?: string;
  }>;
  pendencias?: Array<{
    tarefa: string;
    responsavel?: string;
    prazo?: string;
    prioridade?: string;
  }>;
  relevancia: number;
  url_gravacao?: string;
}

const MemoriaTranscricoes: React.FC = () => {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<TranscricaoResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const { toast } = useToast();

  const buscarTranscricoes = async () => {
    if (!query.trim()) {
      toast({
        title: "Digite uma consulta",
        description: "Insira uma pergunta para buscar nas transcrições.",
        variant: "destructive",
      });
      return;
    }

    setBuscando(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Buscando transcrições para:', query);

      const { data, error } = await supabase.rpc('buscar_transcricoes_reunioes', {
        _user_id: userData.user.id,
        _query: query,
        _limit: 10
      });

      if (error) {
        console.error('Erro ao buscar transcrições:', error);
        throw new Error(error.message);
      }

      console.log('Resultados encontrados:', data);
      const resultadosTyped = (data || []) as TranscricaoResult[];
      setResultados(resultadosTyped);

      if (!data || resultadosTyped.length === 0) {
        toast({
          title: "Nenhum resultado",
          description: "Não foram encontradas transcrições relevantes para sua consulta.",
        });
      } else {
        toast({
          title: "Busca concluída",
          description: `Encontradas ${resultadosTyped.length} transcrições relevantes.`,
        });
      }

    } catch (error) {
      console.error('Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setBuscando(false);
    }
  };

  const exemploQueries = [
    "Resumo da última reunião da Koira",
    "O que prometemos na reunião da Mateco?",
    "Pendências do cliente GISLENEISQUIERDO",
    "Decisões sobre campanha de remarketing",
    "Quais as próximas etapas depois da reunião?"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Memória de Transcrições - Assistente IA
          </CardTitle>
          <CardDescription>
            Busque e explore transcrições de reuniões com IA semântica. 
            O assistente compreende contexto e extrai informações estruturadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: 'Resumo da última reunião da Koira' ou 'O que decidimos sobre orçamento?'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && buscarTranscricoes()}
              className="flex-1"
            />
            <Button 
              onClick={buscarTranscricoes} 
              disabled={buscando}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              {buscando ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Exemplos de consultas:</p>
            <div className="flex flex-wrap gap-2">
              {exemploQueries.map((exemplo, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setQuery(exemplo)}
                >
                  {exemplo}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Resultados Encontrados ({resultados.length})
          </h3>
          
          {resultados.map((resultado, index) => (
            <Card key={resultado.id} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {resultado.titulo}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {resultado.cliente_nome}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(resultado.data_reuniao).toLocaleDateString('pt-BR')}
                      </span>
                      <Badge variant="secondary">
                        {(resultado.relevancia * 100).toFixed(0)}% relevante
                      </Badge>
                    </CardDescription>
                  </div>
                  {resultado.url_gravacao && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(resultado.url_gravacao, '_blank')}
                    >
                      Ver Gravação
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {resultado.resumo_ia && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4" />
                      Resumo IA
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {resultado.resumo_ia}
                    </p>
                  </div>
                )}

                {resultado.topicos_principais && resultado.topicos_principais.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tópicos Principais</h4>
                    <div className="flex flex-wrap gap-2">
                      {resultado.topicos_principais.map((topico, idx) => (
                        <Badge key={idx} variant="outline">
                          {topico}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {resultado.decisoes_tomadas && resultado.decisoes_tomadas.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <CheckSquare className="h-4 w-4" />
                      Decisões Tomadas
                    </h4>
                    <ul className="space-y-2">
                      {resultado.decisoes_tomadas.map((decisao, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                          <div>
                            <span>{decisao.decisao}</span>
                            {decisao.responsavel && (
                              <span className="text-muted-foreground ml-2">
                                ({decisao.responsavel})
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {resultado.pendencias && resultado.pendencias.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Pendências e Tarefas</h4>
                    <ul className="space-y-2">
                      {resultado.pendencias.map((pendencia, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                          <div>
                            <span>{pendencia.tarefa}</span>
                            <div className="flex gap-2 mt-1">
                              {pendencia.responsavel && (
                                <Badge variant="outline" className="text-xs">
                                  {pendencia.responsavel}
                                </Badge>
                              )}
                              {pendencia.prazo && (
                                <Badge variant="outline" className="text-xs">
                                  {pendencia.prazo}
                                </Badge>
                              )}
                              {pendencia.prioridade && (
                                <Badge 
                                  variant={pendencia.prioridade === 'alta' ? 'destructive' : 'secondary'} 
                                  className="text-xs"
                                >
                                  {pendencia.prioridade}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoriaTranscricoes;