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

	"bikerental/internal/domain"
	"bikerental/internal/store"
)

// Handler holds the dependencies of all endpoints.
// clock is injected so that tests can fix the time.
type Handler struct {
	store     store.Store
	prices    domain.PriceList
	hours     domain.OpeningHours
	loc       *time.Location
	uploadDir string
	clock     func() time.Time
}

func New(s store.Store, prices domain.PriceList, hours domain.OpeningHours,
	loc *time.Location, uploadDir string, clock func() time.Time) *Handler {
	return &Handler{store: s, prices: prices, hours: hours, loc: loc, uploadDir: uploadDir, clock: clock}
}

// now is the current time in the shop's time zone.
func (h *Handler) now() domain.Moment { return domain.NewMoment(h.clock().In(h.loc)) }

// Routes returns the router with all API endpoints.
func (h *Handler) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/info", wrap(h.info))
	mux.HandleFunc("GET /api/dashboard", wrap(h.dashboard))
	mux.HandleFunc("GET /api/prices", wrap(h.listPrices))
	mux.HandleFunc("GET /api/bikes", wrap(h.listBikes))
	mux.HandleFunc("GET /api/rentals", wrap(h.listRentals))
	mux.HandleFunc("POST /api/rentals", wrap(h.createRental))
	mux.HandleFunc("POST /api/rentals/{id}/return", wrap(h.returnRental))
	mux.HandleFunc("GET /api/rentals/{id}/id-document", wrap(h.idDocument))
	return mux
}

type rentalView struct {
	domain.Rental
	Bike   domain.Bike `json:"bike"`
	Status string      `json:"status"`
}

// views adds bike and status to each rental.
func (h *Handler) views(rentals []domain.Rental, now domain.Moment) []rentalView {
	bikes := map[int]domain.Bike{}
	for _, b := range h.store.ListBikes() {
		bikes[b.ID] = b
	}
	out := make([]rentalView, 0, len(rentals))
	for _, r := range rentals {
		out = append(out, rentalView{Rental: r, Bike: bikes[r.BikeID], Status: r.Status(now)})
	}
	return out
}

type infoView struct {
	Now       domain.Moment `json:"now"`
	OpenHour  int           `json:"openHour"`
	CloseHour int           `json:"closeHour"`
	MaxHours  int           `json:"maxHours"`
}

// info tells the UI the shop hours and the current shop time.
func (h *Handler) info(w http.ResponseWriter, r *http.Request) error {
	writeJSON(w, http.StatusOK, infoView{
		Now: h.now(), OpenHour: h.hours.Open, CloseHour: h.hours.Close, MaxHours: domain.MaxHours,
	})
	return nil
}

type dashboardView struct {
	Now          domain.Moment `json:"now"`
	TotalBikes   int           `json:"totalBikes"`
	InUse        int           `json:"inUse"`
	AvailableNow int           `json:"availableNow"`
	Upcoming     int           `json:"upcoming"`
	RevenueCents int           `json:"revenueCents"`
	Pickups      []rentalView  `json:"pickups"`
	Returns      []rentalView  `json:"returns"`
	Overdue      []rentalView  `json:"overdue"`
}

func (h *Handler) dashboard(w http.ResponseWriter, r *http.Request) error {
	now := h.now()
	d := dashboardView{Now: now, TotalBikes: len(h.store.ListBikes())}
	inUse := map[int]bool{}
	var pickups, returns, overdue []domain.Rental

	for _, rt := range h.store.ListRentals() {
		d.RevenueCents += rt.TotalCents
		status := rt.Status(now)
		if status == domain.StatusReturned {
			continue
		}
		if status == domain.StatusUpcoming {
			d.Upcoming++
		} else {
			inUse[rt.BikeID] = true
		}
		if rt.Start.SameDay(now) {
			pickups = append(pickups, rt)
		}
		if rt.End.SameDay(now) {
			returns = append(returns, rt)
		}
		if status == domain.StatusOverdue {
			overdue = append(overdue, rt)
		}
	}
	sort.Slice(pickups, func(i, j int) bool { return pickups[i].Start.IsBefore(pickups[j].Start) })
	sort.Slice(returns, func(i, j int) bool { return returns[i].End.IsBefore(returns[j].End) })

	d.InUse = len(inUse)
	d.AvailableNow = d.TotalBikes - d.InUse
	d.Pickups = h.views(pickups, now)
	d.Returns = h.views(returns, now)
	d.Overdue = h.views(overdue, now)

	writeJSON(w, http.StatusOK, d)
	return nil
}

