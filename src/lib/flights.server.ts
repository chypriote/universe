import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  getAirportLabel,
  priceToColor,
  type FlightSearchRow,
} from './flight-utils';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dbPath = join(projectRoot, 'flights.db');

const MIN_OUTBOUND_DATE = '2027-01-01';

function openDatabase(): DatabaseSync | null {
  if (!existsSync(dbPath)) {
    return null;
  }
  return new DatabaseSync(dbPath, { readOnly: true });
}

export function getRecentFlightSearches(): FlightSearchRow[] {
  const db = openDatabase();
  if (!db) {
    return [];
  }

  try {
    const rows = db
      .prepare(
        `
        SELECT fs.airport, fs.stops, fs.price, fs.outbound_date, fs.return_date, fs.searched_on, fs.created_at
        FROM flight_searches fs
        INNER JOIN (
          SELECT airport, outbound_date, MAX(created_at) AS created_at
          FROM flight_searches
          WHERE outbound_date > ?
            AND price IS NOT NULL
          GROUP BY airport, outbound_date
        ) latest
          ON fs.airport = latest.airport
         AND fs.outbound_date = latest.outbound_date
         AND fs.created_at = latest.created_at
        WHERE fs.price IS NOT NULL
        ORDER BY fs.price ASC, fs.airport ASC, fs.outbound_date ASC
      `
      )
      .all(MIN_OUTBOUND_DATE) as Array<{
      airport: string;
      stops: string;
      price: number;
      outbound_date: string;
      return_date: string;
      searched_on: string;
      created_at: string;
    }>;

    if (rows.length === 0) {
      return [];
    }

    const prices = rows.map((row) => row.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const minPriceByAirport = new Map<string, number>();
    for (const row of rows) {
      const current = minPriceByAirport.get(row.airport);
      if (current === undefined || row.price < current) {
        minPriceByAirport.set(row.airport, row.price);
      }
    }

    const highlightedAirports = new Set<string>();

    return rows.map((row) => {
      const airportMin = minPriceByAirport.get(row.airport)!;
      const isCityLowest = row.price === airportMin && !highlightedAirports.has(row.airport);
      if (isCityLowest) {
        highlightedAirports.add(row.airport);
      }

      return {
        id: `${row.airport}-${row.outbound_date}-${row.return_date}-${row.stops}`,
        airport: row.airport,
        stops: row.stops as FlightSearchRow['stops'],
        price: row.price,
        outboundDate: row.outbound_date,
        returnDate: row.return_date,
        searchedOn: row.searched_on,
        createdAt: row.created_at,
        cityLabel: getAirportLabel(row.airport),
        isDirect: row.stops === 'nostop',
        isCityLowest,
        priceColor: priceToColor(row.price, minPrice, maxPrice),
      };
    });
  } finally {
    db.close();
  }
}

export type { FlightSearchRow };