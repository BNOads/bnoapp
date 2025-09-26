import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { UserPresence } from '@/hooks/useRealtimePresence';

interface RealtimePresenceIndicatorProps {
  presenceUsers: UserPresence[];
  isConnected: boolean;
  currentUserName?: string;
}

export function RealtimePresenceIndicator({ 
  presenceUsers, 
  isConnected, 
  currentUserName 
}: RealtimePresenceIndicatorProps) {
  const typingUsers = presenceUsers.filter(user => user.is_typing);
  const maxAvatarsShown = 5;
  const visibleUsers = presenceUsers.slice(0, maxAvatarsShown);
  const hiddenUsersCount = Math.max(0, presenceUsers.length - maxAvatarsShown);

  return (
    <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
          {isConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </div>

      {/* Active Users Count */}
      {presenceUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {presenceUsers.length === 1 
              ? `1 pessoa editando`
              : `${presenceUsers.length} pessoas editando`
            }
          </span>
        </div>
      )}

      {/* User Avatars */}
      {presenceUsers.length > 0 && (
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {visibleUsers.map((user) => (
              <Tooltip key={user.user_id}>
                <TooltipTrigger>
                  <div className="relative">
                    <Avatar className="w-6 h-6 border-2" style={{ borderColor: user.color }}>
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback className="text-xs" style={{ backgroundColor: user.color + '20' }}>
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.is_typing && (
                      <div 
                        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background animate-pulse"
                        style={{ backgroundColor: user.color }}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{user.name} {user.is_typing ? '(digitando...)' : ''}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {hiddenUsersCount > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="w-6 h-6 border-2 border-muted">
                    <AvatarFallback className="text-xs bg-muted">
                      +{hiddenUsersCount}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>+{hiddenUsersCount} {hiddenUsersCount === 1 ? 'pessoa' : 'pessoas'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <Badge variant="secondary" className="text-xs animate-pulse">
          {typingUsers.length === 1 
            ? `${typingUsers[0].name} está digitando...`
            : `${typingUsers.length} pessoas digitando...`
          }
        </Badge>
      )}
    </div>
  );
}