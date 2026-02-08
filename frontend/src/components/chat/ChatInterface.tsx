'use client';

/**
 * ChatInterface Component
 *
 * Main chat interface with real-time messaging via WebSocket
 */

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { ChatMessage } from '@/types';

interface ChatInterfaceProps {
  girlId: string;
  girlName: string;
  girlAvatar?: string;
}

export function ChatInterface({ girlId, girlName, girlAvatar }: ChatInterfaceProps) {
  const { user } = useAuthStore();
  const {
    conversations,
    loadMessages,
    sendMessage,
    isLoading,
    isSending,
    typingGirls,
  } = useChatStore();

  const { isConnected, setTyping } = useWebSocket();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Get messages for this conversation
  const messages = conversations.get(girlId) || [];
  const isGirlTyping = typingGirls.has(girlId);

  // ============================================================================
  // LOAD MESSAGES ON MOUNT
  // ============================================================================

  useEffect(() => {
    if (user) {
      loadMessages(user.id, girlId);
    }
  }, [user, girlId, loadMessages]);

  // ============================================================================
  // AUTO-SCROLL TO BOTTOM
  // ============================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGirlTyping]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  const handleSendMessage = async () => {
    if (!user || !inputValue.trim() || isSending) return;

    const content = inputValue.trim();
    setInputValue('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(girlId, false);

    try {
      await sendMessage(user.id, girlId, content);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on error
      setInputValue(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================================================
  // TYPING INDICATOR
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (e.target.value.length > 0) {
      setTyping(girlId, true);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(girlId, false);
      }, 2000);
    } else {
      setTyping(girlId, false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-dark-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-800 bg-dark-900">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-pink flex items-center justify-center text-white font-semibold">
          {girlAvatar ? (
            <img src={girlAvatar} alt={girlName} className="w-full h-full rounded-full object-cover" />
          ) : (
            girlName[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="font-semibold">{girlName}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {isConnected ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span>En ligne</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-gray-500 rounded-full" />
                <span>Hors ligne</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Aucun message. Dis bonjour! 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {/* Typing Indicator */}
        {isGirlTyping && (
          <div className="flex items-end gap-2">
            <div className="message-ai">
              <div className="flex gap-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-dark-800 bg-dark-900 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message à ${girlName}...`}
            className="input flex-1 resize-none min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isSending}
          />

          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className="btn-primary px-6 shrink-0"
          >
            {isSending ? (
              <div className="spinner h-5 w-5" />
            ) : (
              '→'
            )}
          </button>
        </div>

        {/* Connection status */}
        {!isConnected && (
          <p className="text-xs text-yellow-500 mt-2">
            ⚠️ Connexion WebSocket perdue. Reconnexion en cours...
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div className={isUser ? 'message-user' : 'message-ai'}>
          {message.content}

          {/* Media (photo/video) */}
          {message.media_url && (
            <div className="mt-2">
              {message.media_type === 'photo' ? (
                <img
                  src={message.media_url}
                  alt="Photo"
                  className="rounded-lg max-w-full h-auto"
                />
              ) : message.media_type === 'video' ? (
                <video
                  src={message.media_url}
                  controls
                  className="rounded-lg max-w-full h-auto"
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
