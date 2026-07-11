import { useState, useEffect, useCallback } from 'react';

interface Photo {
  url: string;
  srcset: string;
  alt: string;
  photographer: string;
}

interface GalleryGridProps {
  title: string;
  tags: string[];
  photos: Photo[];
}

export function GalleryGrid({ title, tags, photos }: GalleryGridProps) {
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

  return (
    <section className="mb-24 lg:mb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border pb-8">
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-surface text-muted-foreground font-sans font-bold text-[10px] uppercase tracking-widest rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight">{title}</h2>
        </div>
        <p className="text-muted-foreground font-sans text-sm tracking-wide max-w-xs">
          An editorial exploration of {title.toLowerCase()}, captured during our seasonal residence.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-start">
        {photos.map((photo, index) => (
          <div
            key={index}
            className={`group cursor-pointer overflow-hidden bg-surface relative ${
              index % 5 === 0 ? 'md:col-span-2 md:row-span-2' : ''
            }`}
            onClick={() => openLightbox(index)}
          >
            <div className="aspect-[4/5] md:aspect-auto h-full">
              <img
                src={photo.url}
                srcSet={photo.srcset}
                sizes={index % 5 === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
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
          </div>
        ))}
      </div>

      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-dark-background/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fade-in">
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-dark-foreground hover:text-primary transition-colors z-[110]"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={prevPhoto}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-dark-foreground hover:text-primary transition-colors p-2"
            aria-label="Previous"
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
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
                src={photos[selectedIndex].url}
                alt={photos[selectedIndex].alt}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="text-center text-dark-foreground max-w-2xl">
              <p className="font-serif text-2xl mb-2">{title}</p>
              <p className="text-dark-muted-foreground text-xs uppercase tracking-widest font-sans">
                Photograph by {photos[selectedIndex].photographer}
              </p>
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
    </section>
  );
}
