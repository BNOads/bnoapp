import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Calendar, Clock, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Gravacao {
  id: string;
  titulo: string;
  descricao: string;
  url_gravacao: string;
  thumbnail_url: string;
  duracao: number;
  created_at: string;
}

interface GravacoesReunioesProps {
  clienteId: string;
}

export const GravacoesReunioes = ({ clienteId }: GravacoesReunioesProps) => {
  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadGravacoes();
  }, [clienteId]);

  const loadGravacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('gravacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGravacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar gravações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar gravações das reuniões",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
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
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nova Gravação
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {gravacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma gravação encontrada</p>
            <p className="text-sm">As gravações das reuniões aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gravacoes.map((gravacao) => (
              <div key={gravacao.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-16 bg-muted rounded-lg flex items-center justify-center">
                    {gravacao.thumbnail_url ? (
                      <img 
                        src={gravacao.thumbnail_url} 
                        alt={gravacao.titulo}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Play className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{gravacao.titulo}</h4>
                    {gravacao.descricao && (
                      <p className="text-sm text-muted-foreground mb-2">{gravacao.descricao}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(gravacao.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      {gravacao.duracao && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(gravacao.duracao)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button size="sm" variant="outline" asChild>
                    <a href={gravacao.url_gravacao} target="_blank" rel="noopener noreferrer">
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