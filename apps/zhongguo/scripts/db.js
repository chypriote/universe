import { d1Query } from './d1.js';

async function getFreshFlightSearch(airport, stops, outboundDate, returnDate, maxAgeDays) {
  const [row] = await d1Query(
    `SELECT response FROM flight_searches
     WHERE airport = ? AND stops = ? AND outbound_date = ? AND return_date = ?
       AND datetime(created_at) > datetime('now', ?)`,
    [airport, stops, outboundDate, returnDate, `-${maxAgeDays} days`]
  );
  return row ? JSON.parse(row.response) : null;
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

export { getFreshFlightSearch, insertFlightSearch };
