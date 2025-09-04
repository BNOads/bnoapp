import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Star, 
  Calendar, 
  User, 
  FileText,
  Share,
  Edit,
  MoreHorizontal,
  Copy,
  Check,
  Link,
  ExternalLink,
  Settings
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface POPDocumentNovoProps {
  documentId: string;
  onBack: () => void;
}

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
  link_publico: string | null;
  link_publico_ativo: boolean;
}

export const POPDocumentNovo = ({ documentId, onBack }: POPDocumentNovoProps) => {
  const [document, setDocument] = useState<POPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useUserPermissions();

  useEffect(() => {
    carregarDocumento();
  }, [documentId]);

  const carregarDocumento = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('id', documentId)
        .eq('categoria_documento', 'pop')
        .single();

      if (error) throw error;
      setDocument(data);
    } catch (error: any) {
      console.error('Erro ao carregar documento:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documento: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLinkPublico = async (ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('documentos')
        .update({ link_publico_ativo: ativo })
        .eq('id', documentId);

      if (error) throw error;

      setDocument(prev => prev ? { ...prev, link_publico_ativo: ativo } : null);
      
      toast({
        title: "Sucesso",
        description: `Link público ${ativo ? 'ativado' : 'desativado'} com sucesso!`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar link público: " + error.message,
        variant: "destructive",
      });
    }
  };

  const copiarLinkPublico = async () => {
    if (!document?.link_publico) return;
    
    try {
      const fullLink = document.link_publico.startsWith('http') 
        ? document.link_publico 
        : `${window.location.origin}${document.link_publico}`;
      await navigator.clipboard.writeText(fullLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({
        title: "Link copiado!",
        description: "Link público copiado para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar link",
        variant: "destructive",
      });
    }
  };

  const abrirLinkPublico = () => {
    if (document?.link_publico) {
      window.open(document.link_publico, '_blank');
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
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Documento não encontrado</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Star className="h-4 w-4" />
          </Button>
          
          {/* Controles de Link Público */}
          {document.link_publico && (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
                  <Switch
                    checked={document.link_publico_ativo}
                    onCheckedChange={toggleLinkPublico}
                  />
                  <Label className="text-xs">Público</Label>
                </div>
              )}
              
              {document.link_publico_ativo && (
                <>
                  <Button variant="outline" size="sm" onClick={copiarLinkPublico}>
                    {copiedLink ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={abrirLinkPublico}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Sugerir edição
              </DropdownMenuItem>
              {document.link_publico_ativo && (
                <DropdownMenuItem onClick={copiarLinkPublico}>
                  <Link className="h-4 w-4 mr-2" />
                  Copiar link público
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Link Público Info */}
      {document.link_publico && document.link_publico_ativo && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <Link className="h-4 w-4" />
            <span className="text-sm font-medium">
              Este POP está disponível publicamente
            </span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            Qualquer pessoa com o link pode visualizar este documento
          </p>
        </Card>
      )}

      {/* Document Info */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <span className="text-2xl">{document.icone}</span>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {document.titulo}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(document.updated_at).toLocaleDateString('pt-BR')}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {document.autor}
              </div>
              <Badge variant="outline">
                {document.tipo}
              </Badge>
            </div>

            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
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
          {renderContent(document.conteudo)}
        </div>
      </Card>
    </div>
  );
};