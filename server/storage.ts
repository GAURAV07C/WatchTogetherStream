import { randomUUID } from "crypto";
import type { Room, RoomUser, ChatMessage, Activity, QueueVideo } from "@shared/schema";

export interface IStorage {
  // Room management
  createRoom(roomId: string, username: string, socketId: string): Promise<Room>;
  getRoom(roomId: string): Promise<Room | undefined>;
  addUserToRoom(roomId: string, username: string, socketId: string): Promise<Room | undefined>;
  removeUserFromRoom(roomId: string, socketId: string): Promise<{ room: Room | undefined; username: string | undefined }>;
  getUserBySocketId(socketId: string): Promise<{ roomId: string; user: RoomUser } | undefined>;
  
  // Chat messages
  addMessage(roomId: string, username: string, message: string): Promise<ChatMessage>;
  getMessages(roomId: string): Promise<ChatMessage[]>;
  
  // Activities
  addActivity(roomId: string, type: Activity['type'], username: string, metadata?: Record<string, any>): Promise<Activity>;
  getActivities(roomId: string): Promise<Activity[]>;
  
  // Video queue
  addVideoToQueue(roomId: string, videoId: string, title: string, thumbnailUrl: string, addedBy: string): Promise<Room | undefined>;
  removeVideoFromQueue(roomId: string, videoId: string): Promise<Room | undefined>;
  setCurrentVideo(roomId: string, videoId: string, title: string, thumbnailUrl: string): Promise<Room | undefined>;
  voteVideo(roomId: string, videoId: string, username: string): Promise<Room | undefined>;
  unvoteVideo(roomId: string, videoId: string, username: string): Promise<Room | undefined>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room>;
  private messages: Map<string, ChatMessage[]>;
  private activities: Map<string, Activity[]>;
  private socketToRoom: Map<string, string>;

  constructor() {
    this.rooms = new Map();
    this.messages = new Map();
    this.activities = new Map();
    this.socketToRoom = new Map();
  }

  async createRoom(roomId: string, username: string, socketId: string): Promise<Room> {
    const room: Room = {
      id: roomId,
      createdAt: Date.now(),
      users: [{
        id: randomUUID(),
        username,
        socketId,
      }],
      currentVideo: null,
      queue: [],
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketId, roomId);
    this.messages.set(roomId, []);
    this.activities.set(roomId, []);

    await this.addActivity(roomId, 'user_join', username);

    return room;
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    return this.rooms.get(roomId);
  }

  async addUserToRoom(roomId: string, username: string, socketId: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    // Check if username is already taken by a different socket
    const existingUser = room.users.find(u => u.username === username);
    if (existingUser && existingUser.socketId !== socketId) {
      throw new Error('Username already taken in this room');
    }

    // If same socket reconnecting, update the user
    if (existingUser && existingUser.socketId === socketId) {
      // User reconnecting - no changes needed
    } else {
      // New user joining
      room.users.push({
        id: randomUUID(),
        username,
        socketId,
      });
    }

    this.socketToRoom.set(socketId, roomId);
    this.rooms.set(roomId, room);

    await this.addActivity(roomId, 'user_join', username);

    return room;
  }

  async removeUserFromRoom(roomId: string, socketId: string): Promise<{ room: Room | undefined; username: string | undefined }> {
    const room = this.rooms.get(roomId);
    if (!room) return { room: undefined, username: undefined };

    const userIndex = room.users.findIndex(u => u.socketId === socketId);
    if (userIndex === -1) return { room, username: undefined };

    const [removedUser] = room.users.splice(userIndex, 1);
    this.socketToRoom.delete(socketId);

    await this.addActivity(roomId, 'user_leave', removedUser.username);

    // Clean up empty rooms
    if (room.users.length === 0) {
      this.rooms.delete(roomId);
      this.messages.delete(roomId);
      this.activities.delete(roomId);
      return { room: undefined, username: removedUser.username };
    }

    this.rooms.set(roomId, room);
    return { room, username: removedUser.username };
  }

  async getUserBySocketId(socketId: string): Promise<{ roomId: string; user: RoomUser } | undefined> {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return undefined;

    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const user = room.users.find(u => u.socketId === socketId);
    if (!user) return undefined;

    return { roomId, user };
  }

  async addMessage(roomId: string, username: string, message: string): Promise<ChatMessage> {
    const chatMessage: ChatMessage = {
      id: randomUUID(),
      roomId,
      username,
      message,
      timestamp: Date.now(),
    };

    const messages = this.messages.get(roomId) || [];
    messages.push(chatMessage);
    this.messages.set(roomId, messages);

    return chatMessage;
  }

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    return this.messages.get(roomId) || [];
  }

  async addActivity(roomId: string, type: Activity['type'], username: string, metadata?: Record<string, any>): Promise<Activity> {
    const activity: Activity = {
      id: randomUUID(),
      roomId,
      type,
      username,
      timestamp: Date.now(),
      metadata,
    };

    const activities = this.activities.get(roomId) || [];
    activities.push(activity);
    this.activities.set(roomId, activities);

    return activity;
  }

  async getActivities(roomId: string): Promise<Activity[]> {
    return this.activities.get(roomId) || [];
  }

  async addVideoToQueue(roomId: string, videoId: string, title: string, thumbnailUrl: string, addedBy: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const queueVideo: QueueVideo = {
      id: randomUUID(),
      videoId,
      title,
      thumbnailUrl,
      addedBy,
      votes: 0,
      votedBy: [],
    };

    room.queue.push(queueVideo);
    this.rooms.set(roomId, room);

    await this.addActivity(roomId, 'video_add_queue', addedBy, { videoId, title });

    return room;
  }

  async removeVideoFromQueue(roomId: string, videoId: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const index = room.queue.findIndex(v => v.videoId === videoId);
    if (index !== -1) {
      room.queue.splice(index, 1);
      this.rooms.set(roomId, room);
    }

    return room;
  }

  async setCurrentVideo(roomId: string, videoId: string, title: string, thumbnailUrl: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    room.currentVideo = { videoId, title, thumbnailUrl };
    this.rooms.set(roomId, room);

    return room;
  }

  async voteVideo(roomId: string, videoId: string, username: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const video = room.queue.find(v => v.videoId === videoId);
    if (!video) return room;

    if (!video.votedBy.includes(username)) {
      video.votes += 1;
      video.votedBy.push(username);
      
      // Sort queue by votes (highest first)
      room.queue.sort((a, b) => b.votes - a.votes);
      
      this.rooms.set(roomId, room);
    }

    return room;
  }

  async unvoteVideo(roomId: string, videoId: string, username: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const video = room.queue.find(v => v.videoId === videoId);
    if (!video) return room;

    const voteIndex = video.votedBy.indexOf(username);
    if (voteIndex !== -1) {
      video.votes -= 1;
      video.votedBy.splice(voteIndex, 1);
      
      // Sort queue by votes (highest first)
      room.queue.sort((a, b) => b.votes - a.votes);
      
      this.rooms.set(roomId, room);
    }

    return room;
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

export const storage = new MemStorage();
