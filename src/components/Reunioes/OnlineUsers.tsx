import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface OnlineUsersProps {
  documentId: string;
}

export function OnlineUsers({ documentId }: OnlineUsersProps) {
  const { presenceUsers, isConnected } = useRealtimePresence(documentId);

  return (
    <div className="flex items-center gap-3">
      <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
        {isConnected ? (
          <>
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
            Online
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 bg-muted-foreground rounded-full mr-1.5"></span>
            Offline
          </>
        )}
      </Badge>
      
      {presenceUsers.length > 0 && (
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {presenceUsers.slice(0, 5).map((user) => (
                <Tooltip key={user.user_id}>
                  <TooltipTrigger>
                    <Avatar
                      className="border-2 border-background hover:z-10 transition-all"
                      style={{ borderColor: user.color || '#94a3b8' }}
                    >
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback 
                        className="text-xs"
                        style={{ backgroundColor: user.color || '#94a3b8', color: '#fff' }}
                      >
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">Editando agora</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {presenceUsers.length > 5 && (
                <Avatar className="border-2 border-background">
                  <AvatarFallback className="bg-muted text-xs">
                    +{presenceUsers.length - 5}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {presenceUsers.length} {presenceUsers.length === 1 ? 'pessoa' : 'pessoas'} editando
            </span>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
