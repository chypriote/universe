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
        {filteredTrips.map((trip) => {
          const [landscape, ...portraits] = trip.photos;
          const firstRowPortrait = portraits[0];
          const secondRowPortraits = portraits.slice(1, 4);

          return (
            <article key={trip.id} className="group grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              {/* Meta & Content */}
              <div className="lg:col-span-5 space-y-6 pt-2">
                <div className="space-y-2">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground">
                    {trip.dates}
                  </span>
                  <h2 className="text-h2 font-serif">
                    <a href={trip.link} className="hover:text-primary transition-colors">
                      {trip.title}
                    </a>
                  </h2>
                </div>

                <p className="text-muted-foreground leading-relaxed text-balance">
                  {trip.description}
                </p>

                {trip.regions.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {trip.regions.map(region => (
                      <span key={region} className="text-[10px] font-sans font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">
                        {region}
                      </span>
                    ))}
                  </div>
                )}

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

              {/* Visuals: 16:9 + 9:16, then three 9:16 */}
              {trip.photos.length > 0 && (
                <div className="lg:col-span-7 space-y-4">
                  {(landscape || firstRowPortrait) && (
                    <div
                      className="grid gap-4 items-start"
                      style={{ gridTemplateColumns: landscape && firstRowPortrait ? '256fr 81fr' : '1fr' }}
                    >
                      {landscape && (
                        <div className="relative aspect-video overflow-hidden bg-surface">
                          <img
                            src={landscape}
                            alt={`${trip.title} visual fragment`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {firstRowPortrait && (
                        <div className="relative aspect-[9/16] overflow-hidden bg-surface">
                          <img
                            src={firstRowPortrait}
                            alt={`${trip.title} visual fragment`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {secondRowPortraits.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {secondRowPortraits.map((photo, idx) => (
                        <div key={idx} className="relative aspect-[9/16] overflow-hidden bg-surface">
                          <img
                            src={photo}
                            alt={`${trip.title} visual fragment`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
