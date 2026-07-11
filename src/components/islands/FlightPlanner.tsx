import React, { useState } from 'react';

interface Flight {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  price: number;
  currency: string;
  isCheap?: boolean;
}

const FLIGHTS: Flight[] = [
  { id: '1', origin: 'LHR', destination: 'NRT', departureDate: '2025-05-12', returnDate: '2025-05-26', price: 840, currency: '£', isCheap: true },
  { id: '2', origin: 'LHR', destination: 'NRT', departureDate: '2025-05-14', returnDate: '2025-05-28', price: 920, currency: '£' },
  { id: '3', origin: 'LHR', destination: 'NRT', departureDate: '2025-05-19', returnDate: '2025-06-02', price: 810, currency: '£', isCheap: true },
  { id: '4', origin: 'LHR', destination: 'NRT', departureDate: '2025-05-21', returnDate: '2025-06-04', price: 980, currency: '£' },
  { id: '5', origin: 'LHR', destination: 'NRT', departureDate: '2025-05-26', returnDate: '2025-06-09', price: 1050, currency: '£' },
  { id: '6', origin: 'LHR', destination: 'NRT', departureDate: '2025-06-02', returnDate: '2025-06-16', price: 890, currency: '£' },
];

const CALENDAR_PRICES: Record<string, number> = {
  '2025-05-10': 950, '2025-05-11': 920, '2025-05-12': 840, '2025-05-13': 880, '2025-05-14': 920, '2025-05-15': 960, '2025-05-16': 1100,
  '2025-05-17': 1150, '2025-05-18': 980, '2025-05-19': 810, '2025-05-20': 850, '2025-05-21': 980, '2025-05-22': 940, '2025-05-23': 1020,
  '2025-05-24': 1080, '2025-05-25': 950, '2025-05-26': 1050, '2025-05-27': 990, '2025-05-28': 920, '2025-05-29': 960, '2025-05-30': 1040,
  '2025-05-31': 1120, '2025-06-01': 980, '2025-06-02': 890, '2025-06-03': 910, '2025-06-04': 980, '2025-06-05': 940, '2025-06-06': 1020,
};

export default function FlightPlanner() {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(FLIGHTS[0].id);

  const selectedFlight = FLIGHTS.find(f => f.id === selectedFlightId);

  // Generate calendar days for May 2025
  const daysInMonth = 31;
  const startDay = 4; // May 1st 2025 is a Thursday (index 4)
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - startDay + 1;
    if (day < 1 || day > daysInMonth) return null;
    const dateStr = `2025-05-${day.toString().padStart(2, '0')}`;
    return {
      day,
      date: dateStr,
      price: CALENDAR_PRICES[dateStr] || null
    };
  });

  const isSelected = (date: string) => {
    if (!selectedFlight) return false;
    return date === selectedFlight.departureDate || date === selectedFlight.returnDate;
  };

  const isInRange = (date: string) => {
    if (!selectedFlight) return false;
    return date > selectedFlight.departureDate && date < selectedFlight.returnDate;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Flight Results Table */}
      <div className="lg:col-span-1 border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border bg-background">
          <h2 className="font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Search Results
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {FLIGHTS.map((flight) => (
                <tr
                  key={flight.id}
                  onClick={() => setSelectedFlightId(flight.id)}
                  className={`group cursor-pointer transition-colors ${
                    selectedFlightId === flight.id ? 'bg-primary/5' : 'hover:bg-background'
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      {flight.origin} 
                      <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      {flight.destination}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(flight.departureDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(flight.returnDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className={`font-serif text-lg font-semibold ${flight.isCheap ? 'text-success' : 'text-foreground'}`}>
                      {flight.currency}{flight.price}
                    </div>
                    {flight.isCheap && (
                      <span className="text-[9px] uppercase tracking-tighter bg-success/10 text-success px-1.5 py-0.5 font-bold">Best Value</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Calendar */}
      <div className="lg:col-span-2 border border-border bg-background p-6 lg:p-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="font-serif text-3xl font-bold mb-1">May 2025</h3>
            <p className="text-muted-foreground text-sm font-sans">Compare departure prices by date</p>
          </div>
          <div className="flex gap-4 text-[10px] uppercase tracking-widest font-bold">
            <div className="flex items-center gap-1.5 text-success">
              <span className="w-2 h-2 rounded-full bg-success"></span> Lowest
            </div>
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="w-2 h-2 rounded-full bg-border"></span> Standard
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border border border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-surface py-3 text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              {day}
            </div>
          ))}
          {calendarDays.map((day, i) => (
            <div
              key={i}
              className={`bg-background min-h-[80px] lg:min-h-[110px] p-2 transition-all relative group ${
                day ? 'cursor-default' : ''
              } ${day && isSelected(day.date) ? 'ring-2 ring-primary z-10' : ''} ${
                day && isInRange(day.date) ? 'bg-primary/5' : ''
              }`}
            >
              {day && (
                <>
                  <span className={`text-xs font-sans font-bold ${
                    isSelected(day.date) ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {day.day}
                  </span>
                  {day.price && (
                    <div className="mt-auto pt-4 flex flex-col items-center">
                      <span className={`font-serif text-lg font-medium ${
                        day.price < 850 ? 'text-success' : 'text-foreground/80'
                      }`}>
                        £{day.price}
                      </span>
                      {day.price < 850 && (
                        <div className="w-1 h-1 rounded-full bg-success mt-1"></div>
                      )}
                    </div>
                  )}
                  {isSelected(day.date) && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-serif text-lg font-bold mb-1">Flexible Planning</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">Prices are updated in real-time. Selecting a flight result highlights the specific window in the price calendar for easy comparison.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start text-sm">
             <button className="w-full bg-primary text-primary-foreground font-sans font-bold text-xs uppercase tracking-[0.2em] py-4 hover:bg-primary-hover transition-colors">
              Continue to Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
