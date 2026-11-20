import { useState } from 'react';
import { CHINA_MAP } from '@/lib/china-map';

export type ChinaMapRegion = {
  name: string;
  zh: string;
  photo?: string;
  detail?: string;
  /** With an href the region is a link; without one it calls onSelectRegion. */
  href?: string;
};

export type ChinaMapCity = {
  key: string;
  name: string;
  zh: string;
  x: number;
  y: number;
  photo?: string;
  detail?: string;
};

interface ChinaMapProps {
  regions: ChinaMapRegion[];
  cities?: ChinaMapCity[];
  selectedRegion?: string | null;
  selectedCity?: string | null;
  onSelectRegion?: (name: string) => void;
  onSelectCity?: (key: string) => void;
  tone?: 'light' | 'dark';
  idleText?: string;
}

const TONES = {
  light: {
    land: 'fill-surface stroke-background',
    visited: 'fill-foreground/25 stroke-background',
    selected: 'fill-foreground stroke-background',
    dot: 'fill-foreground stroke-background',
    muted: 'text-muted-foreground',
    border: 'border-border',
  },
  dark: {
    land: 'fill-dark-border stroke-dark-background',
    visited: 'fill-dark-muted-foreground/40 stroke-dark-background',
    selected: 'fill-dark-foreground stroke-dark-background',
    dot: 'fill-dark-foreground stroke-dark-background',
    muted: 'text-dark-muted-foreground',
    border: 'border-dark-border',
  },
};

export function ChinaMap({
  regions,
  cities = [],
  selectedRegion = null,
  selectedCity = null,
  onSelectRegion,
  onSelectCity,
  tone = 'light',
  idleText = 'Hover a region',
}: ChinaMapProps) {
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const [hoverCity, setHoverCity] = useState<string | null>(null);
  const t = TONES[tone];

  const regionByName = new Map(regions.map((region) => [region.name, region]));
  const cityByKey = new Map(cities.map((city) => [city.key, city]));

  const shown =
    cityByKey.get(hoverCity ?? '') ??
    regionByName.get(hoverRegion ?? '') ??
    cityByKey.get(selectedCity ?? '') ??
    regionByName.get(selectedRegion ?? '');

  const regionClass = (name: string) => {
    if (hoverRegion === name) return 'fill-primary stroke-background';
    if (selectedRegion === name) return t.selected;
    return regionByName.has(name) ? t.visited : t.land;
  };

  // On touch screens the first tap shows the preview, the second follows the link.
  const handleRegionClick = (event: React.MouseEvent, region: ChinaMapRegion) => {
    if (region.href && (event.nativeEvent as PointerEvent).pointerType === 'touch' && hoverRegion !== region.name) {
      event.preventDefault();
      setHoverRegion(region.name);
    } else {
      onSelectRegion?.(region.name);
    }
  };

  const regionHandlers = (region: ChinaMapRegion) => ({
    onMouseEnter: () => setHoverRegion(region.name),
    onMouseLeave: () => setHoverRegion(null),
    onFocus: () => setHoverRegion(region.name),
    onBlur: () => setHoverRegion(null),
    onClick: (event: React.MouseEvent) => handleRegionClick(event, region),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      <svg
        viewBox={`0 0 ${CHINA_MAP.width} ${CHINA_MAP.height}`}
        className="w-full h-auto lg:col-span-6"
        role="group"
        aria-label="Map of China"
      >
        {CHINA_MAP.regions.map((shape) => {
          const region = regionByName.get(shape.name);
          if (!region || shape.outline) {
            return <path key={shape.name} d={shape.d} className={`${t.land} stroke-[1.5]`} />;
          }
          const path = (
            <path d={shape.d} className={`${regionClass(shape.name)} stroke-[1.5] transition-colors`} />
          );
          return region.href ? (
            <a key={shape.name} href={region.href} aria-label={`${region.name} ${region.zh}`} {...regionHandlers(region)}>
              {path}
            </a>
          ) : (
            <g
              key={shape.name}
              role="button"
              tabIndex={0}
              aria-label={`${region.name} ${region.zh}`}
              aria-pressed={selectedRegion === shape.name}
              className="cursor-pointer outline-none focus-visible:[&>path]:fill-primary"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectRegion?.(shape.name);
                }
              }}
              {...regionHandlers(region)}
            >
              {path}
            </g>
          );
        })}

        {cities.map((city) => {
          const active = hoverCity === city.key || selectedCity === city.key;
          return (
            <g
              key={city.key}
              role="button"
              tabIndex={0}
              aria-label={`${city.name} ${city.zh}`}
              aria-pressed={selectedCity === city.key}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHoverCity(city.key)}
              onMouseLeave={() => setHoverCity(null)}
              onFocus={() => setHoverCity(city.key)}
              onBlur={() => setHoverCity(null)}
              onClick={() => onSelectCity?.(city.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectCity?.(city.key);
                }
              }}
            >
              <circle cx={city.x} cy={city.y} r={16} className="fill-transparent" />
              <circle
                cx={city.x}
                cy={city.y}
                r={active ? 9 : 7}
                className={`${active ? 'fill-primary stroke-background' : t.dot} stroke-[2.5] transition-all`}
              />
            </g>
          );
        })}
      </svg>

      <div className="lg:col-span-6" aria-live="polite">
        {shown ? (
          <div>
            {shown.photo && (
              <img
                src={shown.photo}
                alt=""
                className={`w-full aspect-[4/3] object-cover border ${t.border}`}
                loading="lazy"
              />
            )}
            <p className="mt-4 font-serif text-3xl font-light">{shown.name}</p>
            {shown.zh && (
              <p lang="zh" className={`mt-1 text-xl ${t.muted}`}>
                {shown.zh}
              </p>
            )}
            {shown.detail && <p className={`mt-3 eyebrow ${t.muted}`}>{shown.detail}</p>}
          </div>
        ) : (
          <p className={`eyebrow ${t.muted}`}>{idleText}</p>
        )}
      </div>
    </div>
  );
}
