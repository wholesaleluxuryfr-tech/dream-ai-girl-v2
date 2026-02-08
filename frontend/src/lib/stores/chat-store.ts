/**
 * Chat Store (Zustand)
 *
 * Manages chat messages, conversations, and real-time updates
 */

import { create } from 'zustand';
import type { ChatMessage, Conversation, Match } from '@/types';
import apiClient from '../api-client';

interface ChatState {
  // State
  conversations: Map<string, ChatMessage[]>;  // girl_id -> messages[]
  activeConversation: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Typing indicators
  typingGirls: Set<string>;  // girl_ids currently typing

  // Actions
  setActiveConversation: (girlId: string) => void;
  loadMessages: (userId: number, girlId: string) => Promise<void>;
  sendMessage: (userId: number, girlId: string, content: string) => Promise<void>;
  addMessage: (girlId: string, message: ChatMessage) => void;
  setTyping: (girlId: string, isTyping: boolean) => void;
  markAsRead: (userId: number, girlId: string, messageIds: number[]) => Promise<void>;
  getTotalUnreadCount: () => number;
  clearError: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  // Initial state
  conversations: new Map(),
  activeConversation: null,
  isLoading: false,
  isSending: false,
  error: null,
  typingGirls: new Set(),

  // Set active conversation
  setActiveConversation: (girlId) => {
    set({ activeConversation: girlId });
  },

  // Load messages for a conversation
  loadMessages: async (userId, girlId) => {
    set({ isLoading: true, error: null });

    try {
      const messages = await apiClient.getMessages(userId, girlId, 100);

      const conversations = new Map(get().conversations);
      conversations.set(girlId, messages);

      set({
        conversations,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load messages',
      });
    }
  },

  // Send a message (WebSocket or HTTP fallback)
  sendMessage: async (userId, girlId, content) => {
    set({ isSending: true, error: null });

    try {
      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: Date.now(),  // Temporary ID
        user_id: userId,
        girl_id: girlId,
        sender: 'user',
        content,
        timestamp: new Date().toISOString(),
        is_read: true,
      };

      const conversations = new Map(get().conversations);
      const currentMessages = conversations.get(girlId) || [];
      conversations.set(girlId, [...currentMessages, userMessage]);
      set({ conversations });

      // Send via WebSocket (handled by useWebSocket hook) or HTTP
      // The WebSocket client will handle the message and response will come via socket event
      // For now, use HTTP as fallback/primary method
      const response = await apiClient.sendMessage({
        user_id: userId,
        girl_id: girlId,
        message: content,
      });

      // Add AI response (if not received via WebSocket)
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,  // Temporary ID
        user_id: userId,
        girl_id: girlId,
        sender: 'girl',
        content: response.response,
        timestamp: new Date().toISOString(),
        is_read: true,
      };

      const updatedConversations = new Map(get().conversations);
      const updatedMessages = updatedConversations.get(girlId) || [];
      updatedConversations.set(girlId, [...updatedMessages, aiMessage]);

      set({
        conversations: updatedConversations,
        isSending: false,
      });

      // Check if photo should be generated
      if (response.suggests_photo) {
        console.log('📸 AI suggests sending photo');
        // Photo generation will be triggered via WebSocket or separate call
      }

    } catch (error: any) {
      // Remove optimistic message on error
      const conversations = new Map(get().conversations);
      const messages = conversations.get(girlId) || [];
      const filteredMessages = messages.filter(msg => msg.id !== Date.now());
      conversations.set(girlId, filteredMessages);

      set({
        conversations,
        isSending: false,
        error: error.message || 'Failed to send message',
      });
      throw error;
    }
  },

  // Add message (for WebSocket real-time updates)
  addMessage: (girlId, message) => {
    const conversations = new Map(get().conversations);
    const currentMessages = conversations.get(girlId) || [];
    conversations.set(girlId, [...currentMessages, message]);
    set({ conversations });
  },

  // Set typing indicator
  setTyping: (girlId, isTyping) => {
    const typingGirls = new Set(get().typingGirls);

    if (isTyping) {
      typingGirls.add(girlId);
    } else {
      typingGirls.delete(girlId);
    }

    set({ typingGirls });
  },

  // Mark messages as read
  markAsRead: async (userId, girlId, messageIds) => {
    try {
      await apiClient.markMessagesAsRead(userId, girlId, messageIds);

      // Update local state
      const conversations = new Map(get().conversations);
      const messages = conversations.get(girlId);

      if (messages) {
        const updatedMessages = messages.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
        );
        conversations.set(girlId, updatedMessages);
        set({ conversations });
      }
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  // Get total unread count across all conversations
  getTotalUnreadCount: () => {
    const conversations = get().conversations;
    let totalUnread = 0;

    conversations.forEach((messages) => {
      const unreadInConversation = messages.filter(
        (msg) => msg.sender === 'girl' && !msg.is_read
      ).length;
      totalUnread += unreadInConversation;
    });

    return totalUnread;
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
