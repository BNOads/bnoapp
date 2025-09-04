import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface POPData {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  autor: string;
  icone: string;
  updated_at: string;
  categoria_documento: string;
  tags: string[];
}

export default function POPPublico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [popData, setPOPData] = useState<POPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      carregarPOP();
    }
  }, [id]);

  const carregarPOP = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('id', id)
        .eq('categoria_documento', 'pop')
        .eq('link_publico_ativo', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setError('POP não encontrado ou não está disponível publicamente');
        return;
      }

      setPOPData(data);
    } catch (error: any) {
      console.error('Erro ao carregar POP:', error);
      setError('Erro ao carregar o POP. Tente novamente mais tarde.');
      toast({
        title: "Erro",
        description: "Erro ao carregar o POP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-foreground mb-6 mt-8 first:mt-0">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold text-foreground mb-4 mt-6">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold text-foreground mb-3 mt-4">{line.substring(4)}</h3>;
      } else if (line.startsWith('#### ')) {
        return <h4 key={index} className="text-lg font-medium text-foreground mb-2 mt-3">{line.substring(5)}</h4>;
      } else if (line.startsWith('- ')) {
        return <li key={index} className="text-foreground ml-4 mb-1 list-disc">{line.substring(2)}</li>;
      } else if (line.match(/^\d+\./)) {
        return <li key={index} className="text-foreground ml-4 mb-1 list-decimal">{line.substring(line.indexOf('.') + 1)}</li>;
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-semibold text-foreground mb-2">{line.replace(/\*\*/g, '')}</p>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="text-foreground mb-2 leading-relaxed">{line}</p>;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando POP...</p>
        </div>
      </div>
    );
  }

  if (error || !popData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">POP não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'O POP solicitado não foi encontrado ou não está disponível publicamente.'}
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Público */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">BNOads</h1>
                <p className="text-sm text-muted-foreground">Procedimento Operacional Padrão</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.open('https://bnoapp.lovable.app', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Acessar Sistema
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Document Info */}
        <Card className="p-6 mt-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <span className="text-2xl">{popData.icone}</span>
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {popData.titulo}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(popData.updated_at).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {popData.autor}
                </div>
                <Badge variant="outline">
                  {popData.tipo}
                </Badge>
              </div>

              {popData.tags && popData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {popData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Document Content */}
        <Card className="p-8">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {renderContent(popData.conteudo)}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8 border-t">
          <p>© 2025 BNOads - Sistema interno de procedimentos</p>
          <p className="mt-2">Este documento é parte dos procedimentos operacionais padrão da BNOads</p>
        </div>
      </div>
    </div>
  );
}