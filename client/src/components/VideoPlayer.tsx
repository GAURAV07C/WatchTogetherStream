import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Play, Pause, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Socket } from "socket.io-client";
import type { Room, VideoState } from "@shared/schema";

interface VideoPlayerProps {
  socket: Socket | null;
  room: Room;
  username: string;
  onBroadcastVideoState: (state: VideoState) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideoPlayer({ socket, room, username, onBroadcastVideoState }: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRemote, setIsRemote] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const { toast } = useToast();

  // Check if user is in the room
  const isUserInRoom = room.users.some(u => u.username === username);

  // Extract YouTube video ID from URL
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

  // Initialize YouTube Player
  useEffect(() => {
    const initPlayer = () => {
      if (window.YT && containerRef.current) {
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: room.currentVideo?.videoId || '',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: () => setIsReady(true),
            onStateChange: handlePlayerStateChange,
          },
        });
      }
    };

    if (window.YT) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);


    useEffect(() => {
    if (playerRef.current && isReady && room.currentVideo?.videoId) {
      playerRef.current.loadVideoById(room.currentVideo.videoId);
    }
  }, [room.currentVideo?.videoId, isReady]);

  // Handle remote video state changes from WebRTC
  useEffect(() => {
    const handleRemoteState = (event: CustomEvent<VideoState>) => {
      const state = event.detail;
      setIsRemote(true);

      if (!playerRef.current || !isReady) return;

      switch (state.action) {
        case 'play':
          playerRef.current.playVideo();
          break;
        case 'pause':
          playerRef.current.pauseVideo();
          break;
        case 'seek':
          if (state.currentTime !== undefined) {
            playerRef.current.seekTo(state.currentTime, true);
          }
          break;
        case 'load':
          if (state.videoId) {
            playerRef.current.loadVideoById(state.videoId);
          }
          break;
      }

      setTimeout(() => setIsRemote(false), 100);
    };

    window.addEventListener('remote-video-state', handleRemoteState as EventListener);
    return () => {
      window.removeEventListener('remote-video-state', handleRemoteState as EventListener);
    };
  }, [isReady]);

  const handlePlayerStateChange = (event: any) => {
    if (isRemote) return;

    const state = event.data;
    const currentTime = playerRef.current?.getCurrentTime() || 0;

    if (state === window.YT.PlayerState.PLAYING) {
      broadcastAndEmit({
        action: 'play',
        currentTime,
        username,
      });
      socket?.emit('activity', {
        type: 'video_play',
        username,
        metadata: { currentTime },
      });
    } else if (state === window.YT.PlayerState.PAUSED) {
      broadcastAndEmit({
        action: 'pause',
        currentTime,
        username,
      });
      socket?.emit('activity', {
        type: 'video_pause',
        username,
        metadata: { currentTime },
      });
    }
  };

  const broadcastAndEmit = (state: VideoState) => {
    onBroadcastVideoState(state);
    socket?.emit('video-state', state);
  };

  const handleLoadVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (playerRef.current && isReady) {
      playerRef.current.loadVideoById(videoId);
      broadcastAndEmit({
        action: 'load',
        videoId,
        username,
      });
      socket?.emit('activity', {
        type: 'video_load',
        username,
        metadata: { videoId },
      });
      socket?.emit('load-video', {
        videoId,
        title: 'YouTube Video',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      });
      setVideoUrl("");
      toast({
        title: "Video loaded",
        description: "Video synced with all viewers",
      });
    }
  };

  const handleSeek = (seconds: number) => {
    if (playerRef.current && isReady) {
      const currentTime = playerRef.current.getCurrentTime();
      const newTime = Math.max(0, currentTime + seconds);
      playerRef.current.seekTo(newTime, true);
      broadcastAndEmit({
        action: 'seek',
        currentTime: newTime,
        username,
      });
      socket?.emit('activity', {
        type: 'video_seek',
        username,
        metadata: { time: newTime },
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-black relative" ref={containerRef}>
        <div id="youtube-player" className="absolute inset-0"></div>
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-4">
        {!isUserInRoom && (
          <div className="bg-muted text-muted-foreground text-sm p-3 rounded-md text-center">
            Join the room to control video playback
          </div>
        )}
        <div className="flex gap-2">
          <Input
            data-testid="input-video-url"
            placeholder="Paste YouTube URL here..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && isUserInRoom && handleLoadVideo()}
            disabled={!isUserInRoom}
          />
          <Button
            data-testid="button-load-video"
            onClick={handleLoadVideo}
            disabled={!videoUrl.trim() || !isUserInRoom}
          >
            <Plus className="w-4 h-4 mr-2" />
            Load
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            data-testid="button-seek-back"
            onClick={() => handleSeek(-10)}
            variant="secondary"
            size="sm"
            disabled={!isUserInRoom}
          >
            -10s
          </Button>
          <Button
            data-testid="button-seek-forward"
            onClick={() => handleSeek(10)}
            variant="secondary"
            size="sm"
            disabled={!isUserInRoom}
          >
            +10s
          </Button>
        </div>
      </div>
    </Card>
  );
}