func (h *Handler) listPrices(w http.ResponseWriter, r *http.Request) error {
	writeJSON(w, http.StatusOK, h.prices)
	return nil
}

// period reads and checks start and hours of a rental.
func (h *Handler) period(startText, hoursText string) (domain.Moment, int, error) {
	start, err := domain.ParseMoment(startText, h.loc)
	if err != nil {
		return domain.Moment{}, 0, err
	}
	hours, err := strconv.Atoi(hoursText)
	if err != nil {
		return domain.Moment{}, 0, domain.Invalid("Bitte die Mietdauer in Stunden angeben.")
	}
	if err := h.hours.Validate(start, hours, h.now()); err != nil {
		return domain.Moment{}, 0, err
	}
	return start, hours, nil
}

type bikeView struct {
	domain.Bike
	Available bool         `json:"available"`
	Quote     domain.Quote `json:"quote"`
}

// listBikes lists the stock with availability and price for ?start=&hours=.
func (h *Handler) listBikes(w http.ResponseWriter, r *http.Request) error {
	start, hours, err := h.period(r.URL.Query().Get("start"), r.URL.Query().Get("hours"))
	if err != nil {
		return err
	}
	end := start.AddHours(hours)

	rentals := h.store.ListRentals()
	views := make([]bikeView, 0)
	for _, b := range h.store.ListBikes() {
		q, err := h.prices.Quote(b.Category, hours)
		if err != nil {
			return err
		}
		views = append(views, bikeView{Bike: b, Available: domain.Available(rentals, b.ID, start, end), Quote: q})
	}
	writeJSON(w, http.StatusOK, views)
	return nil
}

func (h *Handler) listRentals(w http.ResponseWriter, r *http.Request) error {
	rentals := h.store.ListRentals()
	sort.Slice(rentals, func(i, j int) bool { return rentals[i].ID > rentals[j].ID })
	writeJSON(w, http.StatusOK, h.views(rentals, h.now()))
	return nil
}

// createRental reads a multipart form: rental data plus the ID document.
func (h *Handler) createRental(w http.ResponseWriter, r *http.Request) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+1<<20)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		return domain.Invalid("Das Formular konnte nicht gelesen werden. Ist die Datei kleiner als 5 MB?")
	}
	now := h.now()

	start, hours, err := h.period(r.FormValue("start"), r.FormValue("hours"))
	if err != nil {
		return err
	}
	bikeID, err := strconv.Atoi(r.FormValue("bikeId"))
	if err != nil {
		return domain.Invalid("Bitte ein Rad auswählen.")
	}
	bike, err := h.store.GetBike(bikeID)
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

	quote, err := h.prices.Quote(bike.Category, hours)
	if err != nil {
		return err
	}
	file, err := h.saveIDDocument(r)
	if err != nil {
		return err
	}

	rental, err := h.store.AddRental(domain.Rental{
		BikeID:      bike.ID,
		Customer:    customer,
		Start:       start,
		Hours:       hours,
		End:         start.AddHours(hours),
		HourlyCents: quote.HourlyCents,
		TotalCents:  quote.TotalCents,
		IDFile:      file,
	})
	if err != nil {
		os.Remove(filepath.Join(h.uploadDir, file))
		return err
	}
	writeJSON(w, http.StatusCreated, h.views([]domain.Rental{rental}, now)[0])
	return nil
}

func (h *Handler) returnRental(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	now := h.now()
	rental, err := h.store.ReturnRental(id, now)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, h.views([]domain.Rental{rental}, now)[0])
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
