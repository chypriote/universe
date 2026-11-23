import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from "node:crypto";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptsDir, '..');
const dbPath = join(root, 'flights.db');
const schemaSql = readFileSync(join(scriptsDir, 'flights.sqlite.sql'), 'utf8');

const db = new DatabaseSync(dbPath);

const createTable = schemaSql.match(
  /CREATE TABLE IF NOT EXISTS flight_searches[\s\S]*?\);/
)?.[0];
if (createTable) {
  db.exec(createTable);
}

const getFreshStmt = db.prepare(`
  SELECT response
  FROM flight_searches
  WHERE airport = ?
    AND stops = ?
    AND outbound_date = ?
    AND return_date = ?
    AND datetime(created_at) > datetime('now', ?)
`);

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO flight_searches
    (airport, stops, price, outbound_date, return_date, response, searched_on, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

function getFreshFlightSearch(airport, stops, outboundDate, returnDate, maxAgeDays) {
  const row = getFreshStmt.get(airport, stops, outboundDate, returnDate, `-${maxAgeDays} days`);
  if (!row) return null;
  return JSON.parse(row.response);
}

function insertFlightSearch(airport, stops, price, outboundDate, returnDate, response, searchedOn, createdAt) {
  const responseText = typeof response === 'string' ? response : JSON.stringify(response);
  // node:sqlite rejects undefined; schema allows NULL for price
  const boundPrice = typeof price === 'number' && Number.isFinite(price) ? price : null;
  insertStmt.run(airport, stops, boundPrice, outboundDate, returnDate, responseText, searchedOn, createdAt);
  return responseText;
}

function uuidv7FromDate(date) {
  const ts = BigInt(date.getTime());
  const tsHex = ts.toString(16).padStart(12, "0");

  const randA = crypto.randomBytes(2).toString("hex").slice(0, 3);
  const randB = crypto.randomBytes(8).toString("hex");

  const part1 = tsHex.slice(0, 8);
  const part2 = tsHex.slice(8, 12);
  const part3 = "7" + randA;
  const part4 =
      ((parseInt(randB.slice(0, 2), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0") +
      randB.slice(2, 4);
  const part5 = randB.slice(4, 16);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export { getFreshFlightSearch, insertFlightSearch, uuidv7FromDate };
