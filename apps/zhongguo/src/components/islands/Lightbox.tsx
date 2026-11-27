import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryPhoto } from '@/lib/journal';

export type LightboxPhoto = Pick<GalleryPhoto, 'url' | 'alt' | 'caption' | 'tripTitle' | 'photographer'> &
  Partial<Pick<GalleryPhoto, 'day' | 'href'>>;

interface LightboxProps {
  photos: LightboxPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({ photos, index, onIndexChange, onClose }: LightboxProps) {
  const selected = photos[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const nextPhoto = () => onIndexChange((index + 1) % photos.length);
  const prevPhoto = () => onIndexChange((index - 1 + photos.length) % photos.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length);
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, photos.length, onIndexChange, onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    if (!selected) onClose();
  }, [selected, onClose]);

  if (!selected) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={selected.caption || selected.alt}
      className="fixed inset-0 z-[100] bg-dark-background/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fade-in"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 text-dark-foreground hover:text-primary transition-colors z-[110]"
        aria-label="Close"
      >
        <X size={32} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={prevPhoto}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-dark-foreground hover:text-primary transition-colors p-2"
        aria-label="Previous"
      >
        <ChevronLeft size={40} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={nextPhoto}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-dark-foreground hover:text-primary transition-colors p-2"
        aria-label="Next"
      >
        <ChevronRight size={40} aria-hidden="true" />
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
            {selected.caption}
          </p>
          <p className="eyebrow text-dark-muted-foreground">
            Photograph by {selected.photographer}
            {selected.day != null && ` · Day ${selected.day}`}
          </p>
          {selected.href && (
            <a
              href={selected.href}
              className="mt-4 inline-flex items-center gap-2 eyebrow text-primary hover:text-dark-foreground transition-colors"
            >
              Open {selected.day != null ? `day ${selected.day}` : 'this journey'} in {selected.tripTitle}
            </a>
          )}
          <div className="mt-4 flex justify-center gap-1">
            {photos.map((_, i) => (
              <div
                key={i}
                className={`h-1 transition-all duration-300 ${i === index ? 'w-8 bg-primary' : 'w-2 bg-dark-border'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
