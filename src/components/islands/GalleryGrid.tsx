import { useState, useEffect, useCallback } from 'react';
import type { GalleryPhoto } from '@/lib/itineraries.server';

interface GalleryGridProps {
  photos: GalleryPhoto[];
}

export function GalleryGrid({ photos }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    document.body.style.overflow = '';
  }, []);

  const nextPhoto = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % photos.length);
    }
  }, [selectedIndex, photos.length]);

  const prevPhoto = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length);
    }
  }, [selectedIndex, photos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, closeLightbox, nextPhoto, prevPhoto]);

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= photos.length) {
      closeLightbox();
    }
  }, [photos.length, selectedIndex, closeLightbox]);

  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

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
            onClick={() => openLightbox(index)}
          >
            <div className="h-full w-full">
              <img
                src={photo.url}
                srcSet={photo.srcset}
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 16vw, 12vw"
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

      {selected && (
        <div className="fixed inset-0 z-[100] bg-dark-background/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fade-in">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-dark-foreground hover:text-primary transition-colors z-[110]"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={prevPhoto}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-dark-foreground hover:text-primary transition-colors p-2"
            aria-label="Previous"
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={nextPhoto}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-dark-foreground hover:text-primary transition-colors p-2"
            aria-label="Next"
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="w-full h-full flex flex-col items-center justify-center gap-6">
            <div className="relative max-w-6xl max-h-[80vh] w-full flex items-center justify-center">
              <img
                src={selected.url}
                alt={selected.alt}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="text-center text-dark-foreground max-w-2xl">
              <p className="font-serif text-2xl mb-2">
                {selected.city ?? selected.tripTitle}
              </p>
              <p className="text-dark-muted-foreground text-xs uppercase tracking-widest font-sans">
                Photograph by {selected.photographer}
                {selected.day !== null && ` · Day ${selected.day}`}
              </p>
              {selected.href && (
                <a
                  href={selected.href}
                  className="mt-4 inline-flex items-center gap-2 eyebrow text-primary hover:text-dark-foreground transition-colors"
                >
                  Open {selected.day !== null ? `day ${selected.day}` : 'this journey'} in {selected.tripTitle}
                </a>
              )}
              <div className="mt-4 flex justify-center gap-1">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 transition-all duration-300 ${i === selectedIndex ? 'w-8 bg-primary' : 'w-2 bg-dark-border'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
