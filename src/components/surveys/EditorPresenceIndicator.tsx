import { useEditorPresence, PresenceUser } from '@/hooks/useEditorPresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EditorPresenceIndicatorProps {
  surveyId: string | undefined;
}

const getInitials = (name: string | null, email: string): string => {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
};

const getAvatarColor = (id: string): string => {
  // Generate a consistent color based on user ID
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const PresenceAvatar = ({ user, index }: { user: PresenceUser; index: number }) => {
  const initials = getInitials(user.name, user.email);
  const colorClass = getAvatarColor(user.id);
  const displayName = user.name || user.email;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative transition-transform hover:scale-110 hover:z-10",
            index > 0 && "-ml-2"
          )}
          style={{ zIndex: 10 - index }}
        >
          <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className={cn(colorClass, "text-white text-xs font-medium")}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Pulse indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">{displayName}</p>
        <p className="text-muted-foreground">Editando agora</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const EditorPresenceIndicator = ({ surveyId }: EditorPresenceIndicatorProps) => {
  const { presentUsers } = useEditorPresence(surveyId);

  if (presentUsers.length === 0) return null;

  const visibleUsers = presentUsers.slice(0, 3);
  const extraCount = Math.max(0, presentUsers.length - 3);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
        <div className="flex items-center">
          {visibleUsers.map((user, index) => (
            <PresenceAvatar key={user.id} user={user} index={index} />
          ))}
        </div>
        
        {extraCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="h-8 px-2 text-xs cursor-default">
                +{extraCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>E mais {extraCount} {extraCount === 1 ? 'pessoa' : 'pessoas'}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {presentUsers.length === 1 ? 'pessoa editando' : 'pessoas editando'}
        </span>
      </div>
    </TooltipProvider>
  );
};
