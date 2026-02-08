/**
 * App Layout - Authenticated pages layout
 *
 * Includes bottom navigation bar
 */

import { BottomNav } from '@/components/layout/BottomNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-16">
      {/* Main content with padding for bottom nav */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
