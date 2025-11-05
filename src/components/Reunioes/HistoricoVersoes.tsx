import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, RotateCcw, Eye, Save, Loader2 } from 'lucide-react';
import { PautaVersion } from '@/hooks/usePautaVersioning';
import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoVersoesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: PautaVersion[];
  loading: boolean;
  onRestore: (version: PautaVersion) => Promise<void>;
  onView: (version: PautaVersion) => void;
  currentVersionNumber?: number;
}

export function HistoricoVersoes({
  open,
  onOpenChange,
  versions,
  loading,
  onRestore,
  onView,
  currentVersionNumber
}: HistoricoVersoesProps) {
  const [restoring, setRestoring] = useState<string | null>(null);

  const handleRestore = async (version: PautaVersion) => {
    setRestoring(version.id);
    try {
      await onRestore(version);
      onOpenChange(false);
    } finally {
      setRestoring(null);
    }
  };

  const groupVersionsByDate = (versions: PautaVersion[]) => {
    const groups: { [key: string]: PautaVersion[] } = {};

    versions.forEach(version => {
      const date = parseISO(version.data_hora);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = 'Hoje';
      } else if (isYesterday(date)) {
        groupKey = 'Ontem';
      } else {
        groupKey = format(date, "d 'de' MMMM", { locale: ptBR });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(version);
    });

    return groups;
  };

  const getTipoLabel = (tipo: PautaVersion['tipo']) => {
    const labels = {
      criacao: 'Criação',
      autosave: 'Autosave',
      manual: 'Manual',
      restaurada: 'Restaurada'
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadgeVariant = (tipo: PautaVersion['tipo']): "default" | "destructive" | "outline" | "secondary" => {
    const variants: Record<PautaVersion['tipo'], "default" | "destructive" | "outline" | "secondary"> = {
      criacao: 'default',
      autosave: 'secondary',
      manual: 'outline',
      restaurada: 'destructive'
    };
    return variants[tipo] || 'secondary';
  };

  const groupedVersions = groupVersionsByDate(versions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            Visualize e restaure versões anteriores desta pauta
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma versão encontrada</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedVersions).map(([dateGroup, groupVersions]) => (
                <div key={dateGroup}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    {dateGroup}
                  </h3>
                  <div className="space-y-2">
                    {groupVersions.map((version, index) => {
                      const isCurrentVersion = version.versao === currentVersionNumber;
                      const date = parseISO(version.data_hora);

                      return (
                        <div
                          key={version.id}
                          className={`p-4 rounded-lg border transition-colors ${
                            isCurrentVersion
                              ? 'bg-primary/5 border-primary/20'
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {format(date, 'HH:mm', { locale: ptBR })}
                                </span>
                                <Badge variant={getTipoBadgeVariant(version.tipo)} className="text-xs">
                                  {getTipoLabel(version.tipo)}
                                </Badge>
                                {isCurrentVersion && (
                                  <Badge className="text-xs bg-primary">
                                    Versão atual
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {version.autor_nome} • Versão {version.versao}
                              </p>
                              {version.observacoes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {version.observacoes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onView(version)}
                                className="h-8"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Visualizar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
