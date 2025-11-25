/**
 * ============================================================
 * WATCH TOGETHER - COMPLETE APPLICATION DOCUMENTATION (HINGLISH)
 * ============================================================
 * 
 * Yeh documentation sabhi functions, files, aur components ko explain karta hai.
 * Hinglish (Hindi + English) mein likha gaya hai taaki samajhna aasan ho.
 * 
 * APPLICATION OVERVIEW:
 * Watch Together ek real-time collaborative video watching app hai jispe
 * multiple users (10 tak) ek YouTube video ko sync mein dekh sakte hain,
 * chat kar sakte hain, aur video queue manage kar sakte hain.
 */

// ============================================================
// PART 1: SHARED SCHEMA (Shared/schema.ts) - Data Types
// ============================================================
/*
shared/schema.ts mein application ke sabhi data types define hain.
Yeh Zod (validation library) use karta hai data ko validate karne ke liye.

1. ROOM SCHEMA:
   - id: Room ka unique identifier (example: "A1B2C3D4")
   - createdAt: Room creation time (timestamp in milliseconds)
   - users: Array jo saare room members ho (with id, username, socketId)
   - currentVideo: Currently playing video ka detail (videoId, title, thumbnail)
   - queue: Array of videos jo queue mein hain playback ke liye

   Example:
   {
     id: "ROOM123",
     users: [{id: "user1", username: "Raj", socketId: "socket123"}],
     currentVideo: {videoId: "dQw4w9WgXcQ", title: "Song", thumbnailUrl: "..."},
     queue: [{id: "vid1", videoId: "xyz", title: "Video 1", addedBy: "Raj"}]
   }

2. CHAT MESSAGE SCHEMA:
   - id: Message ka unique ID
   - roomId: Kis room mein message bheja gaya
   - username: Kiye ne message bheja
   - message: Actual text message
   - timestamp: Kab bheja gaya

3. ACTIVITY SCHEMA:
   - type: Kya action hua (user_join, user_leave, video_play, video_pause, video_seek, video_load, video_add_queue)
   - username: Kisne action perform kiya
   - timestamp: Kab action hua
   
   Ye toast notifications ke liye use hota hai.

4. VIDEO STATE SCHEMA:
   - action: 'play', 'pause', 'seek', ya 'load'
   - currentTime: Video ka current playback time (seek ke liye)
   - videoId: YouTube video ID
   - username: Kiye ne action perform kiya
   
   Ye WebRTC DataChannels ke through broadcast hota hai to sync rakhe.

5. WEBRTC SIGNAL SCHEMA:
   - type: 'offer', 'answer', ya 'ice-candidate'
   - targetSocketId: Kaun sa user receive karega
   - payload: Signal ka actual data
*/

// ============================================================
// PART 2: BACKEND - SERVER/ROUTES.TS (Socket.IO Events)
// ============================================================
/*
Backend Express server ke liye routes define karte hain.
Socket.IO use hota hai real-time communication ke liye.

MAIN SERVER FUNCTIONS:

1. registerRoutes(app: Express)
   Sabhi Socket.IO events ko setup karta hai.
   HTTP server banata hai aur Socket.IO initialize karta hai.

2. socket.on("create-room", (data) => {})
   Jab user naya room create karna chata hai:
   - Username le lo
   - Random room code generate karo
   - Storage mein save karo
   - User ko room mein add karo
   - Emit karo "room-joined" event
   
   Example trigger: Home page par "Create Room" button click karte waqt

3. socket.on("join-room", (data) => {})
   Jab user existing room mein join karna chata hai:
   - Room ID check karo
   - Username check karo (duplicate ho to error)
   - User ko room mein add karo
   - Emit karo "room-joined"
   - Other users ko batao "user-joined"
   - Room update broadcast karo
   
   Example: Room code dal ke "Join" button click karte waqt

4. socket.on("send-message", (data) => {})
   Chat message send hone par:
   - Message ko validate karo (1-500 characters)
   - Storage mein save karo
   - Room ke sabhi members ko broadcast karo
   
   Example: Chat input mein type karke Enter press karte waqt

5. socket.on("typing-start" / "typing-stop")
   Typing indicator ke liye:
   - User type kar raha hai to 'typing-start' emit karo
   - 3 seconds baad automatically 'typing-stop' emit hota hai
   - Sabhi users ko dikh jaata hai ki "Someone is typing..."
   
   Example: Chat input mein kuch likha to typing indicator dikh jata hai

6. socket.on("add-video", (data) => {})
   Video queue mein add hone par:
   - Video ID extract karo
   - Queue mein add karo
   - Room update broadcast karo
   - Activity log karo
   
   Example: YouTube URL paste karke queue button press karte waqt

7. socket.on("remove-video", (data) => {})
   Video queue se remove hone par:
   - Queue se video hatao
   - Room update broadcast karo
   
   Example: Queue list mein delete icon click karte waqt

8. socket.on("load-video", (data) => {})
   Queue se video play karne par:
   - Current video set karo
   - Queue se remove karo (optional)
   - Sabhi users ko video update broadcast karo
   - Typing indicator clear karo
   
   Example: Queue list mein play icon click karte waqt

9. WebRTC Signaling Events:
   socket.on("webrtc-offer", "webrtc-answer", "webrtc-ice-candidate")
   - Peer-to-peer connection establish karte hain
   - Ultra-low latency communication ke liye
   - Video state sync karne ke liye
   
   Offer: User A -> User B ko connection ke liye offer
   Answer: User B -> User A ko accept kare
   ICE Candidate: NAT traversal ke liye candidates share karo

10. socket.on("disconnect")
    Jab user room leave kare ya disconnect hove:
    - User ko room se remove karo
    - Activity log karo
    - Room ke sabhi users ko notification send karo
    - Agar room empty ho gaya to delete karo
*/

// ============================================================
// PART 3: BACKEND - SERVER/STORAGE.TS (Data Persistence)
// ============================================================
/*
In-memory storage implement karta hai.
Real-time data ko RAM mein store karta hai (server restart par delete ho jata hai).

STORAGE CLASS METHODS:

1. createRoom(roomId, username, socketId)
   Naya room banata hai:
   - Room object banao
   - Users array mein first user add karo (room creator)
   - Queue empty rakho
   - Messages map mein entry banao
   - Activities mein join event log karo
   - Return karo room object
   
   Internally: Maps use karta hai:
   - rooms: Map<roomId, Room>
   - messages: Map<roomId, ChatMessage[]>
   - activities: Map<roomId, Activity[]>
   - socketToRoom: Map<socketId, roomId> (quick lookup)

2. getRoom(roomId)
   Room object retrieve karta hai.
   Null return hota hai agar room exist nahi karta.

3. addUserToRoom(roomId, username, socketId)
   Existing room mein user add karta hai:
   - Check karo username already taken to nahi
   - Username unique hona chahiye per room
   - User add karo users array mein
   - socketToRoom map update karo
   - Activity log karo
   
   Validation: Username same socket ID par ho sakta hai (reconnection),
   lekin different socket par nahi.

4. removeUserFromRoom(roomId, socketId)
   User ko room se nikalta hai:
   - Users array se user find karke remove karo
   - socketToRoom map se entry delete karo
   - Activity log karo (user_leave)
   - Agar room khali ho gaya to delete karo (cleanup)
   
   Return: {room, username}

5. getUserBySocketId(socketId)
   Quick lookup: Socket ID se room aur user find karo.
   Format mein return: {roomId, user}

6. addMessage(roomId, username, message)
   Chat message save karta hai:
   - Unique ID generate karo (UUID)
   - Timestamp add karo (current time)
   - Messages array mein append karo
   - Return karo message object

7. getMessages(roomId)
   Room ke sabhi messages retrieve karta hai.

8. addActivity(roomId, type, username, metadata?)
   Activity log karta hai:
   - Unique ID generate karo
   - Type, username, timestamp add karo
   - Metadata optional hai (extra info)
   - Activities array mein add karo
   - Return karo activity object
   
   Types: 'user_join', 'user_leave', 'video_play', 'video_pause', 
          'video_seek', 'video_load', 'video_add_queue'

9. addVideoToQueue(roomId, videoId, title, thumbnailUrl, addedBy)
   Video queue mein add karta hai:
   - Generate unique ID
   - Queue array mein add karo
   - Activity log karo
   - Return karo updated room

10. removeVideoFromQueue(roomId, videoId)
    Queue se video remove karta hai.
    Return karo updated room.

11. setCurrentVideo(roomId, videoId, title, thumbnailUrl)
    Currently playing video set karta hai.
    Return karo updated room.

STORAGE CLEANUP:
- Jab room khali ho jaata hai (0 users), automatically delete ho jata hai
- Messages aur activities bhi delete ho jati hain
- socketToRoom mapping clear ho jati hai
*/

// ============================================================
// PART 4: FRONTEND - APP.tsx (Main Router)
// ============================================================
/*
App.tsx application ka main entry point hai.

STRUCTURE:
1. Router Component:
   - Wouter library use karta hai (lightweight router)
   - "/" route -> Home page (create/join room)
   - "/room/:roomId" route -> Room page (main app)
   - "*" route -> 404 Not Found page
   
   Routing client-side hai, full page reload nahi hota.

2. App Component:
   - QueryClientProvider wrap karta hai (TanStack Query for data fetching)
   - TooltipProvider wrap karta hai (UI tooltips)
   - Toaster wrap karta hai (toast notifications)
   - Router ko render karta hai
   
   React Context setup hota hai sabhi pages ke liye.
*/

// ============================================================
// PART 5: FRONTEND - PAGES/HOME.tsx (Landing Page)
// ============================================================
/*
Home page par user naya room create kar sakta hai ya existing room mein join.

KEY FUNCTIONS:

1. handleCreateRoom()
   - Username validate karo (empty nahi hona chahiye)
   - Random room code generate karo (8 random characters)
   - Username aur create flag ke saath URL param mein bhejo
   - Redirect karo /room/{roomId} page par
   
   Backend par create-room event trigger hota hai room page load hone par.

2. handleJoinRoom()
   - Username validate karo
   - Room code validate karo
   - Room code ko uppercase mein convert karo
   - Redirect karo /room/{roomCode} par
   
   Backend par join-room event trigger hota hai room page load hone par.

UI ELEMENTS:
- Logo with title "Watch Together"
- Tabs: "Create Room" aur "Join Room"
- Input fields: Username, Room Code
- Buttons: Create Room, Join Room
- Features description: Real-time sync, chat, queue management

MOBILE RESPONSIVE:
- Padding aur font sizes responsive hain
- Buttons full width hain mobile par
- Layout centered aur clean hai
*/

// ============================================================
// PART 6: FRONTEND - PAGES/ROOM.tsx (Main Application)
// ============================================================
/*
Room page main application har! Yahan sabhi functionality hai.

KEY STATE VARIABLES:

1. socket: Socket | null
   - Socket.IO connection object
   - Backend ke saath real-time communication

2. room: Room | null
   - Current room ka data (users, queue, current video)
   - Real-time update hota hai

3. messages: ChatMessage[]
   - Room ke sabhi chat messages

4. typingUsers: string[]
   - Kaun kaun log type kar rahe hain

5. queueVideoUrl: string
   - Video queue input field ka current value
   - Lifted state: mobile aur desktop both share karte hain

6. peerConnections: Map<socketId, RTCPeerConnection>
   - WebRTC peer connections track karte hain har user ke saath
   - Ultra-low latency ke liye

7. dataChannels: Map<socketId, RTCDataChannel>
   - WebRTC data channels track karte hain
   - Video state sync ke liye

KEY FUNCTIONS:

1. initializeSocket()
   - Socket.IO connection establish karte hain
   - Event listeners setup karte hain
   - Username aur roomId se room join/create karte hain

2. setupWebRTC()
   - Existing users ko offer send karte hain
   - Peer connections establish karte hain
   - Data channels open karte hain
   - Video state sync ke liye

3. handleDataChannelMessage(data)
   - Incoming WebRTC message handle karta hai
   - Video state parse karta hai
   - Custom event dispatch karta hai (other components ko notify karne)

4. broadcastVideoState(videoState)
   - Video state ko sabhi peer connections ko bhejta hai
   - DataChannels use karta hai (fast)
   - Fallback Socket.IO use karta hai agar DC nahi available

5. handleCopyLink()
   - Room link ko clipboard copy karta hai
   - Toast notification dikhata hai

6. handleLeaveRoom()
   - Home page par redirect karta hai
   - Backend automatically disconnect handle karta hai

SOCKET.IO EVENTS (Listen):

1. room-joined: Room successfully join ho gaya
2. room-updated: Room state change ho gaya
3. user-joined: Naya user room mein aa gaya
4. user-left: Koi user room se chala gaya
5. chat-message: Naya chat message aaya
6. activity: Activity log event aaya
7. typing-start/stop: User type kar raha hai
8. video-state: Video play/pause/seek/load
9. webrtc-*: WebRTC signaling events

UI LAYOUT:

DESKTOP:
- Left: Video player + queue (scrollable)
- Right: Chat sidebar (w-80) + queue list
- Header: Room code, user presence, copy link, leave button
- Bottom right: Fixed mobile chat button (hidden on desktop)

MOBILE:
- Top: Header (sticky)
- Main: Video player + queue (scrollable)
- Bottom right: Floating chat button
- Sheet: Chat opens as bottom sheet

RESPONSIVE BREAKPOINTS:
- Mobile: < 1024px (lg breakpoint)
- Desktop: >= 1024px
*/

// ============================================================
// PART 7: FRONTEND - COMPONENTS/VIDEOPLAYER.tsx
// ============================================================
/*
YouTube video player component jo WebRTC se synced hota hai.

KEY FUNCTIONS:

1. extractVideoId(url)
   - YouTube URL se video ID extract karta hai
   - Multiple formats support karta hai:
     * youtube.com/watch?v=ID
     * youtu.be/ID
     * youtube.com/embed/ID

2. initPlayer()
   - YouTube IFrame API use karta hai
   - Player container mein video load karta hai
   - Event listeners setup karta hai (play, pause, state change)
   - Controls visible rakhe hain (YouTube default controls)

3. handlePlayerStateChange(event)
   - Video state change detect karta hai (play/pause/ended/loading/buffering)
   - isRemote flag check karta hai (avoid infinite loop)
   - Remote event ignore karta hai (isse hum sync problem se bachte hain)
   - Local change ko broadcast karta hai

4. handlePlayClick() / handlePauseClick() / handleSeekChange()
   - User manually control karte hain
   - Video state broadcast karta hai
   - isRemote false set karta hai (local action)
   - Toast notification dikhata hai

UI ELEMENTS:
- YouTube player (responsive container)
- Play/Pause buttons (disabled agar user room mein nahi hai)
- Seek progress bar
- Manual URL input (test ke liye)
- Loading indicator (player ready hone tak)

PERMISSION GATING:
- isUserInRoom check karta hai
- Controls disabled rahe hain jab tak user join nahi kare
- "Join room to manage video" message dikhata hai

REMOTE VIDEO STATE HANDLING:
- Custom event listener: 'remote-video-state'
- Play, Pause, Seek, Load actions handle karte hain
- isRemote flag set karta hai (to avoid duplicate broadcast)
- Remote action complete hone baad flag clear karta hai
*/

// ============================================================
// PART 8: FRONTEND - COMPONENTS/CHATSIDEBAR.tsx
// ============================================================
/*
Real-time chat component typing indicators ke saath.

KEY FUNCTIONS:

1. handleTyping(value)
   - User type kar raha hai to detect karta hai
   - Socket.emit('typing-start') karta hai
   - Timeout set karta hai automatic typing-stop ke liye
   - 2 seconds baad auto stop hota hai

2. handleSendMessage()
   - Message validate karta hai (non-empty)
   - Socket.emit('send-message') karta hai
   - Input clear karta hai
   - Typing indicators clear karta hai
   - Scroll bottom par auto-scroll karta hai

3. Auto-scroll on new messages
   - Messages array change hone par auto-scroll
   - New messages ko always visible rakta hai

UI ELEMENTS:
- Message list (scrollable area)
- Each message: Username, timestamp, message text
- Own messages: Right align, different color
- Others' messages: Left align
- Typing indicators: "Someone is typing..."
- Input box + Send button

RESPONSIVE:
- Mobile mein padding reduce karta hai
- Font sizes smaller mobile par
- Send button visible rahti hai always

PERMISSION GATING:
- Sabhi users type aur message send kar sakte hain
- No permission needed for chat
*/

// ============================================================
// PART 9: FRONTEND - COMPONENTS/VIDEOQUEUE.tsx
// ============================================================
/*
Video queue management component - videos add/remove/play karte hain.

KEY FUNCTIONS:

1. extractVideoId(url)
   - YouTube URL se video ID extract karta hai
   - Validation check karta hai

2. handleAddVideo()
   - User dala gaya URL parse karta hai
   - Invalid URL par error toast dikhata hai
   - Valid hove to socket.emit('add-video') karta hai
   - Video ID, title, thumbnail bhejta hai
   - Input field clear karta hai
   - Success toast dikhata hai

3. handleRemoveVideo(videoId)
   - socket.emit('remove-video') karta hai
   - Toast notification dikhata hai

4. handlePlayVideo(videoId)
   - socket.emit('load-video') karta hai
   - Queue se ye video current video ban jata hai
   - Sabhi users ke players par load hota hai
   - Toast dikhata hai

UI ELEMENTS:
- Section header: "Video Queue" + video count
- Input field: Paste YouTube URL
- Add button: URL submit karte hain (or Enter press)
- Queue list (vertical):
  * Video thumbnail
  * Video title
  * Added by username
  * Play button (immediate play karne ke liye)
  * Delete button (remove karne ke liye)
- Empty state message

PERMISSION GATING:
- isUserInRoom check karta hai
- Joined users: Video add/remove/play kar sakte hain
- Non-members: "Join room to manage queue" message dikhta hai
- Input aur buttons disabled rahe hain

RESPONSIVE:
- Mobile: Queue list scrollable, single column
- Desktop: Queue list scrollable, same layout
- Padding responsive hai
*/

// ============================================================
// PART 10: FRONTEND - COMPONENTS/USERPRESENCE.tsx
// ============================================================
/*
Active users ko display karta hai avatars ke saath.

KEY FUNCTIONS:

1. getInitials(name)
   - User ke name se initials extract karta hai
   - "Rajesh Kumar" -> "RK"
   - First 2 characters upper case

2. getAvatarColor(index)
   - User index se consistent color return karta hai
   - 8 different colors cycle karte hain
   - Same user ko always same color milta hai

UI ELEMENTS:
- Users count: "5" (total users)
- Avatar stack (overlapping avatars):
  * Max 5 avatars visible
  * Agar 5 se zyada hain to "+N more" badge
  * Hover karne par name tooltip

RESPONSIVE:
- Avatar sizes responsive hain
- Mobile: smaller avatars
- Desktop: larger avatars

FEATURES:
- Tooltip on hover: Shows full username
- Current user indicator: "(You)" tag
- Color-coded avatars: Easy to recognize
- Compact display: Space efficient
*/

// ============================================================
// PART 11: DATA FLOW DIAGRAM
// ============================================================
/*
COMPLETE DATA FLOW:

1. USER JOINS ROOM:
   Home.tsx -> handleJoinRoom() 
   -> URL change to /room/{roomId}?username={name}
   -> room.tsx mount
   -> initializeSocket()
   -> socket.emit('join-room', {roomId, username})
   -> Backend: addUserToRoom()
   -> Storage: Add user to room
   -> Backend: Emit 'room-joined' + 'user-joined' + 'activity'
   -> room.tsx: Update room state
   -> setupWebRTC(): Offer send karo existing users ko
   -> UI Update: Room data display

2. VIDEO SYNC FLOW:
   VideoPlayer.tsx: User play button click karte hain
   -> handlePlayClick()
   -> socket.emit('video-state') [fallback]
   -> broadcastVideoState() [WebRTC]
   -> RTCDataChannel.send(videoState)
   -> Other users ke room.tsx:
      -> handleDataChannelMessage()
      -> window.dispatchEvent('remote-video-state')
      -> VideoPlayer.tsx listen
      -> handleRemoteState()
      -> player.playVideo()
   -> All users synchronized!

3. CHAT MESSAGE FLOW:
   ChatSidebar.tsx: User type + send karte hain
   -> handleSendMessage()
   -> socket.emit('send-message', {message})
   -> Backend: addMessage()
   -> Storage: Save message
   -> Backend: Emit 'chat-message' sabhi ko
   -> room.tsx: Receive message
   -> setMessages([...])
   -> ChatSidebar: Display updated messages
   -> Auto-scroll bottom

4. QUEUE VIDEO FLOW:
   VideoQueue.tsx: User URL paste karte hain
   -> handleAddVideo()
   -> socket.emit('add-video', {videoId, title, thumbnail})
   -> Backend: addVideoToQueue()
   -> Storage: Add to queue
   -> Backend: Emit 'room-updated' sabhi ko
   -> room.tsx: Update room.queue
   -> VideoQueue: Re-render with new video
   -> User click 'Play'
   -> handlePlayVideo()
   -> socket.emit('load-video', {videoId})
   -> Backend: setCurrentVideo()
   -> Backend: Emit room-updated
   -> All users ke VideoPlayer: Load naya video

5. DISCONNECT FLOW:
   User closes page / leaves room
   -> Socket disconnect event
   -> Backend: removeUserFromRoom()
   -> Storage: Remove user
   -> Backend: Emit 'user-left' + 'activity'
   -> Other users: See updated user count
   -> If room empty: Delete room
*/

// ============================================================
// PART 12: KEY TECHNOLOGIES EXPLAINED
// ============================================================
/*
1. SOCKET.IO:
   - Real-time bidirectional communication
   - Browser + server ke beech events
   - Fallback supports (WebSocket, polling)
   - Auto-reconnect capability
   
   Yahan use: Chat, video sync, room updates, typing indicators

2. WEBRTC:
   - Peer-to-peer direct connection
   - Ultra-low latency (direct hain, server bypass)
   - DataChannels: Binary/text data transfer
   - STUN server: NAT traversal (router ke through connect hona)
   
   Yahan use: Video state sync (play/pause/seek)
   Fallback: Socket.IO use hota hai agar WebRTC fail ho

3. YOUTUBE IFRAME API:
   - JavaScript se YouTube player control
   - Play, pause, seek, volume commands
   - Video state events
   
   Yahan use: Video playback

4. REACT HOOKS:
   - useState: Component state manage karte hain
   - useEffect: Side effects (API calls, event listeners)
   - useRef: Direct DOM access aur persistent objects
   - useCallback: Memoized functions
   
   Yahan use: Overall component state management

5. ZODDING VALIDATION:
   - TypeScript schema validation
   - Runtime type checking
   - Error messages
   
   Yahan use: Socket.IO message validation

6. TAILWIND CSS:
   - Utility-first CSS framework
   - Responsive design (md:, lg: breakpoints)
   - Dark mode support
   
   Yahan use: Styling, responsive layout

7. SHADCN UI:
   - Pre-built React components
   - Tailwind + Radix UI
   - Accessible components
   
   Yahan use: Buttons, inputs, cards, scrollbars, avatars, etc.
*/

// ============================================================
// PART 13: COMMON ISSUES & SOLUTIONS
// ============================================================
/*
1. VIDEO NOT SYNCING:
   Problem: Multiple users par video timing different hai
   Cause: Network latency ya WebRTC connection fail
   Solution: 
   - Check WebRTC console logs
   - Fallback to Socket.IO working hai
   - Seek bar mein slight delay normal hai

2. CHAT NOT SENDING:
   Problem: Message send nahi ho raha
   Cause: Socket connection broken
   Solution:
   - Browser console mein error check karo
   - Socket reconnect wait karo
   - Network check karo

3. ROOM NOT LOADING:
   Problem: Room join nahi ho raha
   Cause: Invalid room code ya room already full/deleted
   Solution:
   - Room code check karo
   - Fresh room create karo
   - Network check karo

4. VIDEOS NOT APPEARING:
   Problem: Queue show nahi ho raha
   Cause: Permission issue ya network
   Solution:
   - Join room first
   - Refresh page
   - Check YouTube URL validity

5. TYPING INDICATORS NOT SHOWING:
   Problem: "Someone is typing..." nahi dikh raha
   Cause: Socket event not received
   Solution:
   - Normal behavior hai sometimes
   - Timeout automatically 3 seconds baad clear ho jata hai
*/

// ============================================================
// PART 14: HOW TO EXTEND / ADD FEATURES
// ============================================================
/*
1. ADD NEW SOCKET EVENT:
   a) Backend (server/routes.ts):
      socket.on("new-event", (data) => {
        // Handle event
        io.to(roomId).emit("new-event-response", response);
      });
   
   b) Frontend (room.tsx):
      socket.on("new-event-response", (data) => {
        // Handle response
      });

2. ADD NEW COMPONENT:
   a) Create file: client/src/components/NewComponent.tsx
   b) Define interface for props
   c) Use existing UI components from shadcn
   d) Import in room.tsx aur use karo

3. ADD NEW ROUTE:
   a) Create page: client/src/pages/new-page.tsx
   b) Import in App.tsx
   c) Add route: <Route path="/new-page" component={NewPage} />

4. CHANGE STORAGE:
   a) Implement IStorage interface
   b) Replace MemStorage with database connection
   c) Keep same method signatures
   d) Update server/routes.ts mein no changes needed

5. ADD VALIDATION:
   a) Add Zod schema in shared/schema.ts
   b) Use in backend validation
   c) Use in frontend forms with react-hook-form
*/

// ============================================================
// USAGE EXAMPLE
// ============================================================
/*
COMPLETE USER JOURNEY:

1. User home.tsx par aata hai
2. "Create Room" tab mein naam enter karta hai
3. "Create Room" button click karta hai
4. Random room code generate hota hai
5. room.tsx page load hota hai
6. Backend par "create-room" event jata hai
7. Server room create karta hai
8. Room data frontend ko mil jata hai
9. WebRTC setup start hota hai
10. Page fully load hota hai (video player + chat + queue)

11. Dusra user room link copy karke home par paste karta hai
12. Room code enter karta hai
13. "Join Room" button click karta hai
14. room.tsx page load hota hai (same room code)
15. Backend par "join-room" event jata hai
16. Server existing room mein user add karta hai
17. WebRTC offer first user se dusre user ko jata hai
18. Peer connection establish hota hai
19. Dono users connected dikhte hain

20. First user YouTube URL paste karta hai queue mein
21. Video add hota hai queue mein
22. Dono users ko queue update mil jata hai
23. Dono users "Play" click karte hain
24. Video load hota hai dono ke players par
25. First user play button press karta hai
26. Video state WebRTC/Socket.IO se broadcast hota hai
27. Dusre user ke video auto-play hota hai (synced!)

28. Chat mein messages exchanging hote hain
29. Typing indicator dikhta hai
30. Activity toast dikhte hain (video play/pause events)

THIS IS HOW WATCH TOGETHER WORKS! 🚀
*/

export default function Docs() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Watch Together - Complete Documentation</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Hinglish mein complete technical documentation.
          Sabhi functions, files aur components ki detailed explanation.
        </p>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">📋 Overview</h2>
            <p className="text-muted-foreground">
              Iska complete source code <code className="bg-muted px-2 py-1 rounded">shared/schema.ts</code>, 
              <code className="bg-muted px-2 py-1 rounded ml-2">server/routes.ts</code>, 
              <code className="bg-muted px-2 py-1 rounded ml-2">server/storage.ts</code>, 
              aur <code className="bg-muted px-2 py-1 rounded ml-2">client/src/</code> mein hai.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">📁 File Structure</h2>
            <div className="bg-card p-4 rounded-lg text-sm font-mono space-y-2 text-muted-foreground">
              <div>shared/schema.ts - Types aur validation</div>
              <div>server/routes.ts - Socket.IO events aur logic</div>
              <div>server/storage.ts - Data storage (in-memory)</div>
              <div>client/src/App.tsx - Main router</div>
              <div>client/src/pages/home.tsx - Home page (create/join)</div>
              <div>client/src/pages/room.tsx - Main room page</div>
              <div>client/src/components/VideoPlayer.tsx - YouTube player</div>
              <div>client/src/components/ChatSidebar.tsx - Chat component</div>
              <div>client/src/components/VideoQueue.tsx - Queue management</div>
              <div>client/src/components/UserPresence.tsx - User avatars</div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">🔑 Key Technologies</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>WebRTC: Peer-to-peer video sync (ultra-low latency)</li>
              <li>Socket.IO: Real-time communication aur signaling</li>
              <li>React + TypeScript: Frontend framework</li>
              <li>Express.js: Backend server</li>
              <li>YouTube IFrame API: Video player</li>
              <li>Tailwind CSS + Shadcn UI: Styling</li>
              <li>Zod: Data validation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">✨ Main Features</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Room creation aur joining with unique room codes</li>
              <li>Real-time video synchronization (play, pause, seek)</li>
              <li>Live chat with typing indicators</li>
              <li>Video queue management</li>
              <li>User presence aur avatars</li>
              <li>Activity notifications (toast based)</li>
              <li>Mobile responsive design</li>
              <li>Up to 10 users per room</li>
            </ul>
          </section>

          <section className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">💡 Pro Tip</h3>
            <p className="text-sm text-muted-foreground">
              Source code comments mein bhi Hindi/Hinglish hai.
              Code padh ke samajh sakta hai ki functions kya karte hain.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
