import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';

export interface UserPresence {
  user_id: string;
  name: string;
  avatar_url?: string;
  cursor_position?: number;
  is_typing: boolean;
  last_seen: string;
  color: string;
}

const USER_COLORS = [
  'hsl(200, 100%, 60%)', // Blue
  'hsl(120, 100%, 40%)', // Green  
  'hsl(300, 100%, 60%)', // Purple
  'hsl(30, 100%, 50%)',  // Orange
  'hsl(350, 100%, 60%)', // Red
  'hsl(180, 100%, 40%)', // Teal
  'hsl(45, 100%, 50%)',  // Yellow
  'hsl(270, 100%, 60%)', // Violet
];

export function useRealtimePresence(documentId: string) {
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const [presenceUsers, setPresenceUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!documentId || !userData || !user) return;

    const channelName = `pauta:${documentId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users: UserPresence[] = [];
        
        Object.keys(newState).forEach((userId) => {
          const presences = newState[userId];
          if (presences && presences.length > 0) {
            const presence = presences[0] as any;
            // Check if this is our custom UserPresence data
            if (presence && presence.user_id && presence.name) {
              users.push(presence as UserPresence);
            }
          }
        });
        
        setPresenceUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      });

    channelRef.current = channel;

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        
        // Assign color based on user index
        const existingUsers = Object.keys(channel.presenceState()).length;
        const userColor = USER_COLORS[existingUsers % USER_COLORS.length];
        
        await channel.track({
          user_id: user.id,
          name: userData.nome,
          avatar_url: userData.avatar_url,
          cursor_position: null,
          is_typing: false,
          last_seen: new Date().toISOString(),
          color: userColor,
        });
      } else {
        setIsConnected(false);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [documentId, userData, user]);

  const updateTypingStatus = (isTyping: boolean, cursorPosition?: number) => {
    if (!channelRef.current || !userData || !user) return;

    channelRef.current.track({
      user_id: user.id,
      name: userData.nome,
      avatar_url: userData.avatar_url,
      cursor_position: cursorPosition || null,
      is_typing: isTyping,
      last_seen: new Date().toISOString(),
      color: presenceUsers.find(u => u.user_id === user.id)?.color || USER_COLORS[0],
    });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false, cursorPosition);
      }, 3000);
    }
  };

  const updateCursorPosition = (position: number) => {
    updateTypingStatus(false, position);
  };

  return {
    presenceUsers: presenceUsers.filter(presenceUser => presenceUser.user_id !== user?.id),
    isConnected,
    updateTypingStatus,
    updateCursorPosition,
    currentUser: userData,
  };
}