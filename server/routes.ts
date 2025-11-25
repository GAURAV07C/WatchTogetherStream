import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { z } from "zod";
import type { 
  CreateRoomInput, 
  JoinRoomInput, 
  SendMessageInput,
  AddVideoInput,
  RemoveVideoInput,
  VideoState,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io',
  });

  // Typing timeout tracking
  const typingTimeouts = new Map<string, NodeJS.Timeout>();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Create Room
    socket.on("create-room", async (data: JoinRoomInput) => {
      try {
        const room = await storage.createRoom(data.roomId, data.username, socket.id);
        socket.join(room.id);
        
        socket.emit("room-joined", { room });
        console.log(`Room created: ${room.id} by ${data.username}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to create room" });
      }
    });

    // Join Room
    socket.on("join-room", async (data: JoinRoomInput) => {
      try {
        const room = await storage.addUserToRoom(data.roomId, data.username, socket.id);
        
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        socket.join(room.id);
        socket.emit("room-joined", { room });
        
        // Notify other users
        socket.to(room.id).emit("user-joined", { 
          username: data.username, 
          socketId: socket.id 
        });
        
        // Broadcast updated room state
        io.to(room.id).emit("room-updated", { room });
        
        // Send activity to all
        const activity = await storage.addActivity(room.id, 'user_join', data.username);
        io.to(room.id).emit("activity", activity);
        
        console.log(`${data.username} joined room ${room.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to join room";
        socket.emit("error", { message: errorMessage });
      }
    });

    // Send Message
    socket.on("send-message", async (data: SendMessageInput) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const message = await storage.addMessage(
          userInfo.roomId,
          userInfo.user.username,
          data.message
        );

        io.to(userInfo.roomId).emit("chat-message", message);
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing Indicators
    socket.on("typing-start", async () => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        // Clear existing timeout
        if (typingTimeouts.has(socket.id)) {
          clearTimeout(typingTimeouts.get(socket.id));
        }

        socket.to(userInfo.roomId).emit("typing-start", { 
          username: userInfo.user.username 
        });

        // Auto-stop after 3 seconds
        const timeout = setTimeout(() => {
          socket.to(userInfo.roomId).emit("typing-stop", { 
            username: userInfo.user.username 
          });
          typingTimeouts.delete(socket.id);
        }, 3000);

        typingTimeouts.set(socket.id, timeout);
      } catch (error) {
        // Silent fail
      }
    });

    socket.on("typing-stop", async () => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        // Clear timeout
        if (typingTimeouts.has(socket.id)) {
          clearTimeout(typingTimeouts.get(socket.id));
          typingTimeouts.delete(socket.id);
        }

        socket.to(userInfo.roomId).emit("typing-stop", { 
          username: userInfo.user.username 
        });
      } catch (error) {
        // Silent fail
      }
    });

    // Video State (Socket.IO backup for WebRTC)
    socket.on("video-state", async (data: VideoState) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        socket.to(userInfo.roomId).emit("video-state", data);
      } catch (error) {
        // Silent fail
      }
    });

    // Activity Feed
    socket.on("activity", async (data: { type: string; username: string; metadata?: any }) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const activity = await storage.addActivity(
          userInfo.roomId,
          data.type as any,
          data.username,
          data.metadata
        );

        io.to(userInfo.roomId).emit("activity", activity);
      } catch (error) {
        // Silent fail
      }
    });

    // Video Queue Management
    socket.on("add-video", async (data: AddVideoInput) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const room = await storage.addVideoToQueue(
          userInfo.roomId,
          data.videoId,
          data.title,
          data.thumbnailUrl,
          userInfo.user.username
        );

        if (room) {
          io.to(userInfo.roomId).emit("room-updated", { room });
          
          const activity = await storage.addActivity(
            userInfo.roomId,
            'video_add_queue',
            userInfo.user.username,
            { videoId: data.videoId, title: data.title }
          );
          io.to(userInfo.roomId).emit("activity", activity);
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to add video" });
      }
    });

    socket.on("remove-video", async (data: RemoveVideoInput) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const room = await storage.removeVideoFromQueue(userInfo.roomId, data.videoId);

        if (room) {
          io.to(userInfo.roomId).emit("room-updated", { room });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to remove video" });
      }
    });

    socket.on("load-video", async (data: AddVideoInput) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const room = await storage.setCurrentVideo(
          userInfo.roomId,
          data.videoId,
          data.title,
          data.thumbnailUrl
        );

        if (room) {
          io.to(userInfo.roomId).emit("room-updated", { room });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to load video" });
      }
    });

    socket.on("vote-video", async (data: { videoId: string }) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const room = await storage.voteVideo(
          userInfo.roomId,
          data.videoId,
          userInfo.user.username
        );

        if (room) {
          io.to(userInfo.roomId).emit("room-updated", { room });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to vote on video" });
      }
    });

    socket.on("unvote-video", async (data: { videoId: string }) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const room = await storage.unvoteVideo(
          userInfo.roomId,
          data.videoId,
          userInfo.user.username
        );

        if (room) {
          io.to(userInfo.roomId).emit("room-updated", { room });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to unvote video" });
      }
    });

    // WebRTC Signaling
    socket.on("webrtc-offer", (data: { to: string; offer: RTCSessionDescriptionInit }) => {
      socket.to(data.to).emit("webrtc-offer", {
        from: socket.id,
        offer: data.offer,
      });
    });

    socket.on("webrtc-answer", (data: { to: string; answer: RTCSessionDescriptionInit }) => {
      socket.to(data.to).emit("webrtc-answer", {
        from: socket.id,
        answer: data.answer,
      });
    });

    socket.on("webrtc-ice-candidate", (data: { to: string; candidate: RTCIceCandidateInit }) => {
      socket.to(data.to).emit("webrtc-ice-candidate", {
        from: socket.id,
        candidate: data.candidate,
      });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      try {
        // Clear typing timeout
        if (typingTimeouts.has(socket.id)) {
          clearTimeout(typingTimeouts.get(socket.id));
          typingTimeouts.delete(socket.id);
        }

        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;

        const { room, username } = await storage.removeUserFromRoom(userInfo.roomId, socket.id);

        if (room && username) {
          // Notify other users
          socket.to(userInfo.roomId).emit("user-left", { 
            username, 
            socketId: socket.id 
          });
          
          io.to(userInfo.roomId).emit("room-updated", { room });
          
          const activity = await storage.addActivity(userInfo.roomId, 'user_leave', username);
          io.to(userInfo.roomId).emit("activity", activity);
        }

        console.log("Client disconnected:", socket.id);
      } catch (error) {
        console.error("Error on disconnect:", error);
      }
    });
  });

  return httpServer;
}
