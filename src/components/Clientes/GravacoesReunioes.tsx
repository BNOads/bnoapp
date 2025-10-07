import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Calendar, Clock, Plus, ExternalLink, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NovaGravacaoModal } from "./NovaGravacaoModal";
import { ImportarAnotacoesGemini } from "../Gravacoes/ImportarAnotacoesGemini";

interface Gravacao {
  id: string;
  titulo: string;
  descricao?: string;
  url_gravacao: string;
  duracao?: number;
  tags?: string[];
  created_at: string;
  visualizacoes: number;
  thumbnail_url?: string;
}

interface GravacoesReunioesProps {
  clienteId: string;
  isPublicView?: boolean;
}

export const GravacoesReunioes = ({ clienteId, isPublicView = false }: GravacoesReunioesProps) => {
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
      if (!isPublicView) {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
    loadGravacoes();
  }, [clienteId, isPublicView]);

  const loadGravacoes = async () => {
    try {
      setLoading(true);
      console.log('🎥 Carregando gravações para cliente:', clienteId);
      
      let clientInstance = supabase;
      
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }
      
      const { data, error } = await clientInstance
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

      // Verificar se há configuração de Drive para o cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('pasta_drive_url, nome')
        .eq('id', clienteId)
        .single();

      if (clienteError) {
        throw new Error('Erro ao buscar dados do cliente');
      }

      if (!clienteData?.pasta_drive_url) {
        throw new Error('Cliente não possui pasta do Google Drive configurada');
      }

      const { data, error } = await supabase.functions.invoke('sync-meeting-recordings', {
        body: {
          clienteId,
          clienteName: clienteData.nome
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Sincronização concluída",
          description: data.message || `${data.processedCount || 0} gravações processadas`,
        });
        
        // Recarregar gravações após sincronização
        loadGravacoes();
      } else {
        throw new Error(data?.error || 'Erro desconhecido na sincronização');
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
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Video className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">Gravações de Vídeo</span>
          </CardTitle>
          {isAuthenticated && (
            <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSyncRecordings}
                disabled={syncing}
                className="flex-1 xs:flex-none text-xs sm:text-sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${syncing ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {syncing ? 'Sincronizando...' : 'Sincronizar Drive'}
                </span>
              </Button>
              <ImportarAnotacoesGemini />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setModalOpen(true)}
                className="flex-1 xs:flex-none text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="truncate">Nova Gravação</span>
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
          <div className="space-y-3 sm:space-y-4">
            {displayGravacoes.map((gravacao) => (
              <div key={gravacao.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Thumbnail - Responsivo */}
                  <div className="relative w-full sm:w-20 lg:w-24 h-12 sm:h-14 lg:h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {gravacao.thumbnail_url ? (
                      <>
                        <img 
                          src={gravacao.thumbnail_url} 
                          alt={gravacao.titulo}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback para ícone se a imagem falhar ao carregar
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 items-center justify-center hidden">
                          <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white drop-shadow-lg" />
                        </div>
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white drop-shadow-lg" />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-muted">
                        <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-2 text-sm sm:text-base line-clamp-2 leading-tight">
                      {gravacao.titulo}
                    </h4>
                    
                    {gravacao.descricao && (
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                        {gravacao.descricao}
                      </p>
                    )}
                    
                    {/* Info responsiva - Stack em mobile */}
                    <div className="flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{formatDate(gravacao.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:gap-4">
                        {gravacao.duracao && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span>{formatDuration(gravacao.duracao)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Play className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{gravacao.visualizacoes} views</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags responsivas */}
                    {gravacao.tags && gravacao.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {gravacao.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                        {gravacao.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            +{gravacao.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Botões responsivos */}
                  <div className="flex flex-row sm:flex-col gap-2 sm:gap-1 w-full sm:w-auto">
                    <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-none text-xs sm:text-sm">
                      <a href={gravacao.url_gravacao} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Assistir</span>
                        <span className="xs:hidden">Ver</span>
                      </a>
                    </Button>
                    {isAuthenticated && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteGravacao(gravacao.id)}
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive flex-shrink-0 sm:px-2"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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