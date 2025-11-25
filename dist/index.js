// server/index-prod.ts
import fs from "node:fs";
import path from "node:path";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  constructor() {
    this.rooms = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
    this.activities = /* @__PURE__ */ new Map();
    this.socketToRoom = /* @__PURE__ */ new Map();
  }
  async createRoom(roomId, username, socketId) {
    const room = {
      id: roomId,
      createdAt: Date.now(),
      users: [{
        id: randomUUID(),
        username,
        socketId
      }],
      currentVideo: null,
      queue: []
    };
    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketId, roomId);
    this.messages.set(roomId, []);
    this.activities.set(roomId, []);
    await this.addActivity(roomId, "user_join", username);
    return room;
  }
  async getRoom(roomId) {
    return this.rooms.get(roomId);
  }
  async addUserToRoom(roomId, username, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return void 0;
    const existingUser = room.users.find((u) => u.username === username);
    if (existingUser && existingUser.socketId !== socketId) {
      throw new Error("Username already taken in this room");
    }
    if (existingUser && existingUser.socketId === socketId) {
    } else {
      room.users.push({
        id: randomUUID(),
        username,
        socketId
      });
    }
    this.socketToRoom.set(socketId, roomId);
    this.rooms.set(roomId, room);
    await this.addActivity(roomId, "user_join", username);
    return room;
  }
  async removeUserFromRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { room: void 0, username: void 0 };
    const userIndex = room.users.findIndex((u) => u.socketId === socketId);
    if (userIndex === -1) return { room, username: void 0 };
    const [removedUser] = room.users.splice(userIndex, 1);
    this.socketToRoom.delete(socketId);
    await this.addActivity(roomId, "user_leave", removedUser.username);
    if (room.users.length === 0) {
      this.rooms.delete(roomId);
      this.messages.delete(roomId);
      this.activities.delete(roomId);
      return { room: void 0, username: removedUser.username };
    }
    this.rooms.set(roomId, room);
    return { room, username: removedUser.username };
  }
  async getUserBySocketId(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return void 0;
    const room = this.rooms.get(roomId);
    if (!room) return void 0;
    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return void 0;
    return { roomId, user };
  }
  async addMessage(roomId, username, message) {
    const chatMessage = {
      id: randomUUID(),
      roomId,
      username,
      message,
      timestamp: Date.now()
    };
    const messages = this.messages.get(roomId) || [];
    messages.push(chatMessage);
    this.messages.set(roomId, messages);
    return chatMessage;
  }
  async getMessages(roomId) {
    return this.messages.get(roomId) || [];
  }
  async addActivity(roomId, type, username, metadata) {
    const activity = {
      id: randomUUID(),
      roomId,
      type,
      username,
      timestamp: Date.now(),
      metadata
    };
    const activities = this.activities.get(roomId) || [];
    activities.push(activity);
    this.activities.set(roomId, activities);
    return activity;
  }
  async getActivities(roomId) {
    return this.activities.get(roomId) || [];
  }
  async addVideoToQueue(roomId, videoId, title, thumbnailUrl, addedBy) {
    const room = this.rooms.get(roomId);
    if (!room) return void 0;
    const queueVideo = {
      id: randomUUID(),
      videoId,
      title,
      thumbnailUrl,
      addedBy,
      votes: 0,
      votedBy: []
    };
    room.queue.push(queueVideo);
    this.rooms.set(roomId, room);
    await this.addActivity(roomId, "video_add_queue", addedBy, { videoId, title });
    return room;
  }
  async removeVideoFromQueue(roomId, videoId) {
    const room = this.rooms.get(roomId);
    if (!room) return void 0;
    const index = room.queue.findIndex((v) => v.videoId === videoId);
    if (index !== -1) {
      room.queue.splice(index, 1);
      this.rooms.set(roomId, room);
    }
    return room;
  }
  async setCurrentVideo(roomId, videoId, title, thumbnailUrl) {
    const room = this.rooms.get(roomId);
    if (!room) return void 0;
    room.currentVideo = { videoId, title, thumbnailUrl };
    this.rooms.set(roomId, room);
    return room;
  }
  async voteVideo(roomId, videoId, username) {
    const room = this.rooms.get(roomId);
    if (!room) return void 0;
    const video = room.queue.find((v) => v.videoId === videoId);
    if (!video) return room;
    if (!video.votedBy.includes(username)) {
      video.votes += 1;
      video.votedBy.push(username);
      room.queue.sort((a, b) => b.votes - a.votes);
      this.rooms.set(roomId, room);
    }
    return room;
  }
  async unvoteVideo(roomId, videoId, username) {
    const room = this.rooms.get(roomId);
    if (!room) return void 0;
    const video = room.queue.find((v) => v.videoId === videoId);
    if (!video) return room;
    const voteIndex = video.votedBy.indexOf(username);
    if (voteIndex !== -1) {
      video.votes -= 1;
      video.votedBy.splice(voteIndex, 1);
      room.queue.sort((a, b) => b.votes - a.votes);
      this.rooms.set(roomId, room);
    }
    return room;
  }
  generateRoomId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
};
var storage = new MemStorage();

