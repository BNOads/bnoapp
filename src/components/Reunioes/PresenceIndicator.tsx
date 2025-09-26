import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Edit, Wifi, WifiOff, AlertCircle, Check, Loader } from 'lucide-react';

export interface PresenceUser {
  userId: string;
  name: string;
  avatar: string | null;
  color: string;
  isTyping: boolean;
  cursor: any;
}

interface PresenceIndicatorProps {
  presenceUsers: PresenceUser[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  saveStatus: 'saving' | 'saved' | 'error';
  permissions: {
    canEdit: boolean;
    canView: boolean;
  };
  className?: string;
}

export function PresenceIndicator({
  presenceUsers,
  connectionStatus,
  saveStatus,
  permissions,
  className = ''
}: PresenceIndicatorProps) {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-500" />;
      case 'connecting':
        return <Loader className="h-3 w-3 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <WifiOff className="h-3 w-3 text-gray-400" />;
    }
  };

  const getSaveIcon = () => {
    switch (saveStatus) {
      case 'saved':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'saving':
        return <Loader className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getSaveText = () => {
    switch (saveStatus) {
      case 'saved':
        return 'Salvo';
      case 'saving':
        return 'Salvando...';
      case 'error':
        return 'Erro ao salvar';
      default:
        return '';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Erro de conexão';
      default:
        return 'Desconhecido';
    }
  };

  const typingUsers = presenceUsers.filter(user => user.isTyping);

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Connection and Save Status */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {getConnectionIcon()}
                <span className="text-xs text-muted-foreground">
                  {getConnectionText()}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Status da conexão: {getConnectionText()}</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {getSaveIcon()}
                <span className="text-xs text-muted-foreground">
                  {getSaveText()}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Status do salvamento automático</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Permissions Badge */}
        <Badge variant="outline" className="flex items-center gap-1">
          {permissions.canEdit ? (
            <>
              <Edit className="h-3 w-3" />
              <span>Editor</span>
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              <span>Visualizador</span>
            </>
          )}
        </Badge>

        {/* Presence Users */}
        {presenceUsers.length > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Online ({presenceUsers.length}):
              </span>
              
              <div className="flex -space-x-2">
                {presenceUsers.slice(0, 5).map((user) => (
                  <Tooltip key={user.userId}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar 
                          className="h-6 w-6 border-2 border-background"
                          style={{ borderColor: user.color }}
                        >
                          <AvatarImage src={user.avatar || undefined} alt={user.name} />
                          <AvatarFallback 
                            className="text-xs"
                            style={{ backgroundColor: user.color + '20', color: user.color }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isTyping && (
                          <div 
                            className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full animate-pulse"
                            style={{ backgroundColor: user.color }}
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{user.name}</p>
                      {user.isTyping && <p className="text-xs">Digitando...</p>}
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                {presenceUsers.length > 5 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          +{presenceUsers.length - 5}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mais {presenceUsers.length - 5} usuários online</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </>
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            
            <div className="flex items-center gap-1">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <span className="text-xs text-muted-foreground">
                {typingUsers.length === 1 
                  ? `${typingUsers[0].name} está digitando...`
                  : `${typingUsers.length} usuários estão digitando...`
                }
              </span>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}