/**
 * useWebSocket Hook
 *
 * React hook for managing WebSocket connection and real-time events
 */

import { useEffect, useState, useCallback } from 'react';
import { getSocketClient } from '@/lib/socket-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatStore } from '@/lib/stores/chat-store';
import type { MessageReceivedEvent, TypingIndicator } from '@/types';

interface UseWebSocketReturn {
  isConnected: boolean;
  socketId: string | undefined;
  sendMessage: (girlId: string, content: string) => void;
  setTyping: (girlId: string, isTyping: boolean) => void;
  markAsRead: (girlId: string, messageIds: number[]) => void;
  requestPhoto: (girlId: string, context?: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const socketClient = getSocketClient();
  const { user, isAuthenticated } = useAuthStore();
  const { addMessage, setTyping: setChatTyping } = useChatStore();

  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>();

  // ============================================================================
  // AUTO-CONNECT ON AUTH
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('access_token');
      if (token) {
        console.log('🔌 Auto-connecting WebSocket for user:', user.id);
        socketClient.connect(user.id, token);
      }
    } else {
      console.log('🔌 Disconnecting WebSocket (user logged out)');
      socketClient.disconnect();
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
      // Only disconnect on logout
    };
  }, [isAuthenticated, user]);

  // ============================================================================
  // SETUP EVENT HANDLERS
  // ============================================================================

  useEffect(() => {
    // Connection status handlers
    const handleConnected = (data: { socketId: string }) => {
      console.log('✅ WebSocket connected:', data.socketId);
      setIsConnected(true);
      setSocketId(data.socketId);
    };

    const handleDisconnected = (data: { reason: string }) => {
      console.log('❌ WebSocket disconnected:', data.reason);
      setIsConnected(false);
      setSocketId(undefined);
    };

    const handleConnectionFailed = () => {
      console.error('❌ WebSocket connection failed');
      setIsConnected(false);
    };

    // Message handlers
    const handleMessageReceived = (data: MessageReceivedEvent) => {
      console.log('📨 Message received:', data);

      // Add message to chat store
      addMessage(data.message.girl_id, data.message);

      // Show notification (if not in active conversation)
      // TODO: Implement notification logic
    };

    // Typing indicator handler
    const handleTyping = (data: TypingIndicator) => {
      console.log('✍️ Typing indicator:', data);
      setChatTyping(data.girl_id, data.is_typing);
    };

    // Photo generated handler
    const handlePhotoGenerated = (data: { girl_id: string; photo_url: string }) => {
      console.log('📸 Photo generated:', data);

      // Add photo message to chat
      if (user) {
        addMessage(data.girl_id, {
          id: Date.now(),
          user_id: user.id,
          girl_id: data.girl_id,
          sender: 'girl',
          content: '📸',
          media_url: data.photo_url,
          media_type: 'photo',
          timestamp: new Date().toISOString(),
          is_read: false,
        });
      }

      // TODO: Show photo notification
    };

    // Register event handlers
    socketClient.on('connected', handleConnected);
    socketClient.on('disconnected', handleDisconnected);
    socketClient.on('connection_failed', handleConnectionFailed);
    socketClient.on('message_received', handleMessageReceived);
    socketClient.on('typing', handleTyping);
    socketClient.on('photo_generated', handlePhotoGenerated);

    // Cleanup
    return () => {
      socketClient.off('connected', handleConnected);
      socketClient.off('disconnected', handleDisconnected);
      socketClient.off('connection_failed', handleConnectionFailed);
      socketClient.off('message_received', handleMessageReceived);
      socketClient.off('typing', handleTyping);
      socketClient.off('photo_generated', handlePhotoGenerated);
    };
  }, [addMessage, setChatTyping, user]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const sendMessage = useCallback(
    (girlId: string, content: string) => {
      socketClient.sendMessage(girlId, content);
    },
    []
  );

  const setTyping = useCallback(
    (girlId: string, isTyping: boolean) => {
      socketClient.setTyping(girlId, isTyping);
    },
    []
  );

  const markAsRead = useCallback(
    (girlId: string, messageIds: number[]) => {
      socketClient.markAsRead(girlId, messageIds);
    },
    []
  );

  const requestPhoto = useCallback(
    (girlId: string, context?: string) => {
      socketClient.requestPhoto(girlId, context);
    },
    []
  );

  const connect = useCallback(() => {
    if (user) {
      const token = localStorage.getItem('access_token');
      if (token) {
        socketClient.connect(user.id, token);
      }
    }
  }, [user]);

  const disconnect = useCallback(() => {
    socketClient.disconnect();
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    isConnected,
    socketId,
    sendMessage,
    setTyping,
    markAsRead,
    requestPhoto,
    connect,
    disconnect,
  };
}

// ============================================================================
// USEWEBSOCKET STATUS (simpler hook for just connection status)
// ============================================================================

export function useWebSocketStatus(): {
  isConnected: boolean;
  socketId: string | undefined;
} {
  const socketClient = getSocketClient();
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>();

  useEffect(() => {
    const handleConnected = (data: { socketId: string }) => {
      setIsConnected(true);
      setSocketId(data.socketId);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setSocketId(undefined);
    };

    socketClient.on('connected', handleConnected);
    socketClient.on('disconnected', handleDisconnected);

    // Check current status
    setIsConnected(socketClient.isConnected());
    setSocketId(socketClient.getSocketId());

    return () => {
      socketClient.off('connected', handleConnected);
      socketClient.off('disconnected', handleDisconnected);
    };
  }, []);

  return { isConnected, socketId };
}
