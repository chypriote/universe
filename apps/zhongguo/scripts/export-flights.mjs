import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(join(root, 'flights.db'), { readOnly: true });

const rows = db
  .prepare(
    `SELECT airport, stops, price, outbound_date, return_date, response, searched_on, created_at
     FROM flight_searches
     ORDER BY airport, outbound_date, return_date, stops`
  )
  .all();

const entries = rows.map((row) => ({
  id: `${row.airport}-${row.stops}-${row.outbound_date}-${row.return_date}`,
  airport: row.airport,
  stops: row.stops,
  price: row.price,
  outbound_date: row.outbound_date,
  return_date: row.return_date,
  response: row.response,
  searched_on: row.searched_on,
  created_at: row.created_at,
}));

const outPath = join(root, 'flights', 'flights.json');
writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n', 'utf8');

db.close();
