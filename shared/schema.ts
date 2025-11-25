import { z } from "zod";

// Room Management
export const roomSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  users: z.array(z.object({
    id: z.string(),
    username: z.string(),
    socketId: z.string(),
  })),
  currentVideo: z.object({
    videoId: z.string(),
    title: z.string(),
    thumbnailUrl: z.string(),
  }).nullable(),
  queue: z.array(z.object({
    id: z.string(),
    videoId: z.string(),
    title: z.string(),
    thumbnailUrl: z.string(),
    addedBy: z.string(),
    votes: z.number().default(0),
    votedBy: z.array(z.string()).default([]),
  })),
});

export type Room = z.infer<typeof roomSchema>;
export type RoomUser = Room['users'][0];
export type QueueVideo = Room['queue'][0];

// Chat Messages
export const chatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Activity Feed
export const activitySchema = z.object({
  id: z.string(),
  roomId: z.string(),
  type: z.enum([
    "user_join",
    "user_leave",
    "video_play",
    "video_pause",
    "video_seek",
    "video_load",
    "video_add_queue",
    "video_add",
    "video_remove",
  ]),
  username: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional(),
});

export type Activity = z.infer<typeof activitySchema>;

// Video State (for WebRTC sync)
export const videoStateSchema = z.object({
  action: z.enum(['play', 'pause', 'seek', 'load']),
  currentTime: z.number().optional(),
  videoId: z.string().optional(),
  title: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  username: z.string(),
});

export type VideoState = z.infer<typeof videoStateSchema>;

// Client -> Server Events
export const createRoomSchema = z.object({
  username: z.string().min(1).max(50),
});

export const joinRoomSchema = z.object({
  roomId: z.string(),
  username: z.string().min(1).max(50),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(500),
});

export const addVideoSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  thumbnailUrl: z.string(),
});

export const removeVideoSchema = z.object({
  videoId: z.string(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type AddVideoInput = z.infer<typeof addVideoSchema>;
export type RemoveVideoInput = z.infer<typeof removeVideoSchema>;

// WebRTC Signaling
export const webrtcSignalSchema = z.object({
  type: z.enum(['offer', 'answer', 'ice-candidate']),
  targetSocketId: z.string(),
  payload: z.any(),
});

export type WebRTCSignal = z.infer<typeof webrtcSignalSchema>;
