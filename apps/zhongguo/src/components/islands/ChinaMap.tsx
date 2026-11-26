import { useLayoutEffect, useRef, useState } from 'react';
import { CHINA_MAP } from '@/lib/china-map';

export type ChinaMapRegion = {
  name: string;
  zh: string;
  photo?: string;
  /** Focal point of the photo in percent, as `object-position`; the centre without one. */
  focus?: { x: number; y: number };
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
  /** Minor City: a paper-filled dot with an outline instead of a filled one. Defaults to major. */
  major?: boolean;
  /** Shown in the hover tooltip after the name. */
  province?: string;
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
  /** The photo and name beside the map; off, the map takes the full width. */
  preview?: boolean;
  /** Hovering a region shows a tooltip with its name and detail at the pointer. */
  regionTooltip?: boolean;
}

/** Label font size in map units; keep in step with the text-[…px] class on the label. */
const LABEL_SIZE = 22;

/** Labels at a fixed point in map units. Hong Kong and Macao are too small to hover, so their labels sit offshore on a leader line. */
const PINNED_LABELS: Record<string, { at: [number, number]; leader?: boolean }> = {
  Guangdong: { at: [712, 712] },
  'Hong Kong': { at: [820, 776], leader: true },
  Macao: { at: [696, 790], leader: true },
};

