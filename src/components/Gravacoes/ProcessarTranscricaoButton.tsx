import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Loader2 } from 'lucide-react';

interface ProcessarTranscricaoButtonProps {
  transcricaoId: string;
  tipo: 'gravacao' | 'reuniao';
  transcricao: string;
  titulo?: string;
  onProcessado?: () => void;
}

const ProcessarTranscricaoButton: React.FC<ProcessarTranscricaoButtonProps> = ({
  transcricaoId,
  tipo,
  transcricao,
  titulo,
  onProcessado
}) => {
  const [processando, setProcessando] = useState(false);
  const { toast } = useToast();

  const processarTranscricao = async () => {
    if (!transcricao || transcricao.length < 100) {
      toast({
        title: "Transcrição muito curta",
        description: "A transcrição precisa ter pelo menos 100 caracteres para ser analisada.",
        variant: "destructive",
      });
      return;
    }

    setProcessando(true);

    try {
      console.log(`Processando ${tipo} ID: ${transcricaoId}`);

      const { data, error } = await supabase.functions.invoke('analisar-transcricao', {
        body: {
          transcricao_id: transcricaoId,
          tipo: tipo,
          transcricao: transcricao,
          titulo: titulo
        }
      });

      if (error) {
        console.error('Erro ao processar transcrição:', error);
        throw new Error(error.message || 'Erro ao processar transcrição');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido ao processar transcrição');
      }

      console.log('Transcrição processada com sucesso:', data);

      toast({
        title: "Análise concluída!",
        description: `Transcrição analisada com IA. ${data.embedding_gerado ? 'Busca semântica habilitada.' : 'Dados estruturados extraídos.'}`,
        duration: 5000,
      });

      // Callback para atualizar a interface
      if (onProcessado) {
        onProcessado();
      }

    } catch (error) {
      console.error('Erro ao processar transcrição:', error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : 'Erro desconhecido ao processar transcrição',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Button
      onClick={processarTranscricao}
      disabled={processando || !transcricao}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {processando ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Brain className="h-4 w-4" />
      )}
      {processando ? 'Analisando...' : 'Analisar com IA'}
    </Button>
  );
};

export default ProcessarTranscricaoButton;