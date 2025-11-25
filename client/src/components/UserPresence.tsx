import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users } from "lucide-react";
import type { RoomUser } from "@shared/schema";

interface UserPresenceProps {
  users: RoomUser[];
  currentUsername: string;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (index: number): string => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  return colors[index % colors.length];
};

export default function UserPresence({ users, currentUsername }: UserPresenceProps) {
  const maxVisible = 5;
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  return (
    <div className="flex items-center gap-1.5 md:gap-2" data-testid="user-presence">
      <div className="flex items-center gap-1">
        <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
        <span className="text-xs md:text-sm font-medium" data-testid="text-user-count">
          {users.length}
        </span>
      </div>

      <div className="flex -space-x-1.5 md:-space-x-2">
        {visibleUsers.map((user, index) => (
          <Tooltip key={user.id}>
            <TooltipTrigger>
              <Avatar
                className={`w-6 h-6 md:w-8 md:h-8 border-2 border-background ${getAvatarColor(index)}`}
                data-testid={`avatar-user-${user.id}`}
              >
                <AvatarFallback className="text-xs font-semibold text-white">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium text-xs md:text-sm">
                {user.username}
                {user.username === currentUsername && ' (You)'}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="w-6 h-6 md:w-8 md:h-8 border-2 border-background bg-muted">
                <AvatarFallback className="text-xs font-semibold">
                  +{hiddenCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs md:text-sm">{hiddenCount} more {hiddenCount === 1 ? 'user' : 'users'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
