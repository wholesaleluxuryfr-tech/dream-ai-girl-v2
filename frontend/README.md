# Dream AI Girl - Frontend (Next.js 14)

Modern React frontend with Next.js 14 App Router, TypeScript, TailwindCSS, and Zustand state management.

---

## 🚀 Features

- ✅ **Next.js 14 App Router** - Modern routing with React Server Components
- ✅ **TypeScript** - Full type safety
- ✅ **TailwindCSS** - Utility-first CSS with custom design system
- ✅ **Zustand** - Lightweight state management
- ✅ **Socket.IO Client** - Real-time WebSocket communication
- ✅ **Framer Motion** - Smooth animations
- ✅ **React Hook Form + Zod** - Form validation
- ✅ **Axios** - HTTP client with interceptors
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **PWA Ready** - Progressive Web App support

---

## 📦 Installation

### Prerequisites

- Node.js 20+ and npm 10+
- Backend services running (API Gateway on port 8000)

### Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.local.example .env.local

# 4. Edit .env.local with your API URLs
nano .env.local

# 5. Start development server
npm run dev
```

The app will be available at **http://localhost:3000**

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page (landing)
│   │   ├── login/              # Login page
│   │   ├── register/           # Register page
│   │   └── (app)/              # Protected routes
│   │       ├── matches/        # Swipe/discover page
│   │       ├── chat/           # Chat conversations
│   │       └── profile/        # User profile
│   │
│   ├── components/             # Reusable React components
│   │   ├── ui/                 # Base UI components
│   │   ├── chat/               # Chat-specific components
│   │   ├── matches/            # Match/swipe components
│   │   └── layout/             # Layout components
│   │
│   ├── lib/                    # Core utilities
│   │   ├── api-client.ts       # API client (axios)
│   │   ├── socket-client.ts    # WebSocket client (Socket.IO)
│   │   └── stores/             # Zustand stores
│   │       ├── auth-store.ts   # Authentication state
│   │       ├── chat-store.ts   # Chat messages state
│   │       └── match-store.ts  # Matches state
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Auth hook
│   │   ├── useWebSocket.ts     # WebSocket hook
│   │   └── useChat.ts          # Chat hook
│   │
│   ├── types/                  # TypeScript types
│   │   └── index.ts            # All type definitions
│   │
│   └── styles/                 # CSS styles
│       └── globals.css         # Global + TailwindCSS
│
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── manifest.json          # PWA manifest
│   └── images/
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── .env.local.example
```

---

## 🎨 Design System

### Colors

The app uses a pink-themed dark mode design:

```tsx
// Brand pink
bg-brand-500      // Primary pink (#ec4899)
text-brand-500

// Dark theme
bg-dark-950       // Background (#030712)
bg-dark-900       // Cards (#111827)
bg-dark-800       // Borders (#1f2937)
```

### Typography

- **Font**: Inter (via next/font)
- **Display font**: Cal Sans (for headlines)

### Components

Pre-built component classes:

```tsx
// Buttons
className="btn-primary"     // Pink gradient button
className="btn-secondary"   // Dark button
className="btn-ghost"       // Transparent button

// Inputs
className="input"           // Standard input
className="input-error"     // Error state

// Cards
className="card"            // Standard card
className="card-hover"      // Hoverable card

// Messages
className="message-user"    // User message bubble
className="message-ai"      // AI message bubble
```

---

## 🔌 API Integration

### API Client

Located in `src/lib/api-client.ts`, provides methods for all backend endpoints:

```typescript
import apiClient from '@/lib/api-client';

// Auth
await apiClient.login({ username, password });
await apiClient.register({ username, email, password });
await apiClient.logout();

// Chat
const messages = await apiClient.getMessages(userId, girlId);
const response = await apiClient.sendMessage({ user_id, girl_id, message });

// Matches
const girls = await apiClient.discoverGirls(userId);
const match = await apiClient.swipeGirl({ user_id, girl_id, direction: 'right' });

// Media
const photo = await apiClient.generatePhoto({ user_id, girl_id, context: 'selfie' });
```

### Authentication

