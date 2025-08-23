import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Calendar, Clock, Plus, ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NovaGravacaoModal } from "./NovaGravacaoModal";

interface Gravacao {
  id: string;
  titulo: string;
  descricao?: string;
  url_gravacao: string;
  duracao?: number;
  tags?: string[];
  created_at: string;
  visualizacoes: number;
}

interface GravacoesReunioesProps {
  clienteId: string;
}

export const GravacoesReunioes = ({ clienteId }: GravacoesReunioesProps) => {
  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
    loadGravacoes();
  }, [clienteId]);

  const loadGravacoes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gravacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setGravacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar gravações:', error);
      setGravacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGravacao = async (gravacaoId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta gravação?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('gravacoes')
        .delete()
        .eq('id', gravacaoId);

      if (error) {
        throw error;
      }

      toast({
        title: "Gravação excluída",
        description: "A gravação foi excluída com sucesso.",
      });

      loadGravacoes();
    } catch (error: any) {
      console.error('Erro ao excluir gravação:', error);
      toast({
        title: "Erro ao excluir gravação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-4">Carregando gravações...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Gravações de Reuniões
          </CardTitle>
          {isAuthenticated && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Gravação
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {gravacoes.length === 0 && !loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma gravação encontrada</p>
            <p className="text-sm">As gravações de reuniões aparecerão aqui</p>
            {isAuthenticated && (
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeira gravação
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {gravacoes.map((gravacao) => (
              <div key={gravacao.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Play className="h-6 w-6 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{gravacao.titulo}</h4>
                    
                    {gravacao.descricao && (
                      <p className="text-sm text-muted-foreground mb-2">{gravacao.descricao}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(gravacao.created_at)}
                      </div>
                      {gravacao.duracao && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(gravacao.duracao)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Play className="h-4 w-4" />
                        {gravacao.visualizacoes} visualizações
                      </div>
                    </div>

                    {gravacao.tags && gravacao.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {gravacao.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={gravacao.url_gravacao} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Assistir
                      </a>
                    </Button>
                    {isAuthenticated && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteGravacao(gravacao.id)}
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal */}
      <NovaGravacaoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clienteId={clienteId}
        onSuccess={loadGravacoes}
      />
    </Card>
  );
};