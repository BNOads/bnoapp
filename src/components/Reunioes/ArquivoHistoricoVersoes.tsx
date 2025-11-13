import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Eye, RotateCcw } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArquivoVersion } from '@/hooks/useArquivoVersioning';

interface ArquivoHistoricoVersoesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: ArquivoVersion[];
  loading: boolean;
  onRestore: (version: ArquivoVersion) => void;
  onView: (version: ArquivoVersion) => void;
  currentVersionNumber?: number;
}

export function ArquivoHistoricoVersoes({
  open,
  onOpenChange,
  versions,
  loading,
  onRestore,
  onView,
  currentVersionNumber
}: ArquivoHistoricoVersoesProps) {
  const groupVersionsByDate = (versions: ArquivoVersion[]) => {
    const groups: { [key: string]: ArquivoVersion[] } = {};
    
    versions.forEach(version => {
      const date = new Date(version.data_hora);
      let key: string;
      
      if (isToday(date)) {
        key = 'Hoje';
      } else if (isYesterday(date)) {
        key = 'Ontem';
      } else {
        key = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(version);
    });
    
    return groups;
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

  const getTipoBadgeVariant = (tipo: ArquivoVersion['tipo']) => {
    const variants = {
      criacao: 'default',
      autosave: 'secondary',
      manual: 'default',
      restaurada: 'outline'
    };
    return variants[tipo] as any;
  };

  const groupedVersions = groupVersionsByDate(versions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Versões</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma versão encontrada
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            {Object.entries(groupedVersions).map(([date, dateVersions]) => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                  {date}
                </h3>
                
                <div className="space-y-3">
                  {dateVersions.map((version) => (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 hover:bg-accent/50 transition-colors ${
                        version.versao === currentVersionNumber ? 'bg-accent border-primary' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">
                              Versão {version.versao}
                            </span>
                            <Badge variant={getTipoBadgeVariant(version.tipo)} className="text-xs">
                              {getTipoLabel(version.tipo)}
                            </Badge>
                            {version.versao === currentVersionNumber && (
                              <Badge variant="default" className="text-xs">
                                Atual
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">{version.autor_nome}</span>
                              {' • '}
                              <span>
                                {format(new Date(version.data_hora), "HH:mm", { locale: ptBR })}
                              </span>
                            </p>
                            
                            {version.observacoes && (
                              <p className="text-foreground italic">
                                "{version.observacoes}"
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(version)}
                            className="h-8"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
                          </Button>
                          
                          {version.versao !== currentVersionNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRestore(version)}
                              className="h-8"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
