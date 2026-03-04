import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Copy,
  Globe,
  Shield,
  BookOpen,
} from "lucide-react";
import { createPublicSupabaseClient } from "@/lib/supabase-public";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotionEditor } from "@/components/References/NotionEditor/NotionEditor";
import { EditorBlock } from "@/components/References/NotionEditor/types";
import { TIPO_CLIENTE_LABELS, TIPO_FUNIL_LABELS, TIPO_FUNIL_COLORS, TIPO_CLIENTE_COLORS } from "@/components/Referencias/ReferenciaCard";

interface ReferenciaCreativo {
  id: string;
  titulo: string;
  categoria: string;
  conteudo: any;
  conteudo_markdown?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  public_slug?: string;
  links_externos: any;
  versao_editor?: number;
  tipo_cliente?: string;
  tipo_funil?: string;
  tags?: string[];
  descricao?: string;
  thumbnail_url?: string;
}

export const ReferenciaPublica = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const [referencia, setReferencia] = useState<ReferenciaCreativo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id || slug) carregarReferencia();
  }, [id, slug]);

  const carregarReferencia = async () => {
    try {
      setLoading(true);
      setError(null);

      const publicClient = createPublicSupabaseClient();
      const identifier = slug || id;
      if (!identifier) { setError("not_found"); return; }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let query = publicClient
        .from("referencias_criativos")
        .select("*")
        .eq("ativo", true)
        .eq("is_public", true);

      query = isUUID ? query.eq("id", identifier) : query.eq("public_slug", identifier);

      const { data, error: fetchError } = await query.maybeSingle();
      if (fetchError) throw fetchError;
      if (!data) { setError("not_found"); return; }

      setReferencia(data as ReferenciaCreativo);

      // Increment view count silently
      publicClient
        .from("referencias_criativos")
        .update({ view_count: ((data as any).view_count || 0) + 1 })
        .eq("id", data.id)
        .then(() => { });

      // Parse blocks for modern editor
      const versao = (data as any).versao_editor || 1;
      if (versao >= 2 && data.conteudo && Array.isArray(data.conteudo)) {
        const converted: EditorBlock[] = data.conteudo
          .map((item: any, index: number) => ({
            id: item.id || `block-${index}`,
            type: item.tipo || "text",
            content: {
              text: item.conteudo || item.text,
              url: item.url,
              caption: item.descricao || item.caption,
              title: item.titulo || item.title,
              level: item.level || 1,
              checked: item.checked || false,
            },
            order: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          .filter((b: any) => b.content.text?.trim() || b.content.url?.trim() || b.content.title?.trim() || b.type === "divider");
        setEditorBlocks(converted);
      }
    } catch {
      setError("load_error");
    } finally {
      setLoading(false);
    }
  };

  const copiarLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "Link copiado!", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando referência...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !referencia) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center">
            {error === "access_denied" || error === "invalid_token" ? (
              <Shield className="w-8 h-8 text-yellow-500" />
            ) : (
              <Globe className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {error === "access_denied" ? "Acesso Negado" :
                error === "invalid_token" ? "Token Inválido" :
                  error === "load_error" ? "Erro de Carregamento" :
                    "Referência não encontrada"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {error === "access_denied"
                ? "Esta referência não está disponível publicamente."
                : error === "invalid_token"
                  ? "O link utilizado é inválido ou expirou."
                  : error === "load_error"
                    ? "Ocorreu um erro ao carregar. Tente novamente."
                    : "Esta referência pode ter sido removida ou o link está incorreto."}
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const hasClassicContent =
    Array.isArray(referencia.conteudo) &&
    referencia.conteudo.some((b: any) => b.conteudo?.trim() || b.url?.trim());
  const hasModernContent = (referencia.versao_editor || 1) >= 2 && editorBlocks.length > 0;
  const hasMarkdown = !!referencia.conteudo_markdown;
  const hasAnyContent = hasClassicContent || hasModernContent || hasMarkdown;

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">BNOads</span>
            <span className="text-muted-foreground/40 text-sm">·</span>
            <span className="text-sm text-muted-foreground hidden sm:block">Referência de Criativos</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={copiarLink}
          >
            {copied ? (
              <>Copiado ✓</>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar Link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hero / Title area */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-8">
        {/* Thumbnail */}
        {referencia.thumbnail_url && (
          <div className="w-full h-52 rounded-2xl overflow-hidden mb-8 bg-muted">
            <img
              src={referencia.thumbnail_url}
              alt={referencia.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="text-xs capitalize">
            {referencia.categoria === "criativos" ? "Criativos" : "Página"}
          </Badge>

          {referencia.tipo_funil && (
            <span
              className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${TIPO_FUNIL_COLORS[referencia.tipo_funil] ?? "bg-muted border-border"
                }`}
            >
              {TIPO_FUNIL_LABELS[referencia.tipo_funil] ?? referencia.tipo_funil}
            </span>
          )}

          {referencia.tipo_cliente && (
            <span
              className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${TIPO_CLIENTE_COLORS[referencia.tipo_cliente] ?? "bg-muted border-border"
                }`}
            >
              {TIPO_CLIENTE_LABELS[referencia.tipo_cliente] ?? referencia.tipo_cliente}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3">
          {referencia.titulo}
        </h1>

        {/* Description */}
        {referencia.descricao && (
          <p className="text-base text-muted-foreground leading-relaxed mb-4">
            {referencia.descricao}
          </p>
        )}

        {/* Tags */}
        {referencia.tags && referencia.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {referencia.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Date */}
        <p className="text-xs text-muted-foreground">
          Criado em{" "}
          {format(new Date(referencia.created_at), "dd 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
        </p>
      </div>

      {/* External Links section */}
      {referencia.links_externos && referencia.links_externos.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <div className="border rounded-2xl p-6 space-y-4 bg-card">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              Links de Referência
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {referencia.links_externos.map((link: any, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {link.titulo || link.url}
                    </p>
                    {link.titulo && (
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {hasAnyContent && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="border rounded-2xl p-6 sm:p-10 bg-card">
            {hasModernContent ? (
              <NotionEditor
                blocks={editorBlocks}
                onChange={() => { }}
                readOnly={true}
                className="max-w-none"
              />
            ) : hasMarkdown ? (
              <div
                className="prose prose-lg max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: referencia.conteudo_markdown!.replace(/\n/g, "<br>"),
                }}
              />
            ) : (
              <div className="space-y-8">
                {referencia.conteudo
                  .filter((b: any) => b.conteudo?.trim() || b.url?.trim() || b.titulo?.trim())
                  .map((bloco: any, i: number) => (
                    <div key={i}>
                      {bloco.tipo === "texto" && (
                        <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                          {bloco.conteudo}
                        </p>
                      )}
                      {bloco.tipo === "imagem" && (
                        <div className="space-y-2">
                          <img
                            src={bloco.url}
                            alt={bloco.descricao || "Imagem"}
                            className="w-full max-w-2xl rounded-xl shadow-sm"
                          />
                          {bloco.descricao && (
                            <p className="text-sm text-muted-foreground italic">
                              {bloco.descricao}
                            </p>
                          )}
                        </div>
                      )}
                      {bloco.tipo === "video" && (
                        <video
                          src={bloco.url}
                          controls
                          className="w-full max-w-2xl rounded-xl shadow-sm"
                        />
                      )}
                      {bloco.tipo === "link" && (
                        <a
                          href={bloco.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {bloco.descricao || bloco.url}
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t py-8 mt-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">BNOads</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Referência compartilhada pela equipe BNOads
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferenciaPublica;