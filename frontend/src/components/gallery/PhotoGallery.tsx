'use client';

/**
 * PhotoGallery Component - Grid of received photos
 *
 * Displays photos in a masonry-style grid with lightbox view
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export interface Photo {
  id: number;
  url: string;
  girlId: string;
  girlName: string;
  girlAvatar?: string;
  caption?: string;
  createdAt: string;
  isNsfw?: boolean;
}

interface PhotoGalleryProps {
  photos: Photo[];
  isLoading?: boolean;
  onPhotoClick?: (photo: Photo, index: number) => void;
}

export function PhotoGallery({ photos, isLoading, onPhotoClick }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    onPhotoClick?.(photo, index);
  };

  const handleClose = () => {
    setSelectedPhoto(null);
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(photos[newIndex]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < photos.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(photos[newIndex]);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] bg-dark-800 rounded-lg animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-xl font-bold mb-2">Aucune photo</h3>
        <p className="text-gray-400">
          Les photos que tu reçois apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={index}
            onClick={() => handlePhotoClick(photo, index)}
          />
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoLightbox
            photo={selectedPhoto}
            index={selectedIndex}
            total={photos.length}
            onClose={handleClose}
            onPrevious={handlePrevious}
            onNext={handleNext}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
}

function PhotoCard({ photo, index, onClick }: PhotoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="relative aspect-[3/4] bg-dark-800 rounded-lg overflow-hidden cursor-pointer group"
    >
      {/* Image */}
      <img
        src={photo.url}
        alt={photo.caption || 'Photo'}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Girl info */}
          <div className="flex items-center gap-2 mb-2">
            {photo.girlAvatar && (
              <img
                src={photo.girlAvatar}
                alt={photo.girlName}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-sm font-medium">{photo.girlName}</span>
          </div>

          {/* Caption */}
          {photo.caption && (
            <p className="text-xs text-gray-300 line-clamp-2">
              {photo.caption}
            </p>
          )}
        </div>
      </div>

      {/* NSFW badge */}
      {photo.isNsfw && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
          18+
        </div>
      )}
    </motion.div>
  );
}

interface PhotoLightboxProps {
  photo: Photo;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  formatDate: (date: string) => string;
}

function PhotoLightbox({
  photo,
  index,
  total,
  onClose,
  onPrevious,
  onNext,
  formatDate,
}: PhotoLightboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Image container */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-4xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <img
          src={photo.url}
          alt={photo.caption || 'Photo'}
          className="w-full h-full object-contain rounded-lg"
        />

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 rounded-b-lg">
          {/* Girl info */}
          <div className="flex items-center gap-3 mb-3">
            {photo.girlAvatar && (
              <img
                src={photo.girlAvatar}
                alt={photo.girlName}
                className="w-10 h-10 rounded-full border-2 border-white/20"
              />
            )}
            <div>
              <div className="font-semibold">{photo.girlName}</div>
              <div className="text-sm text-gray-400">
                {formatDate(photo.createdAt)}
              </div>
            </div>
          </div>

          {/* Caption */}
          {photo.caption && (
            <p className="text-sm text-gray-200">{photo.caption}</p>
          )}
        </div>

        {/* Navigation */}
        {index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          >
            ←
          </button>
        )}

        {index < total - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          >
            →
          </button>
        )}

        {/* Counter */}
        <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-sm">
          {index + 1} / {total}
        </div>
      </motion.div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-xl transition-colors"
      >
        ✕
      </button>
    </motion.div>
  );
}
