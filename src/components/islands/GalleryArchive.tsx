import { useMemo, useState } from 'react';
import type { GalleryArchive as GalleryArchiveData, GalleryCity } from '@/lib/itineraries.server';
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

  const mapRegions = useMemo<ChinaMapRegion[]>(
    () =>
      regions.map((name) => {
        const inRegion = photos.filter((photo) => photo.region === name);
        return { name, zh: getRegionZh(name), photo: inRegion[0]?.thumb, detail: count(inRegion.length) };
      }),
    [photos, regions],
  );

  const mapCities = useMemo<ChinaMapCity[]>(
    () =>
      cities.map((city) => {
        const inCity = photos.filter((photo) => photo.cityKey === city.key);
        const [x, y] = projectLngLat(city.lng, city.lat);
        return { key: city.key, name: city.name, zh: city.nameZh, x, y, photo: inCity[0]?.thumb, detail: count(inCity.length) };
      }),
    [photos, cities],
  );

  const selectedCity: GalleryCity | undefined = cities.find((city) => city.key === filter.city);

  const selectRegion = (region: string | null) => {
    setFilter({ region, city: null });
  };

  const selectMapRegion = (region: string) => selectRegion(filter.region === region ? null : region);

  const selectMapCity = (key: string) => {
    const city = cities.find((item) => item.key === key);
    if (city) selectCity(city);
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
      <ChinaMap
        regions={mapRegions}
        cities={mapCities}
        selectedRegion={filter.region}
        selectedCity={filter.city}
        onSelectRegion={selectMapRegion}
        onSelectCity={selectMapCity}
        idleText="Hover a region or a dot, click to filter"
      />

      <div className="space-y-6">
        <div>
          <p className="mb-3 eyebrow">
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
            <p className="mb-3 eyebrow">
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
                  <span className="ml-1.5 opacity-80" lang="zh">
                    {city.nameZh}
                  </span>
                </button>
              ))}
            </div>
            {selectedCity && (
              <a
                href={selectedCity.href}
                className="mt-4 inline-flex items-center gap-3 eyebrow text-foreground hover:text-primary transition-colors"
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
