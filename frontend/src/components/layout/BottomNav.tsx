'use client';

/**
 * BottomNav Component - Mobile bottom navigation bar
 */

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMatchStore } from '@/lib/stores/match-store';
import { useChatStore } from '@/lib/stores/chat-store';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { matches } = useMatchStore();
  const { getTotalUnreadCount } = useChatStore();

  const unreadCount = getTotalUnreadCount();

  const navItems = [
    {
      id: 'matches',
      label: 'Découvrir',
      icon: '🔥',
      path: '/matches',
      activeIcon: '🔥',
    },
    {
      id: 'conversations',
      label: 'Messages',
      icon: '💬',
      path: '/conversations',
      activeIcon: '💬',
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'scenarios',
      label: 'Scénarios',
      icon: '🎭',
      path: '/scenarios',
      activeIcon: '🎭',
    },
    {
      id: 'gallery',
      label: 'Galerie',
      icon: '📸',
      path: '/gallery',
      activeIcon: '📸',
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: '👤',
      path: '/profile',
      activeIcon: '👤',
    },
  ];

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-lg border-t border-dark-800">
      <div className="container mx-auto px-2 flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className="relative flex flex-col items-center justify-center flex-1 h-full transition-colors"
            >
              {/* Icon */}
              <div className="relative mb-1">
                <span className={`text-2xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {isActive ? item.activeIcon : item.icon}
                </span>

                {/* Badge */}
                {item.badge && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs transition-colors ${
                  isActive ? 'text-brand-500 font-semibold' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottomnav-active"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-brand-500 rounded-t-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
