import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArquivoVersion } from '@/hooks/useArquivoVersioning';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';

interface ArquivoVisualizarVersaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: ArquivoVersion | null;
  onRestore: (version: ArquivoVersion) => void;
  isCurrentVersion?: boolean;
}

export function ArquivoVisualizarVersao({
  open,
  onOpenChange,
  version,
  onRestore,
  isCurrentVersion = false
}: ArquivoVisualizarVersaoProps) {
  if (!version) return null;

  const initialConfig = {
    namespace: 'ArquivoVisualizarVersao',
    editable: false,
    theme: {
      paragraph: 'mb-2',
      heading: {
        h1: 'text-3xl font-bold mb-4',
        h2: 'text-2xl font-semibold mb-3',
        h3: 'text-xl font-semibold mb-2',
      },
      list: {
        ul: 'list-disc list-inside mb-2',
        ol: 'list-decimal list-inside mb-2',
      },
      link: 'text-primary underline hover:text-primary/80',
    },
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
    editorState: JSON.stringify(version.conteudo),
    onError: (error: Error) => {
      console.error('Erro no editor:', error);
    },
  };

  const getTipoLabel = (tipo: ArquivoVersion['tipo']) => {
    const labels = {
      criacao: 'Criação',
      autosave: 'Autosave',
      manual: 'Manual',
      restaurada: 'Restaurada'
    };
    return labels[tipo];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Visualizar Versão {version.versao}</DialogTitle>
            
            {!isCurrentVersion && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onRestore(version);
                  onOpenChange(false);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar esta versão
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadados */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
            <Badge variant="outline">
              Versão {version.versao}
            </Badge>
            <Badge variant="secondary">
              {getTipoLabel(version.tipo)}
            </Badge>
            {isCurrentVersion && (
              <Badge variant="default">
                Versão Atual
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Por <span className="font-medium">{version.autor_nome}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(version.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Observações */}
          {version.observacoes && (
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm font-medium mb-1">Observações:</p>
              <p className="text-sm italic">{version.observacoes}</p>
            </div>
          )}

          {/* Conteúdo */}
          <div className="border rounded-lg p-6 max-h-[50vh] overflow-y-auto bg-background">
            <LexicalComposer initialConfig={initialConfig}>
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="outline-none min-h-[200px]" />
                }
                placeholder={
                  <div className="text-muted-foreground absolute top-0 left-0 pointer-events-none">
                    Conteúdo vazio...
                  </div>
                }
                ErrorBoundary={() => <div>Erro ao carregar conteúdo</div>}
              />
            </LexicalComposer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
