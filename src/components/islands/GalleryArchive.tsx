import { useMemo, useState } from 'react';
import type { GalleryArchive as GalleryArchiveData, GalleryCity } from '@/lib/itineraries.server';
import { GalleryGrid } from '@/components/islands/GalleryGrid';

type Filter = {
  region: string | null;
  city: string | null;
};

function pillClass(active: boolean): string {
  return `px-3 py-1 rounded-full font-sans font-bold text-[10px] uppercase tracking-widest transition-colors ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-surface text-muted-foreground hover:text-foreground'
  }`;
}

export function GalleryArchive({ photos, regions, cities }: GalleryArchiveData) {
  const [filter, setFilter] = useState<Filter>({ region: null, city: null });

  const visibleCities = useMemo(
    () => (filter.region ? cities.filter((city) => city.region === filter.region) : cities),
    [cities, filter.region],
  );

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (filter.city) return photo.cityKey === filter.city;
      if (filter.region) return photo.region === filter.region;
      return true;
    });
  }, [photos, filter]);

  const selectedCity: GalleryCity | undefined = cities.find((city) => city.key === filter.city);

  const selectRegion = (region: string | null) => {
    setFilter({ region, city: null });
  };

  const selectCity = (city: GalleryCity) => {
    if (filter.city === city.key) {
      window.location.assign(city.href);
      return;
    }
    setFilter({ region: city.region, city: city.key });
  };

  return (
    <div className="space-y-12 lg:space-y-16">
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-[10px] font-sans font-bold uppercase tracking-[0.3em] text-primary">
            Region
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pillClass(filter.region === null)} onClick={() => selectRegion(null)}>
              All
            </button>
            {regions.map((region) => (
              <button
                key={region}
                type="button"
                className={pillClass(filter.region === region)}
                onClick={() => selectRegion(region)}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {visibleCities.length > 0 && (
          <div>
            <p className="mb-3 text-[10px] font-sans font-bold uppercase tracking-[0.3em] text-primary">
              City
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleCities.map((city) => (
                <button
                  key={city.key}
                  type="button"
                  className={pillClass(filter.city === city.key)}
                  title={
                    filter.city === city.key
                      ? `Open day ${city.day} in ${city.tripTitle}`
                      : `Show photographs from ${city.name}`
                  }
                  onClick={() => selectCity(city)}
                >
                  {city.name}
                </button>
              ))}
            </div>
            {selectedCity && (
              <a
                href={selectedCity.href}
                className="mt-4 inline-flex items-center gap-3 text-[11px] font-sans font-bold uppercase tracking-[0.3em] text-foreground hover:text-primary transition-colors"
              >
                Open day {selectedCity.day} in {selectedCity.tripTitle}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>

      <GalleryGrid photos={visiblePhotos} />
    </div>
  );
}
