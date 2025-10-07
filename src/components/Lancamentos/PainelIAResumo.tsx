import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ResumoGeral {
  resumo: string;
  stats: {
    totalAtivos: number;
    porStatus: {
      em_captacao: number;
      cpl: number;
      remarketing: number;
      pausado: number;
    };
    urgentes: number;
  };
}

export const PainelIAResumo: React.FC = () => {
  const [resumo, setResumo] = useState<ResumoGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    carregarResumo();
  }, []);

  const carregarResumo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('lancamentos-ai-resumo-geral');
      
      if (error) {
        console.error('Erro ao carregar resumo geral:', error);
        toast({
          title: "Erro ao carregar resumo IA",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setResumo(data);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Gerando resumo inteligente...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!resumo) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Resumo IA do Dia
          <Badge variant="secondary" className="ml-auto">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-lg font-bold">{resumo.stats.totalAtivos}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Captação</p>
              <p className="text-lg font-bold">{resumo.stats.porStatus.em_captacao}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Remarketing</p>
              <p className="text-lg font-bold">{resumo.stats.porStatus.remarketing}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Urgentes</p>
              <p className="text-lg font-bold">{resumo.stats.urgentes}</p>
            </div>
          </div>
        </div>

        {/* Resumo IA */}
        <div className="prose prose-sm max-w-none">
          <div className="text-sm whitespace-pre-line leading-relaxed">
            {resumo.resumo}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};