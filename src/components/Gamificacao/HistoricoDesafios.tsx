import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DesafioHistorico {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

export const HistoricoDesafios = () => {
  const [desafios, setDesafios] = useState<DesafioHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadHistorico();
  }, []);

  const loadHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from('gamificacao_desafios')
        .select('*')
        .order('data_fim', { ascending: false });

      if (error) throw error;
      setDesafios(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de desafios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Histórico de Desafios
        </CardTitle>
      </CardHeader>
      <CardContent>
        {desafios.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum desafio encontrado no histórico.
          </p>
        ) : (
          <div className="space-y-3">
            {desafios.map((desafio) => (
              <div
                key={desafio.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{desafio.titulo}</p>
                    {desafio.ativo && (
                      <Badge variant="default" className="text-xs">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {desafio.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(desafio.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(new Date(desafio.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Ver detalhes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
