import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PautaVersion } from '@/hooks/usePautaVersioning';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Users, List, CheckSquare } from 'lucide-react';

interface VisualizarVersaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: PautaVersion | null;
}

const BLOCK_TYPE_ICONS = {
  titulo: FileText,
  descricao: FileText,
  participantes: Users,
  pauta: List,
  decisoes: CheckSquare,
  acoes: CheckSquare
};

export function VisualizarVersao({ open, onOpenChange, version }: VisualizarVersaoProps) {
  if (!version) return null;

  const date = parseISO(version.data_hora);
  const conteudo = version.conteudo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span>Versão {version.versao}</span>
                <Badge variant="outline" className="text-xs">
                  {version.tipo}
                </Badge>
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                {format(date, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })} • {version.autor_nome}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
          <div className="space-y-4">
            {/* Informações do documento */}
            {conteudo.titulo_reuniao && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Título da Reunião</h3>
                <p>{conteudo.titulo_reuniao}</p>
              </div>
            )}

            {conteudo.descricao && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-sm text-muted-foreground">{conteudo.descricao}</p>
              </div>
            )}

            {conteudo.participantes && conteudo.participantes.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participantes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {conteudo.participantes.map((p: string, i: number) => (
                    <Badge key={i} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Blocos de conteúdo */}
            {conteudo.blocos && conteudo.blocos.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Blocos de Conteúdo</h3>
                {conteudo.blocos
                  .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
                  .map((block: any, index: number) => {
                    const Icon = BLOCK_TYPE_ICONS[block.tipo as keyof typeof BLOCK_TYPE_ICONS] || FileText;
                    
                    return (
                      <div key={block.id || index} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="h-4 w-4 text-primary" />
                          {block.titulo && (
                            <h4 className="font-medium">{block.titulo}</h4>
                          )}
                          <Badge variant="outline" className="text-xs ml-auto">
                            {block.tipo}
                          </Badge>
                        </div>
                        
                        {block.conteudo && (
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: block.conteudo }}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {version.observacoes && (
              <div className="border-t pt-4 mt-6">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Observações</h4>
                <p className="text-sm italic">{version.observacoes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
