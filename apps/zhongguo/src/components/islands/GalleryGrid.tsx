import { useState, useCallback } from 'react';
import { ZoomIn } from 'lucide-react';
import type { GalleryPhoto } from '@/lib/journal';
import { Lightbox } from '@/components/islands/Lightbox';

interface GalleryGridProps {
  photos: GalleryPhoto[];
}

export function GalleryGrid({ photos }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  if (photos.length === 0) {
    return <p className="text-muted-foreground font-serif">No photographs for this place yet.</p>;
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
              <ZoomIn size={32} className="text-white" aria-hidden="true" />
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
