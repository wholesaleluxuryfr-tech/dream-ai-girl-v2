'use client';

/**
 * WebSocket Provider Component
 *
 * Manages global WebSocket connection for the entire app
 * Should be placed in root layout to maintain connection across navigation
 */

import { useEffect } from 'react';
import { useWebSocket, useWebSocketStatus } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/lib/stores/auth-store';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isAuthenticated } = useAuthStore();

  // Initialize WebSocket connection (auto-connects when authenticated)
  useWebSocket();

  return <>{children}</>;
}

// ============================================================================
// CONNECTION STATUS INDICATOR (Optional UI Component)
// ============================================================================

export function WebSocketStatusIndicator() {
  const { isConnected, socketId } = useWebSocketStatus();

  if (!isConnected) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-xs text-yellow-500">Reconnexion...</span>
        </div>
      </div>
    );
  }

  // Show connected status briefly, then hide
  return null;

  // Optional: Show connected indicator
  // return (
  //   <div className="fixed bottom-4 left-4 z-50">
  //     <div className="bg-green-500/10 border border-green-500/50 rounded-lg px-3 py-2 flex items-center gap-2">
  //       <div className="w-2 h-2 bg-green-500 rounded-full" />
  //       <span className="text-xs text-green-500">Connecté</span>
  //     </div>
  //   </div>
  // );
}
