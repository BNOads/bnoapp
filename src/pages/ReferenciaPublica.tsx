import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Share2, 
  ExternalLink,
  Calendar,
  Copy,
  Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotionEditor } from "@/components/References/NotionEditor/NotionEditor";
import { EditorBlock } from "@/components/References/NotionEditor/types";

interface ReferenciaCreativo {
  id: string;
  titulo: string;
  categoria: string;
  conteudo: any;
  link_publico: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  links_externos: any;
  versao_editor?: number;
}

export const ReferenciaPublica = () => {
  const { id } = useParams<{ id: string }>();
  const [referencia, setReferencia] = useState<ReferenciaCreativo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      carregarReferencia();
    }
  }, [id]);

  const carregarReferencia = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('referencias_criativos')
        .select('*')
        .eq('id', id)
        .eq('ativo', true)
        .single();

      if (error) throw error;

      setReferencia(data as ReferenciaCreativo);

      // Converter conteúdo para blocos do editor se for versão 2+
      if ((data.versao_editor || 1) >= 2 && data.conteudo && Array.isArray(data.conteudo)) {
        const convertedBlocks: EditorBlock[] = data.conteudo.map((item: any, index: number) => ({
          id: item.id || `block-${index}`,
          type: item.tipo || 'text',
          content: {
            text: item.conteudo,
            url: item.url,
            caption: item.descricao,
            title: item.titulo,
            level: item.level,
            checked: item.checked
          },
          order: index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        setEditorBlocks(convertedBlocks);
      }
      
    } catch (error) {
      console.error('Erro ao carregar referência:', error);
    } finally {
      setLoading(false);
    }
  };

  const copiarLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado",
      description: "Link da referência copiado para a área de transferência!",
    });
  };

  const renderizarBlocoClassico = (bloco: any) => {
    switch (bloco.tipo) {
      case 'texto':
        return (
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">
              {bloco.conteudo}
            </p>
          </div>
        );

      case 'imagem':
        return (
          <div className="space-y-2">
            <img 
              src={bloco.url} 
              alt={bloco.descricao || 'Imagem'} 
              className="w-full max-w-2xl rounded-lg shadow-sm"
            />
            {bloco.descricao && (
              <p className="text-sm text-muted-foreground italic">
                {bloco.descricao}
              </p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            <video 
              src={bloco.url} 
              controls 
              className="w-full max-w-2xl rounded-lg shadow-sm"
            >
              Seu navegador não suporta vídeos.
            </video>
            {bloco.descricao && (
              <p className="text-sm text-muted-foreground italic">
                {bloco.descricao}
              </p>
            )}
          </div>
        );

      case 'link':
        return (
          <div className="p-4 border border-border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4" />
              <span className="font-medium">{bloco.titulo || 'Link'}</span>
            </div>
            <a 
              href={bloco.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {bloco.url}
            </a>
            {bloco.descricao && (
              <p className="text-sm text-muted-foreground mt-2">
                {bloco.descricao}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground">
            Tipo de bloco não reconhecido: {bloco.tipo}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando referência...</p>
        </div>
      </div>
    );
  }

  if (!referencia) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Globe className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Referência não encontrada</h1>
          <p className="text-muted-foreground">
            Esta referência pode ter sido removida ou você não tem permissão para visualizá-la.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Visualização Pública</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {referencia.categoria}
              </Badge>
              {referencia.is_template && (
                <Badge variant="outline">Template</Badge>
              )}
              <Button variant="outline" size="sm" onClick={copiarLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-6 py-8">
        {/* Title and Meta */}
        <div className="space-y-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">{referencia.titulo}</h1>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Criado em {format(new Date(referencia.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {referencia.updated_at !== referencia.created_at && (
                <div className="flex items-center gap-2">
                  <span>•</span>
                  <span>
                    Atualizado em {format(new Date(referencia.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Links Externos */}
          {referencia.links_externos && referencia.links_externos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Links Externos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {referencia.links_externos.map((link: any, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent transition-colors group"
                  >
                    <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                    <span className="font-medium group-hover:text-primary">
                      {link.titulo || link.url}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* Content */}
        <div className="space-y-8">
          {(referencia.versao_editor || 1) >= 2 ? (
            <NotionEditor
              blocks={editorBlocks}
              onChange={() => {}} // Read-only
              readOnly={true}
              className="max-w-none"
            />
          ) : (
            Array.isArray(referencia.conteudo) 
              ? referencia.conteudo.map((bloco, index) => (
                <div key={index} className="space-y-6">
                  {renderizarBlocoClassico(bloco)}
                  {index < (referencia.conteudo?.length || 0) - 1 && (
                    <Separator className="my-8" />
                  )}
                </div>
              ))
              : <p className="text-muted-foreground">Conteúdo não disponível</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Esta referência foi compartilhada publicamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferenciaPublica;