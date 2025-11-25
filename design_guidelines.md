# Design Guidelines: Watch Together Real-Time Application

## Design Approach

**Reference-Based Approach** drawing from:
- **Netflix**: Dark theme, video player prominence, content-focused layouts
- **Discord**: Chat interface patterns, activity feeds, user presence indicators
- **Twitch**: Real-time engagement, chat-video balance, live indicators

**Core Principle**: Immersive viewing experience with unobtrusive collaboration tools

## Layout System

**Primary Layout Structure**:
```
┌─────────────────────────────────────────────────┐
│ Header (Room info, Copy Link, User count)      │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  Video Player    │   Chat Sidebar (320px)      │
│  (Flex-grow)     │   - Messages                │
│                  │   - Typing indicator         │
│  Activity Feed   │   - Input field             │
│  (Below player)  │                              │
│                  │                              │
├──────────────────┴──────────────────────────────┤
│ Video Queue (Horizontal scroll or grid)         │
└─────────────────────────────────────────────────┘
```

**Spacing System**: Use Tailwind units `2, 3, 4, 6, 8, 12, 16` for consistent rhythm
- Component padding: `p-4` to `p-6`
- Section gaps: `gap-6` to `gap-8`
- Container margins: `mx-4` to `mx-8`

## Typography

**Font Family**: 
- Primary: Inter or Netflix Sans (via Google Fonts)
- Monospace: JetBrains Mono for room codes

**Hierarchy**:
- Room Header: `text-2xl font-bold`
- Video Title: `text-xl font-semibold`
- Chat Messages: `text-sm font-normal`
- Activity Feed: `text-xs font-medium`
- User Names: `text-sm font-semibold`
- Timestamps: `text-xs opacity-60`
- Button Text: `text-sm font-medium`

## Component Library

### Video Player Area
- 16:9 aspect ratio container with black background
- Video controls overlay on hover (native YouTube player)
- Loading skeleton during video load
- Subtle border: `border border-gray-800`

### Chat Sidebar
- Fixed width: `w-80` (320px) on desktop, full-width drawer on mobile
- Messages in scrollable area with `flex-col-reverse` for auto-scroll to bottom
- Message bubbles: `bg-gray-800 rounded-lg px-3 py-2`
- Own messages: `bg-blue-600` with right alignment
- Typing indicator: Animated dots with `text-gray-400`

### Activity Feed
- Positioned below video or as separate panel
- Each activity: `bg-gray-900 rounded-md px-4 py-2`
- Icons from Heroicons (play, pause, forward, user-plus, user-minus)
- Action text with username highlighted in accent color
- Timestamp on right side

### Video Queue/Playlist
- Horizontal scroll on mobile, grid on desktop (`grid-cols-3 lg:grid-cols-4`)
- Thumbnail cards: `aspect-video bg-gray-800 rounded-lg overflow-hidden`
- Hover state: `opacity-75 transition-opacity`
- Current video: Accent border `border-2 border-blue-500`
- Add video button: Dashed border `border-2 border-dashed border-gray-700`

### Chat Input
- Fixed at bottom of chat sidebar
- Input: `bg-gray-800 rounded-full px-4 py-3`
- Send button: Icon button with accent color

### Buttons
- Primary CTA: `bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium`
- Secondary: `bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md`
- Copy Link: Icon + text with subtle background `bg-gray-800/50 backdrop-blur-sm`
- Destructive: `bg-red-600 hover:bg-red-700`

### Room Header
- Full width with dark background `bg-gray-900/95 backdrop-blur-sm`
- Sticky positioning: `sticky top-0 z-10`
- Contains: Room ID (monospace), Copy Link button, Active users count with avatars, Leave room button
- Border bottom: `border-b border-gray-800`

### User Presence Indicators
- Online users: Small circular avatars with initials `w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600`
- Green dot indicator: `w-2 h-2 bg-green-500 rounded-full absolute`
- Max 4-5 avatars shown, "+N more" for overflow

### Loading & Empty States
- Video loading: Skeleton with pulse animation `animate-pulse bg-gray-800`
- Empty queue: Dashed border container with "Add first video" prompt
- No chat messages: Centered helper text "Start a conversation"

## Responsive Behavior

**Desktop (lg+)**: Side-by-side layout (video left, chat right, queue bottom)
**Tablet (md)**: Stacked layout, chat as drawer/modal
**Mobile**: Full-width video, chat overlay with toggle button, queue as horizontal scroll

## Visual Treatment

**Dark Theme Base**:
- Background: `bg-black`
- Cards/Panels: `bg-gray-900`
- Borders: `border-gray-800`
- Text: `text-white` with `text-gray-400` for secondary

**Accent Colors**:
- Primary actions: Blue (`blue-600`)
- Success states: Green (`green-500`)
- Live indicators: Red (`red-500`)
- User highlights: Purple/Blue gradients

**Depth & Elevation**:
- Use subtle shadows: `shadow-lg shadow-black/20`
- Layered panels with different background opacities

## Icons

**Heroicons (outline and solid)** for:
- Play, pause, forward-15, backward-15 controls
- Chat bubble, user group, link, clipboard
- Plus, trash, chevrons for queue management
- Status indicators (online, typing, activity)

## Animations

**Minimal, purposeful animations**:
- Message send: Slide up `transition-transform`
- Typing indicator: Bouncing dots
- User join/leave: Fade in/out `transition-opacity`
- Button interactions: Standard hover states
- No auto-play animations or distracting effects

## Images

No hero images required. This is a functional application focused on video content. All visual weight should support the YouTube player and collaboration features.