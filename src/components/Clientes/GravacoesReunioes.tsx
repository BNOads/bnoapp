import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Calendar, Clock, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink: string;
  thumbnailLink?: string;
}

interface GravacoesReunioesProps {
  clienteId: string;
}

export const GravacoesReunioes = ({ clienteId }: GravacoesReunioesProps) => {
  const [gravacoes, setGravacoes] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
    loadClienteData();
  }, [clienteId]);

  useEffect(() => {
    if (driveFolderId) {
      loadGravacoesDrive();
    }
  }, [driveFolderId]);

  const loadClienteData = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('drive_folder_id')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      setDriveFolderId(data?.drive_folder_id || null);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    }
  };

  const loadGravacoesDrive = async () => {
    if (!driveFolderId) return;
    
    try {
      setLoading(true);
      
      // Para demonstração, vamos simular algumas gravações
      // Em produção, isso seria integrado com a API do Google Drive
      const mockGravacoes = [
        {
          id: '1',
          name: 'Reunião de Kickoff - Cliente ABC.mp4',
          mimeType: 'video/mp4',
          modifiedTime: new Date().toISOString(),
          size: '125000000',
          webViewLink: driveFolderId,
          thumbnailLink: undefined
        },
        {
          id: '2', 
          name: 'Apresentação de Resultados - Semana 1.mp4',
          mimeType: 'video/mp4',
          modifiedTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          size: '89000000',
          webViewLink: driveFolderId,
          thumbnailLink: undefined
        }
      ];
      
      setGravacoes(mockGravacoes);
    } catch (error) {
      console.error('Erro ao carregar gravações do Drive:', error);
      setGravacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '';
    
    const size = parseInt(bytes);
    const mb = size / (1024 * 1024);
    
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Nova Gravação
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!driveFolderId ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Pasta do Google Drive não configurada</p>
            <p className="text-sm">Configure a pasta do Drive para visualizar as gravações</p>
          </div>
        ) : gravacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma gravação encontrada</p>
            <p className="text-sm">As gravações da pasta do Drive aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gravacoes.map((arquivo) => (
              <div key={arquivo.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-16 bg-muted rounded-lg flex items-center justify-center">
                    {arquivo.thumbnailLink ? (
                      <img 
                        src={arquivo.thumbnailLink} 
                        alt={arquivo.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Play className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{arquivo.name}</h4>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(arquivo.modifiedTime)}
                      </div>
                      {arquivo.size && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatFileSize(arquivo.size)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button size="sm" variant="outline" asChild>
                    <a href={arquivo.webViewLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Assistir
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};