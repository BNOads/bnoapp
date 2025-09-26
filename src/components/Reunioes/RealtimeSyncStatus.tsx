import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, Check, AlertCircle, Loader2, Clock } from 'lucide-react';

interface RealtimeSyncStatusProps {
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSyncTime?: Date | null;
  lastSaveTime?: Date | null;
}

export function RealtimeSyncStatus({ 
  syncStatus, 
  saveStatus, 
  lastSyncTime, 
  lastSaveTime 
}: RealtimeSyncStatusProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSyncStatusInfo = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          label: 'Sincronizando...',
          variant: 'secondary' as const,
          tooltip: 'Sincronizando alterações com outros usuários'
        };
      case 'synced':
        return {
          icon: <Check className="w-3 h-3" />,
          label: 'Sincronizado',
          variant: 'default' as const,
          tooltip: `Última sincronização: ${formatTime(lastSyncTime)}`
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Erro na sincronização',
          variant: 'destructive' as const,
          tooltip: 'Erro ao sincronizar. Verifique sua conexão.'
        };
      default:
        return null;
    }
  };

  const getSaveStatusInfo = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: <Save className="w-3 h-3 animate-pulse" />,
          label: 'Salvando...',
          variant: 'secondary' as const,
          tooltip: 'Salvando alterações no servidor'
        };
      case 'saved':
        return {
          icon: <Check className="w-3 h-3" />,
          label: 'Salvo',
          variant: 'default' as const,
          tooltip: `Último salvamento: ${formatTime(lastSaveTime)}`
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Erro ao salvar',
          variant: 'destructive' as const,
          tooltip: 'Erro ao salvar. Tente novamente.'
        };
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          label: 'Não salvo',
          variant: 'outline' as const,
          tooltip: 'Documento não foi salvo'
        };
    }
  };

  const syncInfo = getSyncStatusInfo();
  const saveInfo = getSaveStatusInfo();

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        {/* Sync Status */}
        {syncInfo && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant={syncInfo.variant} className="text-xs flex items-center gap-1">
                {syncInfo.icon}
                {syncInfo.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{syncInfo.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Save Status */}
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={saveInfo.variant} className="text-xs flex items-center gap-1">
              {saveInfo.icon}
              {saveInfo.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{saveInfo.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}