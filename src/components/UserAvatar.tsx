import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

export const UserAvatar = ({ size = 'md', clickable = true }: UserAvatarProps) => {
  const { user } = useAuth();
  const { navigateTo } = useProjectNavigation();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return user?.email?.[0]?.toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const handleClick = () => {
    if (clickable) {
      navigateTo('/settings');
    }
  };

  return (
    <Avatar 
      className={`${sizeClasses[size]} ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
      onClick={handleClick}
    >
      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Avatar'} />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials(profile?.full_name)}
      </AvatarFallback>
    </Avatar>
  );
};
