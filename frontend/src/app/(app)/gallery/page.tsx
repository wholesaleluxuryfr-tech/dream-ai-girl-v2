'use client';

/**
 * Gallery Page - View all received photos
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { PhotoGallery, type Photo } from '@/components/gallery/PhotoGallery';
import { apiClient } from '@/lib/api-client';

export default function GalleryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'favorites'>('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load photos on mount
  useEffect(() => {
    if (user) {
      loadPhotos();
    }
  }, [user, filter]);

  const loadPhotos = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await apiClient.getPhotos(user.id, filter);
      setPhotos(response.photos);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-sm border-b border-dark-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Galerie</h1>

          {/* Photo count */}
          {photos.length > 0 && !isLoading && (
            <div className="text-sm text-gray-400">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="border-t border-dark-800">
          <div className="container mx-auto px-4 flex gap-2 py-3 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`btn btn-sm ${
                filter === 'all' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('recent')}
              className={`btn btn-sm ${
                filter === 'recent' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              Récentes
            </button>
            <button
              onClick={() => setFilter('favorites')}
              className={`btn btn-sm ${
                filter === 'favorites' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              Favorites
            </button>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className="flex-1 overflow-y-auto">
        <PhotoGallery photos={photos} isLoading={isLoading} />
      </main>
    </div>
  );
}
