import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Users, MessageSquare, ListVideo } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const prefilledRoomId = searchParams.get('roomId');
  const shouldJoin = searchParams.get('join') === 'true';
  
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(shouldJoin ? "join" : "create");

  // Prefill room code if redirected from room page
  useEffect(() => {
    if (prefilledRoomId) {
      setRoomCode(prefilledRoomId);
    }
  }, [prefilledRoomId]);

  const handleCreateRoom = () => {
    if (!username.trim()) return;
    setIsCreating(true);
    // Generate random room code
    const newRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setLocation(`/room/${newRoomId}?username=${encodeURIComponent(username)}&create=true`);
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomCode.trim()) return;
    setIsJoining(true);
    setLocation(`/room/${roomCode.toUpperCase()}?username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
            <Play className="w-8 h-8 md:w-12 md:h-12 text-primary" fill="currentColor" />
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Watch Together</h1>
          </div>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Watch YouTube videos in perfect sync with friends. Real-time chat, synchronized playback, and collaborative playlists.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" data-testid="tab-create">Create Room</TabsTrigger>
            <TabsTrigger value="join" data-testid="tab-join">Join Room</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <Card className="hover-elevate transition-all">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle>Create Room</CardTitle>
                </div>
                <CardDescription>
                  Start a new watch party and invite friends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-username">Your Name</Label>
                  <Input
                    id="create-username"
                    data-testid="input-create-username"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                    maxLength={50}
                  />
                </div>
                <Button
                  data-testid="button-create-room"
                  onClick={handleCreateRoom}
                  disabled={!username.trim() || isCreating}
                  className="w-full"
                  size="lg"
                >
                  {isCreating ? "Creating..." : "Create Room"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="hover-elevate transition-all">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-5 h-5 text-primary" />
                  <CardTitle>Join Room</CardTitle>
                </div>
                <CardDescription>
                  Enter a room code to join an existing party
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="join-username">Your Name</Label>
                  <Input
                    id="join-username"
                    data-testid="input-join-username"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join-roomcode">Room Code</Label>
                  <Input
                    id="join-roomcode"
                    data-testid="input-room-code"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    className="font-mono text-lg tracking-wider"
                    maxLength={8}
                  />
                </div>
                <Button
                  data-testid="button-join-room"
                  onClick={handleJoinRoom}
                  disabled={!username.trim() || !roomCode.trim() || isJoining}
                  className="w-full"
                  size="lg"
                  variant="secondary"
                >
                  {isJoining ? "Joining..." : "Join Room"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Play className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-sm md:text-base font-semibold">Synchronized Playback</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Watch videos in perfect sync with ultra-low latency using WebRTC
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-sm md:text-base font-semibold">Real-Time Chat</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Chat with friends while watching with live typing indicators
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ListVideo className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-sm md:text-base font-semibold">Shared Playlist</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Build and manage a collaborative video queue together
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
