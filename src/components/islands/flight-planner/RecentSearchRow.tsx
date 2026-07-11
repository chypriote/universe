import type { FlightSearchRow } from '@/lib/flight-utils';
import { formatPrice, formatSearchedOn, formatShortDate } from './utils';

interface RecentSearchRowProps {
  flight: FlightSearchRow;
  isSelected: boolean;
  onSelect: () => void;
  rowRef: (element: HTMLTableRowElement | null) => void;
}

export function RecentSearchRow({
  flight,
  isSelected,
  onSelect,
  rowRef,
}: RecentSearchRowProps) {
  return (
    <tr
      ref={rowRef}
      onClick={onSelect}
      className={`group cursor-pointer transition-colors relative ${
        isSelected
          ? 'bg-primary/5 ring-1 ring-inset ring-primary/20'
          : flight.isCityLowest
            ? 'bg-[color-mix(in_oklab,gold_12%,var(--color-surface))]'
            : 'hover:bg-background'
      }`}
    >
      <td className="px-4 py-4 pb-6">
        <div className="font-bold text-foreground flex items-center gap-2 min-w-0">
          <span className="truncate" title={flight.airport}>
            {flight.cityLabel}
          </span>
          {flight.isDirect && (
            <span
              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-background text-muted-foreground"
              title="Direct"
            >
              ✈️
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 font-variant-numeric tabular-nums">
          {formatShortDate(flight.outboundDate)} — {formatShortDate(flight.returnDate)}
        </div>
        <span className="absolute left-4 bottom-2 text-[10px] text-muted-foreground/70">
          {formatSearchedOn(flight.searchedOn)}
        </span>
      </td>
      <td className="px-4 py-4 text-right align-top">
        <div
          className="font-serif text-lg font-semibold tabular-nums"
          style={{ color: flight.priceColor }}
        >
          {formatPrice(flight.price)}
        </div>
        {flight.isCityLowest && (
          <span className="text-[9px] uppercase tracking-tighter bg-success/10 text-success px-1.5 py-0.5 font-bold">
            Best Value
          </span>
        )}
      </td>
    </tr>
  );
}
