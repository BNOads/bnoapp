import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calendar, CheckCircle, Clock, Play, ExternalLink, MessageSquare, Lock, Send } from 'lucide-react';
import { PDIExternalLinks } from '@/components/PDI/PDIExternalLinks';
import { useAuth } from '@/components/Auth/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Aula {
  id: string;
  aula_id: string;
  titulo: string;
  descricao: string;
  duracao: number;
  treinamento: { titulo: string };
  concluida: boolean;
  data_conclusao: string | null;
}

interface AulaExterna {
  titulo: string;
  descricao: string;
  url: string;
  duracao: number;
  concluida?: boolean;
}

interface Acesso {
  id: string;
  nome_acesso: string;
  categoria: string;
  link_acesso: string | null;
}

interface PDI {
  id: string;
  titulo: string;
  descricao: string;
  data_limite: string;
  status: string;
  aulas: Aula[];
  aulas_externas?: AulaExterna[];
  links_externos?: any[];
  acessos?: Acesso[];
}

interface Comentario {
  id: string;
  user_id: string;
  comentario: string;
  created_at: string;
  profiles?: {
    nome: string;
    avatar_url: string | null;
  };
}

export default function PDIDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [pdi, setPdi] = useState<PDI | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');

  useEffect(() => {
    carregarPDI();
  }, [id]);

  const carregarPDI = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Carregar PDI
      const { data: pdiData, error: pdiError } = await supabase
        .from('pdis')
        .select('*')
        .eq('id', id)
        .single();

      if (pdiError) throw pdiError;

      // Carregar aulas do PDI
      const { data: aulasData, error: aulasError } = await supabase
        .from('pdi_aulas')
        .select(`
          id,
          aula_id,
          concluida,
          data_conclusao,
          aulas!inner (
            id,
            titulo,
            descricao,
            duracao,
            treinamentos!inner (titulo)
          )
        `)
        .eq('pdi_id', id);

      if (aulasError) throw aulasError;

      // Carregar acessos se houver IDs
      let acessosData: Acesso[] = [];
      if (pdiData.acessos_ids && pdiData.acessos_ids.length > 0) {
        const { data, error } = await supabase
          .from('acessos_logins')
          .select('id, nome_acesso, categoria, link_acesso')
          .in('id', pdiData.acessos_ids);
        
        if (!error && data) {
          acessosData = data;
        }
      }

      const pdiCompleto: PDI = {
        id: pdiData.id,
        titulo: pdiData.titulo,
        descricao: pdiData.descricao,
        data_limite: pdiData.data_limite,
        status: pdiData.status,
        aulas: aulasData?.map((a: any) => ({
          id: a.id,
          aula_id: a.aula_id,
          titulo: a.aulas.titulo,
          descricao: a.aulas.descricao,
          duracao: a.aulas.duracao,
          treinamento: { titulo: a.aulas.treinamentos.titulo },
          concluida: a.concluida,
          data_conclusao: a.data_conclusao
        })) || [],
        aulas_externas: Array.isArray(pdiData.aulas_externas) ? pdiData.aulas_externas as unknown as AulaExterna[] : [],
        links_externos: Array.isArray(pdiData.links_externos) ? pdiData.links_externos : [],
        acessos: acessosData
      };

      setPdi(pdiCompleto);
      await carregarComentarios();
    } catch (error) {
      console.error('Erro ao carregar PDI:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar PDI",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarComentarios = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('pdi_comentarios')
        .select('*')
        .eq('pdi_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const comentariosComPerfil = await Promise.all((data || []).map(async (c) => {
        const { data: perfil } = await supabase
          .from('profiles')
          .select('nome, avatar_url')
          .eq('user_id', c.user_id)
          .single();
        
        return { ...c, profiles: perfil };
      }));
      
      setComentarios(comentariosComPerfil as any);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    }
  };

  const adicionarComentario = async () => {
    if (!id || !novoComentario.trim()) return;

    try {
      const { error } = await supabase
        .from('pdi_comentarios')
        .insert({
          pdi_id: id,
          user_id: user?.id,
          comentario: novoComentario.trim()
        });

      if (error) throw error;

      setNovoComentario('');
      toast({
        title: "Sucesso",
        description: "Comentário adicionado"
      });
      
      await carregarComentarios();
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive"
      });
    }
  };

  const marcarAulaConcluida = async (aulaId: string) => {
    setLoadingAction(aulaId);
    try {
      const { error } = await supabase
        .from('pdi_aulas')
        .update({ concluida: true, data_conclusao: new Date().toISOString() })
        .eq('id', aulaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aula marcada como concluída!"
      });

      await carregarPDI();
    } catch (error) {
      console.error('Erro ao marcar aula:', error);
      toast({
        title: "Erro",
        description: "Falha ao marcar aula como concluída",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const marcarAulaExternaConcluida = async (aulaIndex: number) => {
    if (!pdi || !id) return;

    try {
      setLoadingAction(`externa-${aulaIndex}`);
      
      const aulasAtualizadas = [...(pdi.aulas_externas || [])];
      aulasAtualizadas[aulaIndex] = {
        ...aulasAtualizadas[aulaIndex],
        concluida: !aulasAtualizadas[aulaIndex].concluida
      };

      const { error } = await supabase
        .from('pdis')
        .update({ aulas_externas: aulasAtualizadas as any })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aula externa atualizada"
      });

      await carregarPDI();
    } catch (error) {
      console.error('Erro ao marcar aula externa:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar aula externa",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const verAula = (aulaId: string) => {
    navigate(`/treinamentos/aula/${aulaId}`);
  };

  const concluirPDI = async () => {
    if (!id) return;

    setLoadingAction('pdi');
    try {
      const { error } = await supabase
        .from('pdis')
        .update({ status: 'concluido' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "PDI concluído! Parabéns!"
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
  const aulasExternasCompletas = pdi.aulas_externas?.filter(a => a.concluida).length || 0;
  const totalAulas = pdi.aulas.length + (pdi.aulas_externas?.length || 0);
  const totalCompletas = aulasCompletas + aulasExternasCompletas;
  const progresso = totalAulas > 0 ? (totalCompletas / totalAulas) * 100 : 0;
  
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
              <span>{totalCompletas}/{totalAulas} módulos concluídos</span>
            </div>
            <Progress value={progresso} className="h-3" />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Prazo: {dataLimite.toLocaleDateString('pt-BR')}
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
                <span className="font-medium">Parabéns! Você concluiu todas as atividades do PDI!</span>
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

      {/* Tabs para Conteúdo e Comentários */}
      <Tabs defaultValue="conteudo" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="comentarios">
            <MessageSquare className="h-4 w-4 mr-2" />
            Comentários ({comentarios.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="space-y-6 mt-6">
          {/* Acessos Necessários */}
          {pdi.acessos && pdi.acessos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Acessos Necessários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pdi.acessos.map((acesso) => (
                  <div
                    key={acesso.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium">{acesso.nome_acesso}</p>
                      <p className="text-sm text-muted-foreground">{acesso.categoria}</p>
                    </div>
                    {acesso.link_acesso && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(acesso.link_acesso || '', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Acessar
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Aulas Internas */}
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

              {/* Aulas Externas */}
              {pdi.aulas_externas && pdi.aulas_externas.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mt-6">Aulas Externas</h3>
                  {pdi.aulas_externas.map((aulaExt, index) => (
                    <Card key={`externa-${index}`} className={`${aulaExt.concluida ? 'bg-green-50 border-green-200' : 'border-orange-200 bg-orange-50'}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4 text-orange-600" />
                              <CardTitle className="text-lg">{aulaExt.titulo}</CardTitle>
                              {aulaExt.concluida && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <CardDescription className="text-sm">
                              Aula Externa
                            </CardDescription>
                            {aulaExt.descricao && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {aulaExt.descricao}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {aulaExt.duracao}min
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {aulaExt.concluida ? (
                              <span className="text-sm text-green-600 font-medium">
                                Concluída
                              </span>
                            ) : (
                              <span className="text-sm text-orange-600 font-medium">
                                Link externo
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={() => window.open(aulaExt.url, '_blank')}
                              variant="outline"
                              size="sm"
                              className="border-orange-200 text-orange-700 hover:bg-orange-100"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir Link
                            </Button>
                            
                            <Button 
                              onClick={() => marcarAulaExternaConcluida(index)}
                              disabled={loadingAction === `externa-${index}`}
                              size="sm"
                              variant={aulaExt.concluida ? "outline" : "default"}
                            >
                              {loadingAction === `externa-${index}` ? "..." : aulaExt.concluida ? "Desmarcar" : "Marcar Concluída"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
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
        </TabsContent>

        <TabsContent value="comentarios" className="space-y-4 mt-6">
          {/* Adicionar Comentário */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Comentário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Escreva seu comentário..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button 
                  onClick={adicionarComentario}
                  disabled={!novoComentario.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Comentários */}
          <div className="space-y-3">
            {comentarios.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </CardContent>
              </Card>
            ) : (
              comentarios.map((comentario) => (
                <Card key={comentario.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {comentario.profiles?.nome?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{comentario.profiles?.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comentario.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{comentario.comentario}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
