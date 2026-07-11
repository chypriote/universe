import { useState } from 'react';

interface Trip {
  id: string;
  title: string;
  regions: string[];
  dates: string;
  description: string;
  type: 'report' | 'plan';
  photos: string[];
  link: string;
}

const TRIPS: Trip[] = [
  {
    id: 'atlas-2024',
    title: 'High Atlas Expedition',
    regions: ['Morocco', 'High Atlas'],
    dates: 'September 2024',
    description: 'A two-week monograph of the Berber villages and jagged peaks of the High Atlas. We focused on the architecture of clay and the precision of ancient irrigation.',
    type: 'report',
    photos: [
      'https://images.pexels.com/photos/20220332/pexels-photo-20220332.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/29865441/pexels-photo-29865441.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/9094864/pexels-photo-9094864.jpeg?auto=compress&cs=tinysrgb&w=400'
    ],
    link: '/trips/atlas-2024'
  },
  {
    id: 'kyoto-2023',
    title: 'Kyoto Stone Gardens',
    regions: ['Japan', 'Kyoto'],
    dates: 'November 2023',
    description: 'Exploring the Zen concept of Ma (negative space) through the temple gardens of Kyoto. An exercise in slow photography and silent observation.',
    type: 'report',
    photos: [
      'https://images.pexels.com/photos/29865441/pexels-photo-29865441.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/18912997/pexels-photo-18912997.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/20220332/pexels-photo-20220332.jpeg?auto=compress&cs=tinysrgb&w=400'
    ],
    link: '/trips/kyoto-2023'
  },
  {
    id: 'amalfi-2025',
    title: 'Amalfi Coast Monograph',
    regions: ['Italy', 'Amalfi'],
    dates: 'June 2025',
    description: 'A planned route along the vertical architecture of the Amalfi Coast. Mapping the intersection of lemon groves and salt-blasted stone.',
    type: 'plan',
    photos: [
      'https://images.pexels.com/photos/18912997/pexels-photo-18912997.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/29865441/pexels-photo-29865441.jpeg?auto=compress&cs=tinysrgb&w=400'
    ],
    link: '/trips/amalfi-2025'
  },
  {
    id: 'sahara-2025',
    title: 'Sahara Solitude',
    regions: ['Morocco', 'Merzouga'],
    dates: 'October 2025',
    description: 'Navigating the Erg Chebbi dunes. A study in transient landscapes and the mathematics of wind-shaped sand.',
    type: 'plan',
    photos: [
      'https://images.pexels.com/photos/9094864/pexels-photo-9094864.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/20220332/pexels-photo-20220332.jpeg?auto=compress&cs=tinysrgb&w=400'
    ],
    link: '/trips/sahara-2025'
  }
];

export function TripArchive() {
  const [view, setView] = useState<'report' | 'plan'>('report');

  const filteredTrips = TRIPS.filter(trip => trip.type === view);

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
          </article>
        ))}
      </div>
    </div>
  );
}
