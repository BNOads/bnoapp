import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  History, 
  Edit,
  Calendar,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KickoffVisualizacaoProps {
  clienteId: string;
  clienteNome: string;
  onEdit?: () => void;
}

interface KickoffContent {
  id: string;
  content_md: string;
  version: number;
  created_at: string;
  created_by: string;
}

export const KickoffVisualizacao = ({ clienteId, clienteNome, onEdit }: KickoffVisualizacaoProps) => {
  const { toast } = useToast();
  const [content, setContent] = useState<KickoffContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    loadKickoffContent();
  }, [clienteId]);

  const loadKickoffContent = async () => {
    try {
      setLoading(true);
      
      // Buscar kickoff do cliente
      const { data: kickoff, error: kickoffError } = await supabase
        .from('kickoffs')
        .select('id')
        .eq('client_id', clienteId)
        .single();

      if (kickoffError || !kickoff) {
        setContent(null);
        return;
      }

      // Buscar última versão do conteúdo
      const { data: latestContent, error: contentError } = await supabase
        .from('kickoff_content')
        .select('*')
        .eq('kickoff_id', kickoff.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (contentError) throw contentError;

      setContent(latestContent);

      // Buscar histórico de versões
      const { data: versionsData, error: versionsError } = await supabase
        .from('kickoff_content')
        .select('id, version, created_at, created_by')
        .eq('kickoff_id', kickoff.id)
        .order('version', { ascending: false });

      if (versionsError) throw versionsError;
      setVersions(versionsData || []);
    } catch (error) {
      console.error('Error loading kickoff:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar kickoff",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdownToSections = (markdown: string) => {
    const lines = markdown.split('\n');
    const sections: { title: string; content: { label: string; value: string }[] }[] = [];
    let currentSection: { title: string; content: { label: string; value: string }[] } | null = null;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Nova seção
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.substring(3).trim(),
          content: []
        };
      } else if (line.startsWith('- **') && line.includes(':**') && currentSection) {
        // Item da seção
        const match = line.match(/- \*\*(.*?):\*\*\s*(.*)/);
        if (match) {
          currentSection.content.push({
            label: match[1],
            value: match[2] || '-'
          });
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const exportToPDF = async () => {
    if (!content) return;

    try {
      // Simular exportação - em produção, usar biblioteca como jsPDF
      const sections = parseMarkdownToSections(content.content_md);
      let exportContent = `KICKOFF - ${clienteNome}\n\n`;
      
      sections.forEach(section => {
        exportContent += `${section.title.toUpperCase()}\n`;
        exportContent += '='.repeat(section.title.length) + '\n\n';
        
        section.content.forEach(item => {
          exportContent += `${item.label}: ${item.value}\n`;
        });
        
        exportContent += '\n';
      });

      // Criar blob e download
      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kickoff-${clienteNome.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "Kickoff exportado com sucesso"
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar kickoff",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum Kickoff encontrado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Este cliente ainda não possui um documento de kickoff.
          </p>
          {onEdit && (
            <Button onClick={onEdit}>
              Criar Kickoff
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const sections = parseMarkdownToSections(content.content_md);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Kickoff - {clienteNome}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">Versão {content.version}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(content.created_at).toLocaleDateString('pt-BR')}
              </div>
              {versions.length > 1 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <History className="h-3 w-3" />
                  {versions.length} versões
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          <Button onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Conteúdo do Kickoff */}
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <Card key={sectionIndex}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <div className="flex flex-col space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </label>
                      <div className="text-sm">
                        {item.value || '-'}
                      </div>
                    </div>
                    {itemIndex < section.content.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Histórico de Versões */}
      {versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      v{version.version}
                    </Badge>
                    <span className="text-sm">
                      {new Date(version.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {version.created_by}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};