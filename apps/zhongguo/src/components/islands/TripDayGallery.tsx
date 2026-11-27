import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Photo } from '@/lib/journal';
import { Lightbox, type LightboxPhoto } from '@/components/islands/Lightbox';

interface TripDayGalleryProps {
  photos: Photo[];
  day: number;
  tripTitle: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** One strip per Day. Every photo is shown as 3:2 landscape or 2:3 portrait (squares count as landscape) and cropped to fit. */
export function TripDayGallery({ photos, day, tripTitle }: TripDayGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setSelectedIndex(null), []);
  const stripRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  const update = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const max = strip.scrollWidth - strip.clientWidth;
    setOverflows(max > 1);
    setProgress(max > 1 ? strip.scrollLeft / max : 0);
    const tiles = Array.from(strip.children) as HTMLElement[];
    // The first photo that is not mostly scrolled out on the left; the last one when scrolled to the end.
    const atEnd = max > 1 && strip.scrollLeft >= max - 1;
    const index = atEnd
      ? tiles.length - 1
      : tiles.findIndex((tile) => tile.offsetLeft + tile.offsetWidth / 2 > strip.scrollLeft);
    setCurrent(Math.max(index, 0));
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [update]);

  const scrollByPage = (direction: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.scrollBy({
      left: direction * strip.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  // On a phone a lone landscape fills the column instead of being cut by the strip height.
  const loneLandscape = photos.length === 1 && photos[0].orientation !== 'portrait';

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
      <div
        ref={stripRef}
        onScroll={update}
        className={`relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:h-[32.5rem] [&::-webkit-scrollbar]:hidden ${
          loneLandscape ? 'h-auto' : 'h-[22rem]'
        }`}
      >
        {photos.map((photo, idx) => (
          <button
            type="button"
            key={`${photo.url}-${idx}`}
            onClick={() => setSelectedIndex(idx)}
            aria-label={`Open photo ${idx + 1} of ${photos.length}: ${photo.alt}`}
            className={`group relative shrink-0 cursor-pointer snap-start overflow-hidden bg-surface ${
              photo.orientation === 'portrait' ? 'aspect-[2/3]' : 'aspect-[3/2]'
            } ${loneLandscape ? 'w-full md:h-full md:w-auto' : 'h-full'}`}
          >
            <img
              src={photo.thumb}
              alt={photo.alt}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {overflows && (
        <div data-covers-back-to-top className="mt-3 flex items-center gap-4">
          <span className="eyebrow tabular-nums text-muted-foreground">
            {pad(current + 1)} / {pad(photos.length)}
          </span>
          <span className="relative h-px flex-1 bg-gold-ink/40" aria-hidden="true">
            <span
              className="absolute -top-px left-0 h-[3px] w-[30%] bg-primary"
              style={{ left: `${progress * 70}%` }}
            />
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={progress <= 0}
              aria-label="Previous photos"
              className="flex h-9 w-9 items-center justify-center border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={progress >= 0.999}
              aria-label="Next photos"
              className="flex h-9 w-9 items-center justify-center border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

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
