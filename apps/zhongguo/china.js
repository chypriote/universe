// Searches the Fare windows of the plans on SerpApi (Google Flights) and stores each price in D1.
// Which windows: scripts/fare-windows.js. Never-searched windows first, then the oldest price first,
// until the SerpApi account has no searches left.
import { getAccount, getJson } from "serpapi";
import { insertFlightSearch, lastSearches } from "./scripts/db.js";
import { fareWindows, searchOrder, windowKey } from "./scripts/fare-windows.js";
import { loadPlans } from "./scripts/plans.js";

process.loadEnvFile();

const requestObject = {
  engine: "google_flights",
  api_key: process.env.API_KEY,
  currency: "EUR",
  departure_id: "CDG, ORY",
  type: "1",
  sort_by: "2",
  max_duration: 1260,
  deep_search: true,
}
// SerpApi stops: "2" = one stop or fewer, "3" = two stops or fewer.
// Few flights reach Lhasa and Urumqi with one stop.
const TWO_STOP_AIRPORTS = new Set(["LXA", "URC"])
const MAX_REQUESTS_PER_HOUR = 200
const HOUR_MS = 60 * 60 * 1000
const requestTimes = []

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function rateLimitedGetJson(params) {
  const now = Date.now()
  while (requestTimes.length > 0 && now - requestTimes[0] >= HOUR_MS) {
    requestTimes.shift()
  }

  if (requestTimes.length >= MAX_REQUESTS_PER_HOUR) {
    const waitMs = HOUR_MS - (now - requestTimes[0]) + 50
    console.log(`rate limit: waiting ${Math.ceil(waitMs / 1000)}s (${requestTimes.length} req in last hour)`)
    await sleep(waitMs)
    return rateLimitedGetJson(params)
  }

  requestTimes.push(Date.now())
  return getJson(params)
}

/** The cheapest flight of a response, or null when Google Flights found none. */
function cheapestFlight(json) {
  const flights = [...(json.best_flights ?? []), ...(json.other_flights ?? [])]
    .filter((flight) => typeof flight.price === "number" && Number.isFinite(flight.price))
  if (flights.length === 0) return null
  return flights.reduce((best, flight) => (flight.price < best.price ? flight : best))
}

function formatSqliteDatetime(date = new Date()) {
  return date.toISOString().replace("T", " ").slice(0, 19)
}

async function run() {
  const today = new Date().toISOString().slice(0, 10)
  const windows = searchOrder(fareWindows(await loadPlans(), today), await lastSearches())
  const account = await getAccount({ api_key: process.env.API_KEY })
  const left = account.total_searches_left ?? account.plan_searches_left ?? 0
  const batch = windows.slice(0, left)
  console.log(`${windows.length} Fare windows, ${left} searches left: searching ${batch.length}`)

  let searched = 0
  for (const window of batch) {
    let json
    try {
      json = await rateLimitedGetJson({
        ...requestObject,
        arrival_id: window.airport,
        stops: TWO_STOP_AIRPORTS.has(window.airport) ? "3" : "2",
        outbound_date: window.outbound,
        return_date: window.return,
      })
    } catch (error) {
      console.log(`stopped: SerpApi refused the search (${typeof error === "string" ? error : error.message})`)
      break
    }
    const flight = cheapestFlight(json)
    // A window without flights is stored with no price, so the next run searches older windows first.
    await insertFlightSearch(
      window.airport,
      flight?.flights?.length === 1 ? "nostop" : "stop",
      flight?.price ?? null,
      window.outbound,
      window.return,
      json,
      today,
      formatSqliteDatetime(),
    )
    searched++
    console.log(`${windowKey(window)}: ${flight ? `${flight.price}€${flight.flights?.length === 1 ? " direct" : ""}` : "no flight"}`)
  }
  console.log(`searched ${searched} Fare windows`)
}

await run()
