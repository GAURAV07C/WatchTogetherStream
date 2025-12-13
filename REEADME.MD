# Watch Together - Real-Time Collaborative Video Viewing

A real-time web application where multiple users can watch YouTube videos together in perfect sync, featuring WebRTC DataChannels for ultra-low latency synchronization, Socket.IO for signaling, and a Netflix-inspired dark UI.

## Features

### Core Functionality
- **Room Management**: Create or join rooms with unique room codes
- **Real-Time Video Sync**: Watch YouTube videos in perfect synchronization using WebRTC DataChannels with Socket.IO fallback
- **Live Chat**: Send and receive messages instantly with typing indicators
- **Activity Feed**: See all user actions (joined, left, played, paused, seeked, loaded video)
- **Video Queue**: Collaborative playlist management - add, remove, and play videos from queue
- **User Presence**: See who's in the room with avatar indicators
- **Shareable Links**: Copy room links to invite friends

### Technical Implementation
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js with Socket.IO for real-time communication
- **WebRTC**: Peer-to-peer DataChannels for low-latency video state synchronization
- **YouTube Integration**: YouTube IFrame Player API for video playback
- **Storage**: In-memory storage (no database) for rooms, messages, and activities
- **Styling**: Netflix-inspired dark theme with responsive design

## Architecture

### Data Flow
1. **Room Creation/Joining**: 
   - User creates room → Server creates room with unique ID → User joins Socket.IO room
   - Other users join with room code → Server validates username uniqueness → Adds user to room
   
2. **WebRTC Signaling**:
   - When user joins, existing users initiate WebRTC peer connections
   - Offer/Answer/ICE candidates exchanged via Socket.IO
   - DataChannel established for direct peer-to-peer communication
   
3. **Video Synchronization**:
   - User controls video (play/pause/seek) → Broadcasts via WebRTC DataChannel + Socket.IO
   - Other users receive state change → Update their video player
   - Loop prevention using `isRemote` flag

4. **Chat & Activities**:
   - Messages sent via Socket.IO → Broadcast to all room members
   - Activity events tracked in server storage → Broadcast to room

### File Structure
```
client/
  src/
    pages/
      home.tsx          - Landing page with create/join room
      room.tsx          - Main room interface with WebRTC setup
    components/
      VideoPlayer.tsx   - YouTube player with sync logic
      ChatSidebar.tsx   - Real-time chat with typing indicators
      ActivityFeed.tsx  - User action feed
      VideoQueue.tsx    - Playlist management
      UserPresence.tsx  - Online users display
      
server/
  routes.ts            - Socket.IO event handlers and WebRTC signaling
  storage.ts           - In-memory storage for rooms, messages, activities
  
shared/
  schema.ts            - TypeScript types and Zod schemas
```

## Key Technologies

### WebRTC Implementation
- Uses RTCPeerConnection for peer-to-peer connections
- RTCDataChannel for sending video state updates (play, pause, seek, load)
- STUN server (stun.l.google.com:19302) for NAT traversal
- Socket.IO handles signaling (offer/answer/ICE candidate exchange)

### Socket.IO Events
**Client → Server:**
- `create-room`: Create new room
- `join-room`: Join existing room
- `send-message`: Send chat message
- `typing-start/stop`: Typing indicators
- `add-video`: Add video to queue
- `remove-video`: Remove video from queue
- `load-video`: Load video for all users
- `webrtc-offer/answer/ice-candidate`: WebRTC signaling

**Server → Client:**
- `room-joined`: Room data on successful join
- `room-updated`: Room state changes
- `user-joined/left`: User presence updates
- `chat-message`: New chat messages
- `activity`: User activity events
- `typing-start/stop`: Typing indicators
- `webrtc-offer/answer/ice-candidate`: WebRTC signaling relay
- `error`: Error messages

## Design System

### Color Palette
- **Primary**: Blue (#4F7FFF) - Netflix-inspired accent color
- **Background**: Very dark (#0A0A0A) - Black with slight warmth
- **Card**: Dark gray (#121212) - Elevated surfaces
- **Borders**: Subtle borders (#292929) - Minimal contrast
- **Text**: White/gray scale for hierarchy

### Typography
- **Font**: Inter for UI, JetBrains Mono for codes
- **Scale**: Consistent sizing for buttons, inputs, and text

### Components
- Built on Shadcn UI component library
- Custom hover/active states using elevate utilities
- Responsive design for mobile, tablet, and desktop

## Future Enhancements
- Persistent database for room history
- User avatars and profiles
- Video playback quality sync
- Reaction emojis and polls
- SFU architecture for scaling beyond 10 users
- Screen sharing support
- Audio chat integration

## Development

### Running the Application
```bash
npm run dev
```
Server runs on port 5000 with Vite HMR for frontend development.

### Testing
- Recommended: Test with multiple browser windows to verify real-time sync
- Create a room in one window, join from another with different username
- Test video playback sync, chat, queue management, and user presence

## Known Limitations
- In-memory storage: Rooms are lost on server restart
- Maximum 10 users per room (WebRTC mesh topology)
- No user authentication or persistent profiles
- Username uniqueness enforced per room only
- STUN-only WebRTC (no TURN server for strict NATs)

## Recent Changes
- **2024-11-24**: Initial implementation with WebRTC, Socket.IO, and full feature set
- Fixed room creation flow to properly use socket.id
- Added duplicate username validation
- Improved error handling with automatic redirect on failures
- Implemented WebRTC DataChannel signaling with Socket.IO fallback
- **Responsive Design**: Made fully mobile responsive with adaptive layouts
- **Layout Restructure**: Desktop has chat+queue in right sidebar (w-80), mobile has Sheet component for chat access
- **UX Improvements**: Removed activity feed toasts (inline feed only), floating chat button on mobile
- **Security**: Enforced room membership validation - users must join room before controlling video
- **Video Queue**: Displays as vertical list after chat in sidebar/sheet
