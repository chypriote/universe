import { useState, useCallback } from 'react';
import type { GalleryPhoto } from '@/lib/itineraries.server';
import { Lightbox } from '@/components/islands/Lightbox';

interface GalleryGridProps {
  photos: GalleryPhoto[];
}

export function GalleryGrid({ photos }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  if (photos.length === 0) {
    return (
      <p className="text-muted-foreground font-serif italic">
        No photographs for this place yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 items-start">
        {photos.map((photo, index) => (
          <button
            type="button"
            key={`${photo.url}-${index}`}
            className="group cursor-pointer overflow-hidden bg-surface relative aspect-[3/4] text-left"
            onClick={() => setSelectedIndex(index)}
          >
            <div className="h-full w-full">
              <img
                src={photo.thumb}
                alt={photo.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <Lightbox
          photos={photos}
          index={selectedIndex}
          onIndexChange={setSelectedIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
