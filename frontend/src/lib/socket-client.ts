/**
 * Socket.IO Client for Real-Time Communication
 *
 * Handles WebSocket connection to Chat Service for:
 * - Real-time message delivery
 * - Typing indicators
 * - Online status
 * - Delivery receipts
 */

import { io, Socket } from 'socket.io-client';
import type { ChatMessage, TypingIndicator, MessageReceivedEvent } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8002';

// ============================================================================
// SOCKET CLIENT CLASS
// ============================================================================

class SocketClient {
  private socket: Socket | null = null;
  private userId: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  // Event handlers registry
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSocket();
    }
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  private initializeSocket(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('🔌 Initializing Socket.IO connection to:', WS_URL);

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: false, // Manual connection control
    });

    this.setupEventListeners();
  }

  connect(userId: number, accessToken: string): void {
    if (!this.socket) {
      this.initializeSocket();
    }

    this.userId = userId;

    // Add auth token to connection
    if (this.socket) {
      this.socket.auth = { token: accessToken, user_id: userId };
      this.socket.connect();
    }

    console.log(`🔌 Connecting WebSocket for user ${userId}...`);
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.userId = null;
      this.reconnectAttempts = 0;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ============================================================================
  // EVENT LISTENERS SETUP
  // ============================================================================

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.emit('connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.emit('connection_failed', { error });
      }
    });

    // Chat events
    this.socket.on('message_received', (data: MessageReceivedEvent) => {
      console.log('📨 Message received:', data);
      this.emit('message_received', data);
    });

    this.socket.on('typing', (data: TypingIndicator) => {
      console.log('✍️ Typing indicator:', data);
      this.emit('typing', data);
    });

    this.socket.on('message_read', (data: { message_id: number; girl_id: string }) => {
      console.log('✅ Message read:', data);
      this.emit('message_read', data);
    });

    this.socket.on('photo_generated', (data: { girl_id: string; photo_url: string }) => {
      console.log('📸 Photo generated:', data);
      this.emit('photo_generated', data);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      this.emit('error', error);
    });
  }

  // ============================================================================
  // EMIT EVENTS (Client → Server)
  // ============================================================================

  sendMessage(girlId: string, content: string): void {
    if (!this.socket?.connected || !this.userId) {
      console.error('❌ Cannot send message: Socket not connected or user not set');
      return;
    }

    console.log('📤 Sending message:', { girlId, content });

    this.socket.emit('send_message', {
      user_id: this.userId,
      girl_id: girlId,
      content,
    });
  }

  setTyping(girlId: string, isTyping: boolean): void {
    if (!this.socket?.connected || !this.userId) return;

    this.socket.emit('typing_indicator', {
      user_id: this.userId,
      girl_id: girlId,
      is_typing: isTyping,
    });
  }

  markAsRead(girlId: string, messageIds: number[]): void {
    if (!this.socket?.connected || !this.userId) return;

    this.socket.emit('mark_read', {
      user_id: this.userId,
      girl_id: girlId,
      message_ids: messageIds,
    });
  }

  requestPhoto(girlId: string, context?: string): void {
    if (!this.socket?.connected || !this.userId) return;

    console.log('📸 Requesting photo:', { girlId, context });

    this.socket.emit('request_photo', {
      user_id: this.userId,
      girl_id: girlId,
      context,
    });
  }

  // ============================================================================
  // EVENT HANDLER REGISTRATION
  // ============================================================================

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  getUserId(): number | null {
    return this.userId;
  }

  clearHandlers(): void {
    this.eventHandlers.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let socketClientInstance: SocketClient | null = null;

export function getSocketClient(): SocketClient {
  if (!socketClientInstance) {
    socketClientInstance = new SocketClient();
  }
  return socketClientInstance;
}

export default getSocketClient();
