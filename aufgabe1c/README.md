# Bike Rental

Rental system for bikes by the hour with dashboard, ID documents, opening hours and flexible prices.
This file is the specification. Code follows it.

## Features

1. **Dashboard**: utilization now, available bikes, upcoming rentals, returns and pickups today, overdue rentals, revenue.
2. **New rental**: choose date, time and hours, choose bike, enter customer data and ID, see the price, book.
3. **Rentals**: list with status filter, view ID, take bikes back.
4. **Prices**: price table per category.

## Rental period

- The customer picks a start date, a start time and a number of full hours.
- The start is a full hour, today or later, not before the current hour.
- Minimum: 1 hour. Maximum: 72 hours.
- The end is start plus hours. The rental may run over several days.

## Opening hours

- Default: 09:00 to 19:00.
- The start lies in the opening hours, so the last start is 18:00.
- The end lies in the opening hours too, on any day: from 09:00 to 19:00.
- Example: 17:00 for 17 hours ends at 10:00 the next day. 18:00 for 2 hours is refused.

To change the hours, edit `DefaultOpeningHours()` in `internal/domain/rental.go`.
The UI reads them from `/api/info`.

## Prices

- Each bike belongs to a category: `city`, `trekking`, `mountain`, `ebike`.
- Each category has hourly tiers. The tier is chosen by the total number of hours.
- The hourly price of that tier applies to every hour.
- Each category has a day price. It caps every started day of 24 hours.
- `total = min(hours × hourly price, started days × day price)`

| Hours      | City    | Trekking | Mountain | E-Bike  |
|------------|--------:|---------:|---------:|--------:|
| 1          |  5,00 € |   6,00 € |   8,00 € | 10,00 € |
| 2–3        |  4,50 € |   5,50 € |   7,00 € |  9,00 € |
| 4 and more |  3,50 € |   4,50 € |   6,00 € |  8,00 € |
| Day price  | 16,00 € |  20,00 € |  28,00 € | 36,00 € |

Examples:
- City, 3 hours: min(3 × 4,50 €; 16,00 €) = 13,50 €
- City, 6 hours: min(6 × 3,50 €; 16,00 €) = 16,00 € (day price)
- E-Bike, 30 hours: min(30 × 8,00 €; 2 × 36,00 €) = 72,00 € (2 started days)

To change prices, edit `DefaultPrices()` in `internal/domain/pricing.go`.
The API and the UI read the prices from there.

## Availability

- A bike is blocked from the start until the end of its rental.
- A rental taken back early blocks only until the return time.
- A rental taken back before its start blocks nothing.
- Periods may touch: a rental may start when another one ends.
- A booking that collides is refused with status 409.

## Status of a rental

| Status      | Meaning                                    |
|-------------|--------------------------------------------|
| `upcoming`  | Start is in the future                     |
| `active`    | Between start and end                      |
| `overdue`   | End has passed, bike not returned yet      |
| `returned`  | Bike was taken back                        |

## Customer and ID

Required: first name, last name, e-mail, ID type, ID number, ID file. Phone is optional.

- ID types: passport, ID card, driver's license.
- ID file: JPG, PNG or PDF, at most 5 MB. The server checks the content, not the file name.
- Files are stored in `uploads/` under a random name. Data stays in memory.

## API

| Method | Path                                | Purpose                                          |
|--------|-------------------------------------|--------------------------------------------------|
| GET    | `/api/info`                         | Opening hours, maximum hours, current shop time  |
| GET    | `/api/dashboard`                    | Figures and lists for now and today              |
| GET    | `/api/prices`                       | Price tiers and day price per category           |
| GET    | `/api/bikes?start=&hours=`          | Bikes with availability and price for the period |
| GET    | `/api/rentals`                      | All rentals, newest first                        |
| POST   | `/api/rentals`                      | Create a rental (`multipart/form-data`)          |
| POST   | `/api/rentals/{id}/return`          | Take the bike back                               |
| GET    | `/api/rentals/{id}/id-document`     | Uploaded ID file                                 |

Fields of `POST /api/rentals`:
`bikeId`, `start`, `hours`, `firstName`, `lastName`, `email`, `phone`, `idType`, `idNumber`, `idDocument` (file).
`start` is `YYYY-MM-DDTHH:MM` in shop time. `idType` is `passport`, `id_card` or `driver_license`.

Errors: `400` invalid input, `404` not found, `409` conflict. Body: `{"error": "message"}`.

## Run

Go 1.22 or newer. The server also delivers the web UI.

```
go run ./cmd/server
go test ./...
```

Open http://localhost:8080. Another port: `-addr :9000`. Another time zone: `-zone Europe/Vienna`.
The default time zone is `Europe/Berlin`.

## Layout

```
CLAUDE.md  README.md  go.mod
cmd/server/          entry point, demo data
cmd/server/static/   web UI: index.html, style.css, app.js
internal/domain/     pricing, moments, availability, opening hours, validation
internal/store/      in-memory store
internal/api/        HTTP handlers, upload
```

Dependencies: none. Go standard library, plain HTML, CSS and JavaScript.
