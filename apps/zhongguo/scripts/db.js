import { d1Query } from './d1.js';

/** The created_at of the newest search of each Fare window, by `windowKey`. */
async function lastSearches() {
  const rows = await d1Query(
    `SELECT airport, outbound_date, return_date, MAX(created_at) AS created_at FROM flight_searches
     GROUP BY airport, outbound_date, return_date`
  );
  return new Map(rows.map((row) => [`${row.airport}|${row.outbound_date}|${row.return_date}`, row.created_at]));
}

async function insertFlightSearch(airport, stops, price, outboundDate, returnDate, response, searchedOn, createdAt) {
  const responseText = typeof response === 'string' ? response : JSON.stringify(response);
  const boundPrice = typeof price === 'number' && Number.isFinite(price) ? price : null;
  await d1Query(
    `INSERT OR REPLACE INTO flight_searches
       (airport, stops, price, outbound_date, return_date, response, searched_on, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [airport, stops, boundPrice, outboundDate, returnDate, responseText, searchedOn, createdAt]
  );
}

export { insertFlightSearch, lastSearches };
