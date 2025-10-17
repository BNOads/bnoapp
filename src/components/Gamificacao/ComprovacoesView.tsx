import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { EditarPontosModal } from "./EditarPontosModal";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Acao {
  id: string;
  descricao: string;
  comprovacao: string;
  pontos: number;
  data_registro: string;
  aprovado: boolean;
  colaborador: {
    nome: string;
    avatar_url: string;
  };
}

export const ComprovacoesView = () => {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [desafioAtual, setDesafioAtual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editarAcao, setEditarAcao] = useState<{ id: string; pontos: number } | null>(null);
  const { toast } = useToast();
  const { isAdmin, isMaster } = useUserPermissions();

  useEffect(() => {
    loadAcoes();
  }, []);

  const loadAcoes = async () => {
    try {
      // Buscar desafio ativo
      const { data: desafio, error: desafioError } = await supabase
        .from('gamificacao_desafios')
        .select('id, titulo')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (desafioError) throw desafioError;

      if (!desafio) {
        setLoading(false);
        return;
      }

      setDesafioAtual(desafio);

      // Buscar todas as ações do desafio
      const { data: acoesData, error: acoesError } = await supabase
        .from('gamificacao_acoes')
        .select('*')
        .eq('desafio_id', desafio.id)
        .order('data_registro', { ascending: false });

      if (acoesError) throw acoesError;

      if (!acoesData || acoesData.length === 0) {
        setAcoes([]);
        setLoading(false);
        return;
      }

      // Buscar dados dos colaboradores
      const colaboradorIds = acoesData.map(a => a.colaborador_id);
      const { data: colaboradores, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select('id, nome, avatar_url')
        .in('id', colaboradorIds);

      if (colaboradoresError) throw colaboradoresError;

      // Combinar os dados
      const acoesCompletas = acoesData.map(a => {
        const colaborador = colaboradores?.find(c => c.id === a.colaborador_id);
        return {
          ...a,
          colaborador: {
            nome: colaborador?.nome || 'Colaborador',
            avatar_url: colaborador?.avatar_url || ''
          }
        };
      });

      setAcoes(acoesCompletas);
    } catch (error) {
      console.error('Erro ao carregar ações:', error);
      toast({
        title: "Erro ao carregar comprovações",
        description: "Não foi possível carregar as comprovações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!desafioAtual) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhum desafio ativo no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Comprovações - {desafioAtual.titulo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {acoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma ação registrada ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {acoes.map((acao) => (
                <Card key={acao.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={acao.colaborador?.avatar_url} />
                          <AvatarFallback>
                            {acao.colaborador?.nome?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{acao.colaborador?.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(acao.data_registro), "dd/MM/yyyy 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={acao.aprovado ? "default" : "secondary"}>
                                {acao.pontos} pts
                              </Badge>
                              {(isAdmin || isMaster) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditarAcao({ id: acao.id, pontos: acao.pontos })}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm">{acao.descricao}</p>
                          </div>

                          {acao.comprovacao && (
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Comprovação:
                              </p>
                              {isImageUrl(acao.comprovacao) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedImage(acao.comprovacao)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver Imagem
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(acao.comprovacao, '_blank')}
                                  className="gap-2"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Abrir Link
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para visualizar imagem */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comprovação</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Comprovação" 
                className="w-full h-auto rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                  toast({
                    title: "Erro ao carregar imagem",
                    description: "Não foi possível carregar a imagem.",
                    variant: "destructive",
                  });
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para editar pontos */}
      {editarAcao && (
        <EditarPontosModal
          open={!!editarAcao}
          onOpenChange={() => setEditarAcao(null)}
          acaoId={editarAcao.id}
          pontosAtuais={editarAcao.pontos}
          onSuccess={loadAcoes}
        />
      )}
    </>
  );
};
