import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Calendar, Clock, Plus, ExternalLink, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const itemsPerPage = 3;
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
      console.log('🎥 Carregando gravações para cliente:', clienteId);
      
      const { data, error } = await supabase
        .from('gravacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('🎥 Gravações encontradas no banco:', data);

      // Filtrar apenas arquivos de vídeo baseado na URL ou tipo
      const videoGravacoes = (data || []).filter((gravacao) => {
        const url = gravacao.url_gravacao?.toLowerCase() || '';
        
        // Verificar se é um arquivo de vídeo comum
        const isVideoFile = url.includes('.mp4') || 
                           url.includes('.mov') || 
                           url.includes('.avi') || 
                           url.includes('.mkv') || 
                           url.includes('.webm') || 
                           url.includes('.flv');
        
        // Verificar se é um link de plataforma de vídeo
        const isVideoLink = url.includes('youtube.com') || 
                           url.includes('youtu.be') || 
                           url.includes('vimeo.com') || 
                           url.includes('drive.google.com') ||
                           url.includes('meet.google.com');
        
        // Para arquivos do Google Drive, verificar se contém "recording" no nome
        const isGoogleDriveVideo = url.includes('drive.google.com') && 
                                  (gravacao.titulo?.toLowerCase().includes('recording') || 
                                   gravacao.titulo?.toLowerCase().includes('gravação') ||
                                   gravacao.descricao?.toLowerCase().includes('recording'));
        
        const isVideo = isVideoFile || isVideoLink || isGoogleDriveVideo;
        
        console.log(`🎥 Analisando gravação "${gravacao.titulo}":`, {
          url: url.substring(0, 50) + '...',
          isVideoFile,
          isVideoLink, 
          isGoogleDriveVideo,
          isVideo
        });
        
        return isVideo;
      });

      console.log('🎥 Gravações de vídeo filtradas:', videoGravacoes);
      setGravacoes(videoGravacoes);
    } catch (error) {
      console.error('❌ Erro ao carregar gravações:', error);
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

  const handleSyncRecordings = async () => {
    try {
      setSyncing(true);
      
      toast({
        title: "Sincronizando gravações",
        description: "Buscando gravações do Google Drive...",
      });

      const { data, error } = await supabase.functions.invoke('sync-meeting-recordings');

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Sincronização concluída",
          description: data.message,
        });
        
        // Recarregar gravações após sincronização
        loadGravacoes();
      } else {
        throw new Error(data.error || 'Erro desconhecido na sincronização');
      }
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar gravações do Google Drive",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando gravações...</div>;
  }

  // Calcular gravações para exibir
  const totalGravacoes = gravacoes.length;
  const displayGravacoes = showAll ? gravacoes : gravacoes.slice(0, itemsPerPage);
  const remainingCount = totalGravacoes - itemsPerPage;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Gravações de Vídeo
          </CardTitle>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSyncRecordings}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Drive'}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Gravação
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {gravacoes.length === 0 && !loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma gravação de vídeo encontrada</p>
            <p className="text-sm">As gravações de vídeo das reuniões aparecerão aqui</p>
            {isAuthenticated && (
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeira gravação de vídeo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayGravacoes.map((gravacao) => (
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
            
            {totalGravacoes > itemsPerPage && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm"
                >
                  {showAll ? (
                    <>Mostrar apenas 3 recentes</>
                  ) : (
                    <>Ver todas ({remainingCount} gravações a mais)</>
                  )}
                </Button>
              </div>
            )}
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