// server/routes.ts
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: "/socket.io"
  });
  const typingTimeouts = /* @__PURE__ */ new Map();
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("create-room", async (data) => {
      try {
        const room = await storage.createRoom(data.roomId, data.username, socket.id);
        socket.join(room.id);
        socket.emit("room-joined", { room });
        console.log(`Room created: ${room.id} by ${data.username}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to create room" });
      }
    });
    socket.on("join-room", async (data) => {
      try {
        const room = await storage.addUserToRoom(data.roomId, data.username, socket.id);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }
        socket.join(room.id);
        socket.emit("room-joined", { room });
        socket.to(room.id).emit("user-joined", {
          username: data.username,
          socketId: socket.id
        });
        io.to(room.id).emit("room-updated", { room });
        const activity = await storage.addActivity(room.id, "user_join", data.username);
        io.to(room.id).emit("activity", activity);
        console.log(`${data.username} joined room ${room.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to join room";
        socket.emit("error", { message: errorMessage });
      }
    });
    socket.on("send-message", async (data) => {
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
    socket.on("typing-start", async () => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;
        if (typingTimeouts.has(socket.id)) {
          clearTimeout(typingTimeouts.get(socket.id));
        }
        socket.to(userInfo.roomId).emit("typing-start", {
          username: userInfo.user.username
        });
        const timeout = setTimeout(() => {
          socket.to(userInfo.roomId).emit("typing-stop", {
            username: userInfo.user.username
          });
          typingTimeouts.delete(socket.id);
        }, 3e3);
        typingTimeouts.set(socket.id, timeout);
      } catch (error) {
      }
    });
    socket.on("typing-stop", async () => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;
        if (typingTimeouts.has(socket.id)) {
          clearTimeout(typingTimeouts.get(socket.id));
          typingTimeouts.delete(socket.id);
        }
        socket.to(userInfo.roomId).emit("typing-stop", {
          username: userInfo.user.username
        });
      } catch (error) {
      }
    });
    socket.on("video-state", async (data) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;
        socket.to(userInfo.roomId).emit("video-state", data);
      } catch (error) {
      }
    });
    socket.on("activity", async (data) => {
      try {
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;
        const activity = await storage.addActivity(
          userInfo.roomId,
          data.type,
          data.username,
          data.metadata
        );
        io.to(userInfo.roomId).emit("activity", activity);
      } catch (error) {
      }
    });
    socket.on("add-video", async (data) => {
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
            "video_add_queue",
            userInfo.user.username,
            { videoId: data.videoId, title: data.title }
          );
          io.to(userInfo.roomId).emit("activity", activity);
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to add video" });
      }
    });
    socket.on("remove-video", async (data) => {
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
    socket.on("load-video", async (data) => {
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
    socket.on("vote-video", async (data) => {
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
    socket.on("unvote-video", async (data) => {
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
    socket.on("webrtc-offer", (data) => {
      socket.to(data.to).emit("webrtc-offer", {
        from: socket.id,
        offer: data.offer
      });
    });
    socket.on("webrtc-answer", (data) => {
      socket.to(data.to).emit("webrtc-answer", {
        from: socket.id,
        answer: data.answer
      });
    });
    socket.on("webrtc-ice-candidate", (data) => {
      socket.to(data.to).emit("webrtc-ice-candidate", {
        from: socket.id,
        candidate: data.candidate
      });
    });
    socket.on("disconnect", async () => {
      try {
        if (typingTimeouts.has(socket.id)) {
          clearTimeout(typingTimeouts.get(socket.id));
          typingTimeouts.delete(socket.id);
        }
        const userInfo = await storage.getUserBySocketId(socket.id);
        if (!userInfo) return;
        const { room, username } = await storage.removeUserFromRoom(userInfo.roomId, socket.id);
        if (room && username) {
          socket.to(userInfo.roomId).emit("user-left", {
            username,
            socketId: socket.id
          });
          io.to(userInfo.roomId).emit("room-updated", { room });
          const activity = await storage.addActivity(userInfo.roomId, "user_leave", username);
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

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
