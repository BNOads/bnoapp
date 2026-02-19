import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createPublicSupabaseClient } from "@/lib/supabase-public";
import { Globe, Lock } from "lucide-react";

interface PublicWorkspaceDocument {
  id: string;
  title: string;
  emoji: string | null;
  content_html: string;
  updated_at: string;
  public_slug: string | null;
}

export default function DocumentoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documento, setDocumento] = useState<PublicWorkspaceDocument | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      if (!slug) {
        setError("not_found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const publicClient = createPublicSupabaseClient();
        const { data, error } = await publicClient
          .from("workspace_documents")
          .select("id, title, emoji, content_html, updated_at, public_slug")
          .eq("public_slug", slug)
          .eq("is_public", true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError("not_found");
          return;
        }

        setDocumento(data);
      } catch (err) {
        setError("load_error");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando documento...</div>
      </div>
    );
  }

  if (error || !documento) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Documento indisponível</h1>
          <p className="text-muted-foreground text-sm">
            {error === "not_found"
              ? "Este link não existe ou não está mais público."
              : "Não foi possível carregar este documento no momento."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="mb-8 pb-6 border-b space-y-3">
          <div className="inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100 rounded-full px-3 py-1">
            <Globe className="h-3.5 w-3.5" />
            Documento público
          </div>

          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{documento.emoji || "📝"}</span>
            <h1 className="text-4xl font-bold leading-tight">{documento.title}</h1>
          </div>

          <p className="text-sm text-muted-foreground">
            Atualizado em{" "}
            {new Date(documento.updated_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </header>

        <article
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: documento.content_html || "<p>Sem conteúdo.</p>" }}
        />
      </div>
    </div>
  );
}
