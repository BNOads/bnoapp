import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Share2, 
  ExternalLink,
  Calendar,
  Copy,
  Globe,
  Eye,
  Shield,
  Clock
} from "lucide-react";
import { createPublicSupabaseClient } from "@/lib/supabase-public";
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
  conteudo_markdown?: string;
  link_publico: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  is_template: boolean;
  is_public: boolean;
  public_slug?: string;
  public_token?: string;
  view_count?: number;
  links_externos: any;
  versao_editor?: number;
}

export const ReferenciaPublica = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const [referencia, setReferencia] = useState<ReferenciaCreativo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const { toast } = useToast();

  // Get token from URL if present
  const token = searchParams.get('token');

  useEffect(() => {
    if (id || slug) {
      carregarReferencia();
    }
  }, [id, slug]);

  const carregarReferencia = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Carregando referência pública:', { id, slug, token });
      
      // Usar cliente público (sem autenticação)
      const publicClient = createPublicSupabaseClient();
      
      // Buscar pela public_slug (rota /r/:slug) ou por ID (rotas legacy)
      const identifier = slug || id;
      
      if (!identifier) {
        setError('not_found');
        return;
      }

      // Tentar buscar por public_slug primeiro, depois por ID se não encontrar
      let query = publicClient
        .from('referencias_criativos')
        .select('*')
        .eq('ativo', true)
        .eq('is_public', true);

      // Se parece com UUID, buscar por ID também
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('public_slug', identifier);
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) {
        console.error('Erro ao carregar referência:', fetchError);
        throw fetchError;
      }

      if (!data) {
        setError('not_found');
        return;
      }

      console.log('Referência carregada:', data);
      setReferencia(data as ReferenciaCreativo);

      // Incrementar contador de visualizações usando cliente público
      try {
        await publicClient
          .from('referencias_criativos')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id);
      } catch (viewError) {
        console.warn('Erro ao incrementar visualizações:', viewError);
      }

      // Converter conteúdo para blocos do editor se versão 2+
      if ((data.versao_editor || 1) >= 2 && data.conteudo && Array.isArray(data.conteudo)) {
        const convertedBlocks: EditorBlock[] = data.conteudo
          .map((item: any, index: number) => ({
            id: item.id || `block-${index}`,
            type: item.tipo || 'text',
            content: {
              text: item.conteudo || item.text,
              url: item.url,
              caption: item.descricao || item.caption,
              title: item.titulo || item.title,
              level: item.level || 1,
              checked: item.checked || false
            },
            order: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
          .filter(block => {
            const content = block.content;
            return content.text?.trim() || 
                   content.url?.trim() || 
                   content.title?.trim() || 
                   content.caption?.trim() ||
                   block.type === 'divider';
          });
        
        setEditorBlocks(convertedBlocks);
        console.log('Blocos convertidos:', convertedBlocks);
      }
      
    } catch (error) {
      console.error('Erro ao carregar referência:', error);
      setError('load_error');
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

  if (error || !referencia) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            {error === 'access_denied' ? (
              <Shield className="w-8 h-8 text-yellow-500" />
            ) : error === 'invalid_token' ? (
              <Shield className="w-8 h-8 text-red-500" />
            ) : (
              <Globe className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {error === 'access_denied' ? 'Acesso Negado' :
               error === 'invalid_token' ? 'Token Inválido' :
               error === 'load_error' ? 'Erro de Carregamento' :
               'Referência não encontrada'}
            </h1>
            <p className="text-muted-foreground">
              {error === 'access_denied' 
                ? 'Esta referência não está disponível publicamente. Entre em contato com o autor para solicitar acesso.' 
                : error === 'invalid_token'
                ? 'O link utilizado é inválido ou expirou. Verifique o link ou solicite um novo.'
                : error === 'load_error'
                ? 'Ocorreu um erro ao carregar a referência. Tente novamente em alguns instantes.'
                : 'Esta referência pode ter sido removida ou o link está incorreto.'
              }
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Tentar Novamente
            </Button>
          </div>
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
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Criado em {format(new Date(referencia.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              
              {referencia.published_at && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>
                    Publicado em {format(new Date(referencia.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              
              {referencia.updated_at !== referencia.created_at && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Atualizado em {format(new Date(referencia.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {referencia.view_count && referencia.view_count > 0 && (
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>
                    {referencia.view_count} visualiza{referencia.view_count !== 1 ? 'ções' : 'ção'}
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
            // Modern editor content
            editorBlocks.length > 0 ? (
              <NotionEditor
                blocks={editorBlocks}
                onChange={() => {}} // Read-only
                readOnly={true}
                className="max-w-none"
              />
            ) : referencia.conteudo_markdown ? (
              // Fallback to markdown content if available
              <div 
                className="prose prose-lg max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ 
                  __html: referencia.conteudo_markdown.replace(/\n/g, '<br>') 
                }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Esta referência não possui conteúdo disponível para visualização pública.</p>
              </div>
            )
          ) : (
            // Legacy editor content
            Array.isArray(referencia.conteudo) && referencia.conteudo.length > 0
              ? referencia.conteudo
                  .filter((bloco: any) => {
                    // Filter out empty blocks
                    return bloco.conteudo?.trim() || bloco.url?.trim() || bloco.titulo?.trim();
                  })
                  .map((bloco: any, index: number) => (
                    <div key={index} className="space-y-6">
                      {renderizarBlocoClassico(bloco)}
                      {index < (referencia.conteudo?.filter((b: any) => b.conteudo?.trim() || b.url?.trim() || b.titulo?.trim())?.length || 0) - 1 && (
                        <Separator className="my-8" />
                      )}
                    </div>
                  ))
              : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Esta referência não possui conteúdo disponível para visualização pública.</p>
                </div>
              )
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