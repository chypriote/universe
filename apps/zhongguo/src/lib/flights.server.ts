import { getCollection } from 'astro:content';
import {
  getAirportLabel,
  priceToColor,
  type FlightSearchRow,
} from './flight-utils';

const MIN_OUTBOUND_DATE = '2026-12-31';

type FlightCollectionEntry = Awaited<ReturnType<typeof getCollection<'flights'>>>[number];

function pickLatestPerAirportDate(entries: FlightCollectionEntry[]): FlightCollectionEntry[] {
  const maxCreatedAtByKey = new Map<string, string>();

  for (const entry of entries) {
    const { airport, outbound_date, price, created_at } = entry.data;
    if (outbound_date <= MIN_OUTBOUND_DATE || price == null) {
      continue;
    }

    const key = `${airport}|${outbound_date}`;
    const currentMax = maxCreatedAtByKey.get(key);
    if (!currentMax || created_at > currentMax) {
      maxCreatedAtByKey.set(key, created_at);
    }
  }

  return entries.filter((entry) => {
    const { airport, outbound_date, price, created_at } = entry.data;
    if (outbound_date <= MIN_OUTBOUND_DATE || price == null) {
      return false;
    }

    const key = `${airport}|${outbound_date}`;
    return created_at === maxCreatedAtByKey.get(key);
  });
}

function toFlightSearchRows(entries: FlightCollectionEntry[]): FlightSearchRow[] {
  const rows = [...entries].sort((a, b) => {
    const priceDiff = a.data.price! - b.data.price!;
    if (priceDiff !== 0) {
      return priceDiff;
    }

    const airportDiff = a.data.airport.localeCompare(b.data.airport);
    if (airportDiff !== 0) {
      return airportDiff;
    }

    return a.data.outbound_date.localeCompare(b.data.outbound_date);
  });

  if (rows.length === 0) {
    return [];
  }

  const prices = rows.map((entry) => entry.data.price!);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const minPriceByAirport = new Map<string, number>();
  for (const entry of rows) {
    const price = entry.data.price!;
    const current = minPriceByAirport.get(entry.data.airport);
    if (current === undefined || price < current) {
      minPriceByAirport.set(entry.data.airport, price);
    }
  }

  const highlightedAirports = new Set<string>();

  return rows.map((entry) => {
    const { airport, stops, price, outbound_date, return_date, searched_on, created_at } =
      entry.data;
    const airportMin = minPriceByAirport.get(airport)!;
    const isCityLowest = price === airportMin && !highlightedAirports.has(airport);
    if (isCityLowest) {
      highlightedAirports.add(airport);
    }

    return {
      id: entry.id,
      airport,
      stops,
      price: price!,
      outboundDate: outbound_date,
      returnDate: return_date,
      searchedOn: searched_on,
      createdAt: created_at,
      cityLabel: getAirportLabel(airport),
      isDirect: stops === 'nostop',
      isCityLowest,
      priceColor: priceToColor(price!, minPrice, maxPrice),
    };
  });
}

export async function getRecentFlightSearches(): Promise<FlightSearchRow[]> {
  const entries = await getCollection('flights');
  return toFlightSearchRows(pickLatestPerAirportDate(entries));
}
