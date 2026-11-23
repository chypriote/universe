import { useState, useCallback } from 'react';
import type { TripGalleryPhoto } from '@/lib/itineraries.server';
import { Lightbox, type LightboxPhoto } from '@/components/islands/Lightbox';

interface TripDayGalleryProps {
  photos: TripGalleryPhoto[];
  day: number;
  tripTitle: string;
}

export function TripDayGallery({ photos, day, tripTitle }: TripDayGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  const lightboxPhotos: LightboxPhoto[] = photos.map((photo) => ({
    url: photo.src,
    alt: `Fragment of Day ${day}`,
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
            key={`${photo.src}-${idx}`}
            onClick={() => setSelectedIndex(idx)}
            className={`group relative overflow-hidden bg-surface cursor-pointer ${
              photo.format === '16:9' ? 'col-span-2 aspect-[16/9]' : 'aspect-[9/16]'
            }`}
          >
            <img
              src={photo.thumb}
              alt={`Fragment of Day ${day}`}
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
