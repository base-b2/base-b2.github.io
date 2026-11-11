# Ski Rental

Prototype only. Priority: quick to grasp, easy to change.
`README.md` is the specification and the source of truth (spec-driven development).
Change the spec first. Then implement. Then test.

## Stack
- Backend: Go 1.22+, standard library only ("object-oriented": structs + methods, interfaces where useful)
- DB: in-memory (no Postgres/SQLite, no ORM)
- Frontend: plain HTML/CSS/JS, one page without build step, embedded in the binary (`embed`)
- Version control: local Git, GitHub if needed

## Commands
- Start backend: `go run ./cmd/server` (http://localhost:8080, `-addr :9000` changes the port)
- Test: `go test ./...`
- Format: `go fmt ./...`
- Vet: `go vet ./...`
- Frontend: served by the Go server at `/`, no separate server

## Architecture (Go)
- `cmd/server/` → entry point, flags, demo data (`seed.go`)
- `cmd/server/static/` → `index.html`, `style.css`, `app.js`
- `internal/domain/` → core structs + methods: pricing, dates, availability, validation
- `internal/store/` → thread-safe in-memory store (`sync.RWMutex`) behind a `Store` interface
- `internal/api/` → HTTP handlers (JSON), error-to-status mapping, ID upload
- No global variables
- Wrap errors with `fmt.Errorf("%w", err)`, never swallow them
- Domain errors: `domain.Invalid`, `NotFound`, `Conflict` → 400 / 404 / 409 → `{"error": "..."}`

## Frontend
- Minimal JS, hash routing (`#/`, `#/new`, `#/rentals`, `#/prices`)
- Styling only in `style.css`, colors as CSS variables
- Always call the Go API, never hard-code data
- Escape all API data before inserting it into HTML

## Conventions
- Methods on structs instead of free functions where it fits
- Interfaces only where needed (e.g. `Store`)
- Prices live in one place: `domain.DefaultPrices()`
- Money as integer cents (`...Cents`), never float
- Dates as `domain.Date` (`YYYY-MM-DD`); the clock is injected (`now`)
- Code and comments in English; UI texts and user-facing error messages in German
- UI never says "demo" or "prototype"
- No new dependencies without asking
- No secrets in code

## Rules
- Do not edit generated files by hand
- Commit messages: short and imperative
- If unclear: ask, do not guess
- Prefer simple and clear over elegant and complex
