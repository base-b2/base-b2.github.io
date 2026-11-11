// Package api serves the JSON API.
package api

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"skirental/internal/domain"
	"skirental/internal/store"
)

// Handler holds the dependencies of all endpoints.
// now is injected so that tests can fix the date.
type Handler struct {
	store     store.Store
	prices    domain.PriceList
	uploadDir string
	now       func() time.Time
}

func New(s store.Store, prices domain.PriceList, uploadDir string, now func() time.Time) *Handler {
	return &Handler{store: s, prices: prices, uploadDir: uploadDir, now: now}
}

func (h *Handler) today() domain.Date { return domain.NewDate(h.now()) }

// Routes returns the router with all API endpoints.
func (h *Handler) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/dashboard", wrap(h.dashboard))
	mux.HandleFunc("GET /api/prices", wrap(h.listPrices))
	mux.HandleFunc("GET /api/skis", wrap(h.listSkis))
	mux.HandleFunc("GET /api/rentals", wrap(h.listRentals))
	mux.HandleFunc("POST /api/rentals", wrap(h.createRental))
	mux.HandleFunc("POST /api/rentals/{id}/return", wrap(h.returnRental))
	mux.HandleFunc("GET /api/rentals/{id}/id-document", wrap(h.idDocument))
	return mux
}

type rentalView struct {
	domain.Rental
	Ski    domain.Ski `json:"ski"`
	Status string     `json:"status"`
}

// views adds ski and status to each rental.
func (h *Handler) views(rentals []domain.Rental, today domain.Date) []rentalView {
	skis := map[int]domain.Ski{}
	for _, s := range h.store.ListSkis() {
		skis[s.ID] = s
	}
	out := make([]rentalView, 0, len(rentals))
	for _, r := range rentals {
		out = append(out, rentalView{Rental: r, Ski: skis[r.SkiID], Status: r.Status(today)})
	}
	return out
}

type dashboardView struct {
	TotalSkis      int          `json:"totalSkis"`
	RentedToday    int          `json:"rentedToday"`
	AvailableToday int          `json:"availableToday"`
	Upcoming       int          `json:"upcoming"`
	RevenueCents   int          `json:"revenueCents"`
	Pickups        []rentalView `json:"pickups"`
	Returns        []rentalView `json:"returns"`
	Overdue        []rentalView `json:"overdue"`
}

func (h *Handler) dashboard(w http.ResponseWriter, r *http.Request) error {
	today := h.today()
	d := dashboardView{TotalSkis: len(h.store.ListSkis())}
	out := map[int]bool{}
	var pickups, returns, overdue []domain.Rental

	for _, rt := range h.store.ListRentals() {
		d.RevenueCents += rt.TotalCents
		status := rt.Status(today)
		if status == domain.StatusReturned {
			continue
		}
		if status == domain.StatusUpcoming {
			d.Upcoming++
		} else {
			out[rt.SkiID] = true
		}
		if rt.Start.IsSame(today) {
			pickups = append(pickups, rt)
		}
		if rt.End.IsSame(today) {
			returns = append(returns, rt)
		}
		if status == domain.StatusOverdue {
			overdue = append(overdue, rt)
		}
	}
	d.RentedToday = len(out)
	d.AvailableToday = d.TotalSkis - d.RentedToday
	d.Pickups = h.views(pickups, today)
	d.Returns = h.views(returns, today)
	d.Overdue = h.views(overdue, today)

	writeJSON(w, http.StatusOK, d)
	return nil
}

func (h *Handler) listPrices(w http.ResponseWriter, r *http.Request) error {
	writeJSON(w, http.StatusOK, h.prices)
	return nil
}

type skiView struct {
	domain.Ski
	Available bool          `json:"available"`
	Quote     *domain.Quote `json:"quote,omitempty"`
}

