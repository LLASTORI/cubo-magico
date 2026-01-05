import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceUser {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  joined_at: string;
}

interface PresencePayload {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  joined_at: string;
}

export const useEditorPresence = (surveyId: string | undefined) => {
  const { user } = useAuth();
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!surveyId || !user) return;

    const channelName = `survey-editor:${surveyId}`;
    const channel = supabase.channel(channelName);

    const processPresenceState = () => {
      const state = channel.presenceState();
      const users: PresenceUser[] = [];
      
      Object.values(state).forEach((presences) => {
        presences.forEach((presence: unknown) => {
          const p = presence as PresencePayload;
          // Exclude current user from the list
          if (p.id && p.id !== user.id) {
            users.push({
              id: p.id,
              name: p.name,
              email: p.email,
              avatar_url: p.avatar_url,
              joined_at: p.joined_at,
            });
          }
        });
      });

      // Sort by joined_at to show oldest first
      users.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
      setPresentUsers(users);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('[Presence] Sync event');
        processPresenceState();
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Presence] Join event:', newPresences);
        processPresenceState();
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Presence] Leave event:', leftPresences);
        processPresenceState();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          
          // Fetch user profile for additional data
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();

          await channel.track({
            id: user.id,
            name: profile?.full_name || null,
            email: user.email || '',
            avatar_url: profile?.avatar_url || null,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      setIsConnected(false);
      supabase.removeChannel(channel);
    };
  }, [surveyId, user]);

  return { presentUsers, isConnected };
};
