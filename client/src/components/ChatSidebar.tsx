import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { ChatMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ChatSidebarProps {
  socket: Socket | null;
  roomId: string;
  username: string;
  messages: ChatMessage[];
  typingUsers: string[];
}

export default function ChatSidebar({
  socket,
  roomId,
  username,
  messages,
  typingUsers,
}: ChatSidebarProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        const scrollViewport = scrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollViewport) {
          scrollViewport.scrollTop = scrollViewport.scrollHeight;
        }
      }
    }, 0);
  }, [messages]);

  const handleTyping = (value: string) => {
    setMessage(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      socket?.emit("typing-start");
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit("typing-stop");
    }, 2000);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    socket?.emit("send-message", { message: message.trim() });
    setMessage("");
    setIsTyping(false);
    socket?.emit("typing-stop");

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      <div className="p-2 md:p-4 border-b border-border flex-shrink-0">
        <h2 className="font-semibold text-base md:text-lg">Chat</h2>
      </div>

      <div className="flex-1 min-h-0 flex flex-col-reverse lg:flex-col">
        <div className="flex-1 min-h-0 relative" ref={scrollRef}>
          <ScrollArea className="h-full w-full p-2 md:p-4 pt-3 lg:pt-0">
            <div className="space-y-2 md:space-y-3 flex flex-col-reverse lg:flex-col">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs md:text-sm py-4 md:py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-0.5 md:gap-1 ${
                      msg.username === username ? "items-end" : "items-start"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <span
                        className="text-xs font-semibold"
                        data-testid={`text-message-username-${msg.id}`}
                      >
                        {msg.username}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {formatDistanceToNow(msg.timestamp, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div
                      className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg max-w-[85%] md:max-w-[80%] break-words text-sm ${
                        msg.username === username
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                      data-testid={`text-message-content-${msg.id}`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {typingUsers.length > 0 && (
              <div
                className="mt-3 text-sm text-muted-foreground italic"
                data-testid="text-typing-indicator"
              >
                {typingUsers.join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </div>
            )}
          </ScrollArea>
        </div>

        <div
          className="sticky top-0 z-20 bg-background border-b p-2
    lg:static lg:z-auto lg:border-t lg:border-b-0 lg:p-4
    flex-shrink-0"
        >
          <div className="flex gap-1.5 md:gap-2">
            <Input
              data-testid="input-chat-message"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              maxLength={500}
              className="text-sm"
            />
            <Button
              data-testid="button-send-message"
              onClick={handleSendMessage}
              disabled={!message.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
