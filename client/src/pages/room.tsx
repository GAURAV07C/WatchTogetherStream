import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Copy, LogOut, MessageSquare } from "lucide-react";
import ChatSidebar from "@/components/ChatSidebar";
import VideoPlayer from "@/components/VideoPlayer";
import VideoQueue from "@/components/VideoQueue";
import UserPresence from "@/components/UserPresence";
import type { Room, ChatMessage, Activity, VideoState } from "@shared/schema";
import { motion } from "framer-motion";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = new URLSearchParams(useSearch());
  const username = searchParams.get("username");
  const isCreating = searchParams.get("create") === "true";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect to home if no username provided
  useEffect(() => {
    if (!username && params.roomId) {
      setLocation(`/?roomId=${params.roomId}&join=true`);
    }
  }, [username, params.roomId, setLocation]);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [queueVideoUrl, setQueueVideoUrl] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  // WebRTC state
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());

  useEffect(() => {
    if (!username) return;

    const newSocket = io({
      path: "/socket.io",
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      if (params.roomId) {
        if (isCreating) {
          newSocket.emit("create-room", { roomId: params.roomId, username });
        } else {
          newSocket.emit("join-room", { roomId: params.roomId, username });
        }
      }
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("room-joined", (data: { room: Room }) => {
      setRoom(data.room);
      toast({
        title: "Joined Room",
        description: `You joined ${data.room.users
          .map((u) => u.username)
          .join(", ")}`,
      });
    });

    newSocket.on("room-updated", (data: { room: Room }) => {
      setRoom(data.room);
    });

    newSocket.on(
      "user-joined",
      (data: { username: string; socketId: string }) => {
        if (data.username !== username) {
          // Initiate WebRTC connection as the caller
          initiateWebRTCConnection(data.socketId, newSocket);
          toast({
            title: "User Joined",
            description: `${data.username} joined the room`,
          });
        }
      }
    );

    newSocket.on(
      "user-left",
      (data: { username: string; socketId: string }) => {
        // Clean up WebRTC connection
        cleanupPeerConnection(data.socketId);
        toast({
          title: "User Left",
          description: `${data.username} left the room`,
        });
      }
    );

    newSocket.on("chat-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("activity", (activity: Activity) => {
      // Show toast for various activity types
      let title = "";
      let description = "";

      switch (activity.type) {
        case "video_play":
          title = "Video Playing";
          description = `${activity.username} started playback`;
          break;
        case "video_pause":
          title = "Video Paused";
          description = `${activity.username} paused playback`;
          break;
        case "video_seek":
          title = "Video Seeked";
          description = `${activity.username} jumped to ${Math.floor(
            activity.metadata?.time || 0
          )}s`;
          break;
        case "video_load":
          title = "Video Loaded";
          description = `${activity.username} loaded a new video`;
          break;
        case "video_add":
          title = "Video Added";
          description = `${activity.username} added a video to queue`;
          break;
        case "video_remove":
          title = "Video Removed";
          description = `${activity.username} removed a video from queue`;
          break;
      }

      if (title && description) {
        toast({
          title,
          description,
        });
      }
    });

    newSocket.on("typing-start", (data: { username: string }) => {
      setTypingUsers((prev) => [...new Set([...prev, data.username])]);
    });

    newSocket.on("typing-stop", (data: { username: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.username));
    });

    // WebRTC signaling - these events come from the server
    newSocket.on(
      "webrtc-offer",
      async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
        console.log("Received WebRTC offer from", data.from);
        await handleWebRTCOffer(data.from, data.offer, newSocket);
      }
    );

    newSocket.on(
      "webrtc-answer",
      async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
        console.log("Received WebRTC answer from", data.from);
        const pc = peerConnections.current.get(data.from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log("Set remote description for", data.from);
        }
      }
    );

    newSocket.on(
      "webrtc-ice-candidate",
      async (data: { from: string; candidate: RTCIceCandidateInit }) => {
        console.log("Received ICE candidate from", data.from);
        const pc = peerConnections.current.get(data.from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log("Added ICE candidate for", data.from);
        }
      }
    );

    newSocket.on("error", (error: { message: string }) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });

      // Redirect to home on critical errors
      if (
        error.message.includes("Room not found") ||
        error.message.includes("Username already taken") ||
        error.message.includes("Failed to create room")
      ) {
        setTimeout(() => {
          setLocation("/");
        }, 2000);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      // Clean up all peer connections
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      dataChannels.current.clear();
    };
  }, [params.roomId, username, isCreating]);

  const initiateWebRTCConnection = async (
    targetSocketId: string,
    socket: Socket
  ) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnections.current.set(targetSocketId, pc);

    // Create data channel
    const dc = pc.createDataChannel("videoSync");
    dataChannels.current.set(targetSocketId, dc);

    dc.onopen = () => {
      console.log("DataChannel opened with", targetSocketId);
    };

    dc.onmessage = (event) => {
      handleDataChannelMessage(event.data);
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          to: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc-offer", {
      to: targetSocketId,
      offer: pc.localDescription,
    });
  };

  const handleWebRTCOffer = async (
    fromSocketId: string,
    offer: RTCSessionDescriptionInit,
    socket: Socket
  ) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnections.current.set(fromSocketId, pc);

    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dataChannels.current.set(fromSocketId, dc);

      dc.onopen = () => {
        console.log("DataChannel opened with", fromSocketId);
      };

      dc.onmessage = (event) => {
        handleDataChannelMessage(event.data);
      };
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          to: fromSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Set remote description and create answer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("webrtc-answer", {
      to: fromSocketId,
      answer: pc.localDescription,
    });
  };

  const cleanupPeerConnection = (socketId: string) => {
    const pc = peerConnections.current.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(socketId);
    }
    dataChannels.current.delete(socketId);
  };

  const handleDataChannelMessage = (data: string) => {
    try {
      const videoState: VideoState = JSON.parse(data);
      // This will be handled by the VideoPlayer component
      window.dispatchEvent(
        new CustomEvent("remote-video-state", { detail: videoState })
      );
    } catch (error) {
      console.error("Failed to parse DataChannel message:", error);
    }
  };

  const broadcastVideoState = (videoState: VideoState) => {
    const message = JSON.stringify(videoState);
    dataChannels.current.forEach((dc) => {
      if (dc.readyState === "open") {
        dc.send(message);
      }
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${params.roomId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link with friends to invite them",
    });
  };

  const handleLeaveRoom = () => {
    setLocation("/");
  };

  if (!isConnected || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg text-muted-foreground">
            {!isConnected ? "Connecting to room..." : "Loading room data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center justify-between gap-2 md:gap-4 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <h1 className="text-base md:text-xl font-bold hidden sm:block">
              Watch Together
            </h1>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">
                Room:
              </span>
              <code
                className="px-1.5 py-0.5 md:px-2 md:py-1 rounded bg-muted font-mono text-xs md:text-sm font-semibold"
                data-testid="text-room-code"
              >
                {params.roomId}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            <UserPresence
              users={room.users}
              currentUsername={username as string}
            />
            <Button
              data-testid="button-copy-link"
              onClick={handleCopyLink}
              variant="secondary"
              size="sm"
              className="hidden sm:flex"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              data-testid="button-copy-link-mobile"
              onClick={handleCopyLink}
              variant="secondary"
              size="icon"
              className="sm:hidden"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              data-testid="button-leave-room"
              onClick={handleLeaveRoom}
              variant="destructive"
              size="sm"
              className="hidden sm:flex"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave
            </Button>
            <Button
              data-testid="button-leave-room-mobile"
              onClick={handleLeaveRoom}
              variant="destructive"
              size="icon"
              className="sm:hidden"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video + Queue (Mobile) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-3 md:p-4 overflow-y-auto pb-4 lg:pb-4">
            <VideoPlayer
              socket={socket}
              room={room}
              username={username || ""}
              onBroadcastVideoState={broadcastVideoState}
            />
            {/* Queue on Mobile - Always visible, rendered inline */}
            <div className="lg:hidden mt-4 md:mt-6">
              <VideoQueue
                socket={socket}
                room={room}
                username={username || ""}
                videoUrl={queueVideoUrl}
                onVideoUrlChange={setQueueVideoUrl}
              />
            </div>
          </div>
        </div>

        {/* Right: Chat + Queue Sidebar - Desktop only */}
        <div className="hidden lg:flex lg:w-80 flex-col border-l border-border bg-card">
          <div className="flex-1 overflow-hidden">
            <ChatSidebar
              socket={socket}
              roomId={params.roomId || ""}
              username={username || ""}
              messages={messages}
              typingUsers={typingUsers}
            />
          </div>
          {/* Queue on Desktop - In sidebar after chat */}
          <div className="border-t border-border">
            <VideoQueue
              socket={socket}
              room={room}
              username={username || ""}
              videoUrl={queueVideoUrl}
              onVideoUrlChange={setQueueVideoUrl}
            />
          </div>
        </div>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <motion.button
            drag
            dragConstraints={{
              top:0,
              left:10,
              right:10,
              bottom:350
            }}
            dragElastic={0.2}
            transition={{type:"spring", stiffness:300}}
            onClick={() => setChatOpen(true)}
            className="lg:hidden fixed z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center pointer-events-auto"
            style={{ top: 16, left: "calc(100vw - 72px)" }}
          >
            <MessageSquare className="h-6 w-6" />
          </motion.button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[55vh] p-0 lg:hidden ">
          <ChatSidebar
            socket={socket}
            roomId={params.roomId || ""}
            username={username || ""}
            messages={messages}
            typingUsers={typingUsers}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
