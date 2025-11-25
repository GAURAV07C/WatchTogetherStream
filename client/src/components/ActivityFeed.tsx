import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  SkipForward,
  Video,
  UserPlus,
  UserMinus,
  Plus,
} from "lucide-react";
import type { Activity } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  activities: Activity[];
}

const getActivityIcon = (type: Activity['type']) => {
  const iconClass = "w-4 h-4";
  switch (type) {
    case 'video_play':
      return <Play className={iconClass} fill="currentColor" />;
    case 'video_pause':
      return <Pause className={iconClass} />;
    case 'video_seek':
      return <SkipForward className={iconClass} />;
    case 'video_load':
      return <Video className={iconClass} />;
    case 'user_join':
      return <UserPlus className={iconClass} />;
    case 'user_leave':
      return <UserMinus className={iconClass} />;
    case 'video_add_queue':
      return <Plus className={iconClass} />;
  }
};

const getActivityText = (activity: Activity): string => {
  switch (activity.type) {
    case 'video_play':
      return 'played the video';
    case 'video_pause':
      return 'paused the video';
    case 'video_seek':
      const time = activity.metadata?.time || 0;
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `seeked to ${minutes}:${seconds.toString().padStart(2, '0')}`;
    case 'video_load':
      return 'loaded a new video';
    case 'user_join':
      return 'joined the room';
    case 'user_leave':
      return 'left the room';
    case 'video_add_queue':
      return 'added a video to queue';
    default:
      return 'performed an action';
  }
};

const getActivityColor = (type: Activity['type']): string => {
  switch (type) {
    case 'video_play':
      return 'text-green-500';
    case 'video_pause':
      return 'text-yellow-500';
    case 'user_join':
      return 'text-blue-500';
    case 'user_leave':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-sm md:text-base">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <ScrollArea className="h-48 md:h-64">
          {activities.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs md:text-sm py-6 md:py-8">
              No activity yet
            </div>
          ) : (
            <div className="space-y-1.5 md:space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-2 md:gap-3 p-1.5 md:p-2 rounded-md hover-elevate"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className={`mt-0.5 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm">
                      <span className="font-semibold" data-testid={`text-activity-username-${activity.id}`}>
                        {activity.username}
                      </span>{' '}
                      <span className="text-muted-foreground" data-testid={`text-activity-action-${activity.id}`}>
                        {getActivityText(activity)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
