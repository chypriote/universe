import { useState, useCallback } from 'react';
import type { Photo } from '@/lib/journal';
import { Lightbox, type LightboxPhoto } from '@/components/islands/Lightbox';

interface TripDayGalleryProps {
  photos: Photo[];
  day: number;
  tripTitle: string;
}

export function TripDayGallery({ photos, day, tripTitle }: TripDayGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  const lightboxPhotos: LightboxPhoto[] = photos.map((photo) => ({
    url: photo.url,
    alt: photo.alt,
    caption: photo.caption,
    tripTitle,
    photographer: 'Nico',
    day,
  }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {photos.map((photo, idx) => (
          <button
            type="button"
            key={`${photo.url}-${idx}`}
            onClick={() => setSelectedIndex(idx)}
            className={`group relative overflow-hidden bg-surface cursor-pointer ${
              photo.orientation === 'portrait' ? 'aspect-[9/16]' : 'col-span-2 aspect-[16/9]'
            }`}
          >
            <img
              src={photo.thumb}
              alt={photo.alt}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <Lightbox
          photos={lightboxPhotos}
          index={selectedIndex}
          onIndexChange={setSelectedIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