const TONES = {
  light: {
    land: 'fill-foreground/10 stroke-background',
    visited: 'fill-foreground/45 stroke-background',
    selected: 'fill-foreground stroke-background',
    dot: 'fill-foreground stroke-background',
    label: 'fill-foreground stroke-background stroke-[4]',
    leader: 'stroke-foreground',
    hollow: 'fill-background',
    minorStroke: 'stroke-foreground',
    muted: 'text-muted-foreground',
    border: 'border-border',
  },
  dark: {
    land: 'fill-dark-border stroke-dark-background',
    visited: 'fill-dark-muted-foreground/40 stroke-dark-background',
    selected: 'fill-dark-foreground stroke-dark-background',
    dot: 'fill-dark-foreground stroke-dark-background',
    label: 'fill-dark-foreground stroke-dark-background stroke-[4]',
    leader: 'stroke-dark-foreground',
    hollow: 'fill-dark-background',
    minorStroke: 'stroke-dark-foreground',
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
  preview = true,
  regionTooltip = false,
}: ChinaMapProps) {
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const [hoverCity, setHoverCity] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const t = TONES[tone];
  const svgRef = useRef<SVGSVGElement>(null);
  const [labelPos, setLabelPos] = useState<Record<string, { x: number; y: number; cx: number; cy: number }>>({});

  // Touch screens have no hover, so each clickable region carries its name, centred on its shape unless pinned.
  useLayoutEffect(() => {
    const centres: [string, number, number][] = [];
    svgRef.current?.querySelectorAll<SVGPathElement>('path[data-region]').forEach((path) => {
      const box = path.getBBox();
      centres.push([path.dataset.region as string, box.x + box.width / 2, box.y + box.height / 2]);
    });
    // Small neighbouring regions would print on top of each other, so push a label down until it is clear.
    const width = (name: string) => name.length * LABEL_SIZE * 0.6;
    const placed: { x: number; y: number; w: number }[] = [];
    const next: Record<string, { x: number; y: number; cx: number; cy: number }> = {};
    for (const [name, cx, cy] of centres) {
      const pin = PINNED_LABELS[name];
      if (!pin) continue;
      placed.push({ x: pin.at[0], y: pin.at[1], w: width(name) });
      next[name] = { x: pin.at[0], y: pin.at[1], cx, cy };
    }
    for (const [name, x, y0] of centres.sort((a, b) => a[2] - b[2])) {
      if (next[name]) continue;
      const w = width(name);
      let y = y0;
      while (placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 && Math.abs(p.y - y) < LABEL_SIZE)) y += LABEL_SIZE;
      placed.push({ x, y, w });
      next[name] = { x, y, cx: x, cy: y0 };
    }
    setLabelPos(next);
  }, [regions]);

  const regionByName = new Map(regions.map((region) => [region.name, region]));
  const cityByKey = new Map(cities.map((city) => [city.key, city]));

  const hoverCityData = cityByKey.get(hoverCity ?? '');

  const shown =
    cityByKey.get(hoverCity ?? '') ??
    regionByName.get(hoverRegion ?? '') ??
    cityByKey.get(selectedCity ?? '') ??
    regionByName.get(selectedRegion ?? '');

  const dotClass = (city: ChinaMapCity, active: boolean) => {
    if (city.major === false) return active ? `${t.hollow} stroke-primary` : `${t.hollow} ${t.minorStroke}`;
    return active ? 'fill-primary stroke-background' : t.dot;
  };

  const regionClass = (name: string) => {
    if (hoverRegion === name) return 'fill-primary stroke-background';
    if (selectedRegion === name) return t.selected;
    return regionByName.has(name) ? t.visited : t.land;
  };

  // Touch browsers fire emulated mouse and focus events before click, so hover state cannot tell a first tap from a second.
  // A separate "armed" region does: the first touch tap arms it and shows the preview, the second follows the link.
  const touch = useRef(false);
  const [armedRegion, setArmedRegion] = useState<string | null>(null);

  const handleRegionClick = (event: React.MouseEvent, region: ChinaMapRegion) => {
    if (region.href && touch.current && armedRegion !== region.name) {
      event.preventDefault();
      setArmedRegion(region.name);
      setHoverRegion(region.name);
    } else {
      onSelectRegion?.(region.name);
    }
  };

  const regionHandlers = (region: ChinaMapRegion) => ({
    onPointerDown: (event: React.PointerEvent) => {
      touch.current = event.pointerType === 'touch';
    },
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType !== 'touch') setHoverRegion(region.name);
    },
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType !== 'touch') setHoverRegion(null);
    },
    onFocus: () => {
      if (!touch.current) setHoverRegion(region.name);
    },
    onBlur: () => {
      if (!touch.current) setHoverRegion(null);
    },
    onClick: (event: React.MouseEvent) => handleRegionClick(event, region),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      <div
        className={`relative ${preview ? 'lg:col-span-6' : 'lg:col-span-12'}`}
        onPointerMove={(event) => {
          if (!regionTooltip) return;
          const box = event.currentTarget.getBoundingClientRect();
          setPointer({ x: event.clientX - box.left, y: event.clientY - box.top });
        }}
      >
      <svg
        viewBox={`0 0 ${CHINA_MAP.width} ${CHINA_MAP.height}`}
        ref={svgRef}
        className="w-full h-auto"
        role="group"
        aria-label="Map of China"
      >
        {CHINA_MAP.regions.map((shape) => {
          const region = regionByName.get(shape.name);
          if (!region || shape.outline) {
            return <path key={shape.name} d={shape.d} className={`${t.land} stroke-[1.5]`} />;
          }
          const path = (
            <path d={shape.d} data-region={shape.name} className={`${regionClass(shape.name)} stroke-[1.5] transition-colors`} />
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

        {/* A label is a second hover and click target for its region; the shape keeps keyboard focus. */}
        {regions.map((region) => {
          const pos = labelPos[region.name];
          if (!pos) return null;
          const label = (
            <>
              {PINNED_LABELS[region.name]?.leader && (
                <line
                  x1={pos.cx}
                  y1={pos.cy}
                  x2={pos.x}
                  y2={pos.y - LABEL_SIZE / 2}
                  className={`${hoverRegion === region.name ? 'stroke-primary' : t.leader} stroke-[1.5] pointer-events-none transition-colors`}
                />
              )}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={`select-none text-[22px] font-medium ${t.label}`}
                style={{ paintOrder: 'stroke' }}
              >
                {region.name}
              </text>
            </>
          );
          return region.href ? (
            <a key={region.name} href={region.href} tabIndex={-1} aria-hidden="true" {...regionHandlers(region)}>
              {label}
            </a>
          ) : (
            <g key={region.name} aria-hidden="true" className="cursor-pointer" {...regionHandlers(region)}>
              {label}
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
                className={`${dotClass(city, active)} stroke-[2.5] transition-all`}
              />
            </g>
          );
        })}
      </svg>
      {regionTooltip && !hoverCityData && hoverRegion && pointer && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          style={{ left: pointer.x, top: pointer.y - 14 }}
        >
          {regionByName.get(hoverRegion)?.name} <span lang="zh">{regionByName.get(hoverRegion)?.zh}</span>
          {regionByName.get(hoverRegion)?.detail && ` · ${regionByName.get(hoverRegion)?.detail}`}
        </div>
      )}
      {hoverCityData && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          style={{
            left: `${(hoverCityData.x / CHINA_MAP.width) * 100}%`,
            top: `calc(${(hoverCityData.y / CHINA_MAP.height) * 100}% - 14px)`,
          }}
        >
          {hoverCityData.province ? `${hoverCityData.name}, ${hoverCityData.province}` : `${hoverCityData.name} ${hoverCityData.zh}`}
        </div>
      )}
      </div>

      {preview && (
      <div className="lg:col-span-6" aria-live="polite">
        {/* The frame and text block keep a fixed size, so changing the preview never moves the map or the page. */}
        <div className={`w-full aspect-[4/3] border ${t.border}`}>
          {shown?.photo ? (
            <img
              src={shown.photo}
              alt=""
              className="size-full object-cover"
              style={'focus' in shown && shown.focus ? { objectPosition: `${shown.focus.x}% ${shown.focus.y}%` } : undefined}
              loading="lazy"
            />
          ) : (
            <span
              lang="zh"
              aria-hidden="true"
              className={`grid size-full place-items-center font-brush text-8xl opacity-40 ${t.muted}`}
            >
              中国
            </span>
          )}
        </div>
        <div className="mt-4 min-h-32">
          {shown ? (
            <>
              <p className="font-serif text-3xl font-light">{shown.name}</p>
              {shown.zh && (
                <p lang="zh" className={`mt-1 text-xl ${t.muted}`}>
                  {shown.zh}
                </p>
              )}
              {shown.detail && <p className={`mt-3 eyebrow ${t.muted}`}>{shown.detail}</p>}
            </>
          ) : (
            <p className={`eyebrow ${t.muted}`}>{idleText}</p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
