# Ski Rental

Rental system for skis with dashboard, ID documents, flexible rental periods and prices.
This file is the specification. Code follows it.

## Features

1. **Dashboard**: utilization today, available skis, upcoming rentals, returns and pickups today, overdue rentals, revenue.
2. **New rental**: choose period, choose ski, enter customer data and ID, see the price, book.
3. **Rentals**: list with status filter, view ID, take skis back.
4. **Prices**: price table per category.

## Rental period

- The customer picks a start date and a return date.
- Both days count. Same day means 1 day.
- Start is today or later. Return is not before start.
- Maximum length: 28 days.

## Prices

- Each ski belongs to a category: `junior`, `allround`, `premium`.
- Each category has price tiers. The tier is chosen by the total number of days.
- The daily price of that tier applies to every day.
- `total = days × daily price of the tier`

| Days        | Kids & Youth | Allround | Premium |
|-------------|-------------:|---------:|--------:|
| 1           |      15,00 € | 28,00 €  | 42,00 € |
| 2–3         |      13,00 € | 25,00 €  | 38,00 € |
| 4 and more  |      10,00 € | 20,00 €  | 32,00 € |

Example: Allround for 5 days = 5 × 20,00 € = 100,00 €.

To change prices, edit `DefaultPrices()` in `internal/domain/pricing.go`.
The API and the UI read the prices from there.

## Availability

- A ski is free if no open rental shares a day with the requested period.
- Returned rentals do not block.
- A booking that collides is refused with status 409.

## Status of a rental

| Status      | Meaning                                  |
|-------------|------------------------------------------|
| `upcoming`  | Start is in the future                   |
| `active`    | Between start and return date            |
| `overdue`   | Return date passed, ski not returned yet |
| `returned`  | Ski was taken back                       |

## Customer and ID

Required: first name, last name, e-mail, ID type, ID number, ID file. Phone is optional.

- ID types: passport, ID card, driver's license.
- ID file: JPG, PNG or PDF, at most 5 MB. The server checks the content, not the file name.
- Files are stored in `uploads/` under a random name. Data stays in memory.

## API

| Method | Path                                | Purpose                                         |
|--------|-------------------------------------|-------------------------------------------------|
| GET    | `/api/dashboard`                    | Figures and lists for today                     |
| GET    | `/api/prices`                       | Price tiers per category                        |
| GET    | `/api/skis?start=&end=`             | Skis with availability and price for the period |
| GET    | `/api/rentals`                      | All rentals, newest first                       |
| POST   | `/api/rentals`                      | Create a rental (`multipart/form-data`)         |
| POST   | `/api/rentals/{id}/return`          | Take the skis back                              |
| GET    | `/api/rentals/{id}/id-document`     | Uploaded ID file                                |

Fields of `POST /api/rentals`:
`skiId`, `start`, `end`, `firstName`, `lastName`, `email`, `phone`, `idType`, `idNumber`, `idDocument` (file).
Dates are `YYYY-MM-DD`. `idType` is `passport`, `id_card` or `driver_license`.

Errors: `400` invalid input, `404` not found, `409` conflict. Body: `{"error": "message"}`.

## Run

Go 1.22 or newer. The server also delivers the web UI.

```
go run ./cmd/server
go test ./...
```

Open http://localhost:8080. Another port: `-addr :9000`.

## Layout

```
CLAUDE.md  README.md  go.mod
cmd/server/          entry point, demo data
internal/domain/     pricing, dates, availability, validation
internal/store/      in-memory store
internal/api/        HTTP handlers, upload
cmd/server/static/   web UI: index.html, style.css, app.js
```

Dependencies: none. Go standard library, plain HTML, CSS and JavaScript.
