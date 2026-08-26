import { useEffect, useState, type ComponentType } from 'react';
import type { TripRoute } from '@/lib/itineraries.server';
import { ErrorBoundary } from '@/components/islands/ErrorBoundary';

type TripRouteMapProps = {
  route: TripRoute;
};

const mapFallback = (
  <div className="flex h-full min-h-[320px] items-center justify-center border border-border bg-surface p-8 text-center">
    <div>
      <h2 className="mb-2 font-serif text-xl italic text-foreground">The map could not load</h2>
      <p className="text-sm text-muted-foreground">Refresh the page to try again.</p>
    </div>
  </div>
);

function TripRouteMapLoader({ route }: TripRouteMapProps) {
  const [Inner, setInner] = useState<ComponentType<TripRouteMapProps> | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('./TripRouteMapInner').then((module) => {
      if (!cancelled) {
        setInner(() => module.TripRouteMapInner);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!Inner) {
    return <div className="h-full w-full bg-surface" aria-hidden="true" />;
  }

  return <Inner route={route} />;
}

export function TripRouteMap({ route }: TripRouteMapProps) {
  return (
    <div className="h-full w-full">
      <ErrorBoundary fallback={mapFallback}>
        <TripRouteMapLoader route={route} />
      </ErrorBoundary>
    </div>
  );
}
