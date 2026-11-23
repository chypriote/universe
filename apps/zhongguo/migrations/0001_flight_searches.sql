CREATE TABLE flight_searches (
    airport TEXT NOT NULL,
    stops TEXT NOT NULL,
    price REAL,
    outbound_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    response TEXT NOT NULL,
    searched_on TEXT NOT NULL DEFAULT (date('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (airport, stops, outbound_date, return_date)
);
