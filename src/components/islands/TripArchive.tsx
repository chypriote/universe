import { useState } from 'react';

interface TripArchiveEntry {
  id: string;
  title: string;
  regions: string[];
  dates: string;
  description: string;
  type: 'report' | 'plan';
  photos: string[];
  link: string;
}

interface TripArchiveProps {
  trips: TripArchiveEntry[];
}

export function TripArchive({ trips }: TripArchiveProps) {
  const [view, setView] = useState<'report' | 'plan'>('report');

  const filteredTrips = trips.filter((trip) => trip.type === view);

  return (
    <div className="space-y-12 lg:space-y-20">
      {/* View Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-surface border border-border rounded-full">
          <button
            onClick={() => setView('report')}
            className={`px-8 py-2.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              view === 'report'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Trip Reports
          </button>
          <button
            onClick={() => setView('plan')}
            className={`px-8 py-2.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              view === 'plan'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Trip Plans
          </button>
        </div>
      </div>

      {/* Trip List */}
      <div className="grid grid-cols-1 gap-12 lg:gap-24">
        {filteredTrips.length === 0 && (
          <p className="text-center text-muted-foreground font-serif italic">
            No {view === 'report' ? 'trip reports' : 'trip plans'} in the archive yet.
          </p>
        )}
        {filteredTrips.map((trip) => (
          <article key={trip.id} className="group grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            {/* Meta & Content */}
            <div className="lg:col-span-5 space-y-6 pt-2">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-3">
                  {trip.regions.map(region => (
                    <span key={region} className="text-[10px] font-sans font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">
                      {region}
                    </span>
                  ))}
                  <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground px-1 py-0.5">
                    {trip.dates}
                  </span>
                </div>
                <h2 className="text-h2 font-serif group-hover:text-primary transition-colors">
                  {trip.title}
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed text-balance">
                {trip.description}
              </p>

              <a
                href={trip.link}
                className="inline-flex items-center gap-4 text-[11px] font-sans font-bold uppercase tracking-[0.3em] text-foreground hover:text-primary transition-colors group/link"
              >
                Explore Journey
                <svg className="w-4 h-4 transition-transform group-hover/link:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {/* Visuals */}
            {trip.photos.length > 0 && (
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {trip.photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className={`relative aspect-[3/4] overflow-hidden bg-surface ${
                      idx === 0 ? 'col-span-2 md:col-span-2 aspect-[4/3] md:aspect-[3/2]' : ''
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${trip.title} visual fragment`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