Automatic token management with refresh:

- Access tokens stored in localStorage
- Automatic refresh on 401 errors
- Interceptors for adding Authorization header

### WebSocket (TODO)

Real-time chat with Socket.IO:

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const { socket, connected } = useWebSocket();

// Listen for messages
socket.on('message_received', (data) => {
  console.log('New message:', data);
});

// Send message
socket.emit('send_message', { girl_id, content });
```

---

## 🗃️ State Management (Zustand)

### Auth Store

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return <div>Hello {user.username}!</div>;
}
```

### Chat Store

```typescript
import { useChatStore } from '@/lib/stores/chat-store';

function ChatComponent() {
  const {
    conversations,
    sendMessage,
    loadMessages,
    isSending,
  } = useChatStore();

  const messages = conversations.get(girlId) || [];

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

---

## 🎯 Routing

### Public Routes

- `/` - Landing page
- `/login` - Login
- `/register` - Registration

### Protected Routes (requires auth)

- `/matches` - Discover and swipe girls
- `/chat` - Conversations list
- `/chat/[girlId]` - Chat with specific girl
- `/profile` - User profile
- `/photos` - Received photos gallery

### Route Protection

Use middleware or layout to protect routes:

```typescript
// app/(app)/layout.tsx
'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

---

## 📱 Responsive Design

Mobile-first approach with Tailwind breakpoints:

```tsx
<div className="
  px-4          // Mobile: 16px padding
  md:px-8       // Tablet: 32px padding
  lg:px-16      // Desktop: 64px padding
  max-w-7xl     // Max width 1280px
  mx-auto       // Center
">
  {/* Content */}
</div>
```

---

## 🚀 Performance Optimizations

- **Code Splitting** - Automatic with Next.js
- **Image Optimization** - next/image with WebP/AVIF
- **Font Optimization** - next/font with swap display
- **Lazy Loading** - React.lazy for heavy components
- **Memoization** - React.memo for expensive renders
- **Debouncing** - Input fields with 300ms debounce

---

## 🧪 Development Tips

### Hot Reload

Changes auto-reload in dev mode. If stuck:

```bash
# Clear .next cache
rm -rf .next
npm run dev
```

### Type Checking

Run TypeScript checks:

```bash
npm run type-check
```

### Environment Variables

Access in components:

```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

⚠️ **Only `NEXT_PUBLIC_*` variables are exposed to the browser!**

### Debugging

Use React DevTools extension:
- Install: [React DevTools](https://react.dev/learn/react-developer-tools)
- Use Zustand DevTools for state inspection

---

## 🏗️ Building for Production

```bash
# Build optimized bundle
npm run build

# Test production build locally
npm run start
```

**Output**:
- Static files: `out/` (if using `output: 'export'`)
- Server bundle: `.next/`

---

## 🐛 Troubleshooting

### Port 3000 already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors

```bash
# Regenerate types
rm -rf .next
npm run dev
```

---

## 📚 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^14.2.0 | React framework |
| react | ^18.3.0 | UI library |
| typescript | ^5.3.0 | Type safety |
| tailwindcss | ^3.4.0 | Styling |
| zustand | ^4.5.0 | State management |
| axios | ^1.6.0 | HTTP client |
| socket.io-client | ^4.7.0 | WebSocket |
| framer-motion | ^11.0.0 | Animations |
| react-hook-form | ^7.51.0 | Forms |
| zod | ^3.22.0 | Validation |

---

## 🚧 TODO

- [ ] Implement WebSocket client
- [ ] Create chat UI components
- [ ] Build swipe/match interface
- [ ] Add photo gallery
- [ ] Implement profile page
- [ ] Add PWA manifest and service worker
- [ ] Setup analytics (Mixpanel)
- [ ] Add error boundary
- [ ] Implement dark mode toggle
- [ ] Add loading skeletons
- [ ] Create notification system
- [ ] Add keyboard shortcuts

---

## 📖 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Zustand Guide](https://docs.pmnd.rs/zustand)
- [React Hook Form](https://react-hook-form.com/)

---

**Happy coding! 💕**
