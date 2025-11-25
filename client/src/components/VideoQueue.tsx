import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Play, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Socket } from "socket.io-client";
import type { Room } from "@shared/schema";

interface VideoQueueProps {
  socket: Socket | null;
  room: Room;
  username: string;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
}

export default function VideoQueue({ socket, room, username, videoUrl, onVideoUrlChange }: VideoQueueProps) {
  const { toast } = useToast();

  // Check if user is in the room
  const isUserInRoom = room.users.some(u => u.username === username);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    socket?.emit('add-video', {
      videoId,
      title: 'YouTube Video',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    });

    onVideoUrlChange("");
    toast({
      title: "Video added",
      description: "Video added to queue",
    });
  };

  const handleRemoveVideo = (videoId: string) => {
    socket?.emit('remove-video', { videoId });
    toast({
      title: "Video removed",
      description: "Video removed from queue",
    });
  };

  const handlePlayVideo = (videoId: string) => {
    socket?.emit('load-video', {
      videoId,
      title: room.queue.find(v => v.videoId === videoId)?.title || 'YouTube Video',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    });
  };

  const handleVoteVideo = (videoId: string) => {
    const video = room.queue.find(v => v.videoId === videoId);
    if (!video) return;

    const userHasVoted = video.votedBy.includes(username);
    if (userHasVoted) {
      socket?.emit('unvote-video', { videoId });
    } else {
      socket?.emit('vote-video', { videoId });
    }
  };

  return (
    <div className="p-2 md:p-4">
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <h2 className="font-semibold text-base md:text-lg">Video Queue</h2>
        <span className="text-xs md:text-sm text-muted-foreground">
          {room.queue.length} {room.queue.length === 1 ? 'video' : 'videos'}
        </span>
      </div>

      {isUserInRoom ? (
        <div className="flex gap-1.5 md:gap-2 mb-2 md:mb-4">
          <Input
            data-testid="input-queue-video-url"
            placeholder="Add YouTube URL to queue..."
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
            className="text-sm"
          />
          <Button
            data-testid="button-add-to-queue"
            onClick={handleAddVideo}
            disabled={!videoUrl.trim()}
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="bg-muted text-muted-foreground text-xs md:text-sm p-3 rounded-md text-center mb-2 md:mb-4">
          Join the room to manage the video queue
        </div>
      )}

      <ScrollArea className="h-64">
        {room.queue.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs md:text-sm py-6 md:py-8">
            Queue is empty. Add videos to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {room.queue.map((video) => {
              const userHasVoted = video.votedBy.includes(username);
              return (
                <div
                  key={video.id}
                  className="flex items-center gap-2 p-2 rounded-md hover-elevate group border border-border"
                  data-testid={`video-queue-item-${video.id}`}
                >
                  <div className="relative w-24 h-14 flex-shrink-0 bg-muted rounded overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm truncate font-medium" title={video.title}>
                      {video.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Added by {video.addedBy}
                    </p>
                  </div>
                  {isUserInRoom && (
                    <div className="flex gap-1 flex-shrink-0 items-center">
                      <Button
                        data-testid={`button-vote-video-${video.id}`}
                        onClick={() => handleVoteVideo(video.videoId)}
                        size="icon"
                        variant={userHasVoted ? "default" : "ghost"}
                        className="h-8 w-8"
                        title={userHasVoted ? "Unlike" : "Like"}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" fill={userHasVoted ? "currentColor" : "none"} />
                      </Button>
                      <span className="text-xs font-semibold min-w-[1.5rem] text-center" data-testid={`text-votes-${video.id}`}>
                        {video.votes}
                      </span>
                      <Button
                        data-testid={`button-play-video-${video.id}`}
                        onClick={() => handlePlayVideo(video.videoId)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Play className="w-3.5 h-3.5" fill="currentColor" />
                      </Button>
                      <Button
                        data-testid={`button-remove-video-${video.id}`}
                        onClick={() => handleRemoveVideo(video.videoId)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
