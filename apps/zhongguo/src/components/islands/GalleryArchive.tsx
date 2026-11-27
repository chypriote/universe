import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { Gallery, GalleryCity } from '@/lib/journal';
import { GalleryGrid } from '@/components/islands/GalleryGrid';
import { ChinaMap, type ChinaMapCity, type ChinaMapRegion } from '@/components/islands/ChinaMap';
import { getRegionZh, projectLngLat } from '@/lib/china-map';

const count = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

type Filter = {
  region: string | null;
  city: string | null;
};

function pillClass(active: boolean): string {
  return `px-3 py-1.5 border text-xs transition-colors ${
    active
      ? 'border-foreground bg-foreground text-background'
      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
  }`;
}

export function GalleryArchive({ photos, provinces, cities }: Gallery) {
  const [filter, setFilter] = useState<Filter>({ region: null, city: null });

  const visibleCities = useMemo(
    () => (filter.region ? cities.filter((city) => city.province === filter.region) : cities),
    [cities, filter.region],
  );

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (filter.city) return photo.city === filter.city;
      if (filter.region) return photo.province === filter.region;
      return true;
    });
  }, [photos, filter]);

  const mapRegions = useMemo<ChinaMapRegion[]>(
    () =>
      provinces.map((name) => {
        const inRegion = photos.filter((photo) => photo.province === name);
        return {
          name,
          zh: getRegionZh(name),
          photo: inRegion[0]?.thumb,
          detail: count(inRegion.length),
        };
      }),
    [photos, provinces],
  );

  const mapCities = useMemo<ChinaMapCity[]>(
    () =>
      cities.map((city) => {
        const inCity = photos.filter((photo) => photo.city === city.name);
        const [x, y] = projectLngLat(city.lng, city.lat);
        return {
          key: city.name,
          name: city.name,
          zh: city.nameZh,
          x,
          y,
          photo: inCity[0]?.thumb,
          detail: count(inCity.length),
        };
      }),
    [photos, cities],
  );

  const selectedCity: GalleryCity | undefined = cities.find((city) => city.name === filter.city);

  const selectRegion = (region: string | null) => {
    setFilter({ region, city: null });
  };

  const selectMapRegion = (region: string) =>
    selectRegion(filter.region === region ? null : region);

  const selectMapCity = (key: string) => {
    const city = cities.find((item) => item.name === key);
    if (city) selectCity(city);
  };

  const selectCity = (city: GalleryCity) => {
    if (filter.city === city.name) {
      window.location.assign(city.href);
      return;
    }
    setFilter({ region: city.province, city: city.name });
  };

  return (
    <div className="space-y-12 lg:space-y-16">
      <ChinaMap
        regions={mapRegions}
        cities={mapCities}
        selectedRegion={filter.region}
        selectedCity={filter.city}
        onSelectRegion={selectMapRegion}
        onSelectCity={selectMapCity}
        idleText="Hover a province or a dot, click to filter"
        previewOnTouch={false}
      />

      <div>
        <div className="hidden space-y-6 md:block">
          <div>
            <p className="mb-3 eyebrow">Province</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={pillClass(filter.region === null)}
                onClick={() => selectRegion(null)}
              >
                All
              </button>
              {provinces.map((region) => (
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
              <p className="mb-3 eyebrow">City</p>
              <div className="flex flex-wrap gap-2">
                {visibleCities.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    className={pillClass(filter.city === city.name)}
                    title={
                      filter.city === city.name
                        ? `Open ${city.day === null ? '' : `day ${city.day} in `}${city.tripTitle}`
                        : `Show photographs from ${city.name}`
                    }
                    onClick={() => selectCity(city)}
                  >
                    {city.name}
                    <span className="ml-1.5" lang="zh">
                      {city.nameZh}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <details className="group border border-border md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-baseline gap-3">
              <span className="eyebrow">Filter</span>
              <span className="text-sm text-foreground">
                {selectedCity
                  ? `${selectedCity.name} · ${selectedCity.province}`
                  : (filter.region ?? 'All places')}
              </span>
            </span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="space-y-5 border-t border-border p-4">
            <button
              type="button"
              className={pillClass(filter.region === null)}
              onClick={() => selectRegion(null)}
            >
              All places
            </button>
            {provinces.map((region) => {
              const regionCities = cities.filter((city) => city.province === region);
              return (
                <div key={region} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    aria-pressed={filter.region === region && filter.city === null}
                    className={`eyebrow w-fit shrink-0 py-1.5 text-left sm:w-32 ${
                      filter.region === region
                        ? '!text-foreground underline underline-offset-4'
                        : '!text-muted-foreground hover:!text-foreground'
                    }`}
                    onClick={() => selectRegion(region)}
                  >
                    {region}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {regionCities.map((city) => (
                      <button
                        key={city.name}
                        type="button"
                        className={pillClass(filter.city === city.name)}
                        title={
                          filter.city === city.name
                            ? `Open ${city.day === null ? '' : `day ${city.day} in `}${city.tripTitle}`
                            : `Show photographs from ${city.name}`
                        }
                        onClick={() => selectCity(city)}
                      >
                        {city.name}
                        <span className="ml-1.5" lang="zh">
                          {city.nameZh}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
        {selectedCity && (
          <a
            href={selectedCity.href}
            className="mt-4 inline-flex items-center gap-3 eyebrow text-foreground hover:text-primary transition-colors"
          >
            Open {selectedCity.day === null ? '' : `day ${selectedCity.day} in `}
            {selectedCity.tripTitle}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        )}
      </div>

      <GalleryGrid photos={visiblePhotos} />
    </div>
  );
}