// listSkis lists the stock. With ?start=&end= it adds availability and price.
func (h *Handler) listSkis(w http.ResponseWriter, r *http.Request) error {
	today := h.today()
	start, end := today, today
	withQuote := r.URL.Query().Get("start") != ""
	if withQuote {
		var err error
		if start, err = domain.ParseDate(r.URL.Query().Get("start")); err != nil {
			return err
		}
		if end, err = domain.ParseDate(r.URL.Query().Get("end")); err != nil {
			return err
		}
		if err = domain.ValidatePeriod(start, end, today); err != nil {
			return err
		}
	}

	rentals := h.store.ListRentals()
	views := make([]skiView, 0)
	for _, s := range h.store.ListSkis() {
		v := skiView{Ski: s, Available: domain.Available(rentals, s.ID, start, end)}
		if withQuote {
			q, err := h.prices.Quote(s.Category, domain.Days(start, end))
			if err != nil {
				return err
			}
			v.Quote = &q
		}
		views = append(views, v)
	}
	writeJSON(w, http.StatusOK, views)
	return nil
}

func (h *Handler) listRentals(w http.ResponseWriter, r *http.Request) error {
	rentals := h.store.ListRentals()
	sort.Slice(rentals, func(i, j int) bool { return rentals[i].ID > rentals[j].ID })
	writeJSON(w, http.StatusOK, h.views(rentals, h.today()))
	return nil
}

// createRental reads a multipart form: rental data plus the ID document.
func (h *Handler) createRental(w http.ResponseWriter, r *http.Request) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+1<<20)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		return domain.Invalid("Das Formular konnte nicht gelesen werden. Ist die Datei kleiner als 5 MB?")
	}
	today := h.today()

	start, err := domain.ParseDate(r.FormValue("start"))
	if err != nil {
		return err
	}
	end, err := domain.ParseDate(r.FormValue("end"))
	if err != nil {
		return err
	}
	if err := domain.ValidatePeriod(start, end, today); err != nil {
		return err
	}

	skiID, err := strconv.Atoi(r.FormValue("skiId"))
	if err != nil {
		return domain.Invalid("Bitte einen Ski auswählen.")
	}
	ski, err := h.store.GetSki(skiID)
	if err != nil {
		return err
	}

	customer := domain.Customer{
		FirstName: strings.TrimSpace(r.FormValue("firstName")),
		LastName:  strings.TrimSpace(r.FormValue("lastName")),
		Email:     strings.TrimSpace(r.FormValue("email")),
		Phone:     strings.TrimSpace(r.FormValue("phone")),
		IDType:    domain.IDType(r.FormValue("idType")),
		IDNumber:  strings.TrimSpace(r.FormValue("idNumber")),
	}
	if err := customer.Validate(); err != nil {
		return err
	}

	quote, err := h.prices.Quote(ski.Category, domain.Days(start, end))
	if err != nil {
		return err
	}
	file, err := h.saveIDDocument(r)
	if err != nil {
		return err
	}

	rental, err := h.store.AddRental(domain.Rental{
		SkiID:      ski.ID,
		Customer:   customer,
		Start:      start,
		End:        end,
		DailyCents: quote.DailyCents,
		TotalCents: quote.TotalCents,
		IDFile:     file,
	})
	if err != nil {
		os.Remove(filepath.Join(h.uploadDir, file))
		return err
	}
	writeJSON(w, http.StatusCreated, h.views([]domain.Rental{rental}, today)[0])
	return nil
}

func (h *Handler) returnRental(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	today := h.today()
	rental, err := h.store.ReturnRental(id, today)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, h.views([]domain.Rental{rental}, today)[0])
	return nil
}

func (h *Handler) idDocument(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	rental, err := h.store.GetRental(id)
	if err != nil {
		return err
	}
	if rental.IDFile == "" {
		return domain.NotFound("Für diesen Verleih liegt kein Ausweis vor.")
	}
	http.ServeFile(w, r, filepath.Join(h.uploadDir, rental.IDFile))
	return nil
}

func pathID(r *http.Request) (int, error) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		return 0, domain.Invalid("Ungültige Verleihnummer.")
	}
	return id, nil
}
