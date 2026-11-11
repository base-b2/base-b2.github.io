package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"bikerental/internal/domain"
	"bikerental/internal/store"
)

func newTestMux(t *testing.T) http.Handler {
	t.Helper()
	loc := time.UTC
	now := time.Date(2026, 11, 10, 14, 20, 0, 0, loc)
	st := store.NewMemory([]domain.Bike{{ID: 1, Category: domain.City}})
	h := New(st, domain.DefaultPrices(), domain.DefaultOpeningHours(), loc, t.TempDir(), func() time.Time { return now })
	return h.Routes()
}

func get(mux http.Handler, url string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, url, nil))
	return rec
}

func TestListBikes(t *testing.T) {
	mux := newTestMux(t)

	rec := get(mux, "/api/bikes?start=2026-11-10T15:00&hours=2")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	var bikes []bikeView
	if err := json.Unmarshal(rec.Body.Bytes(), &bikes); err != nil {
		t.Fatal(err)
	}
	if len(bikes) != 1 || !bikes[0].Available || bikes[0].Quote.TotalCents != 900 {
		t.Errorf("got %+v", bikes)
	}

	for _, url := range []string{
		"/api/bikes?start=2026-11-10T07:00&hours=2", // before opening
		"/api/bikes?start=2026-11-10T15:00&hours=x", // no number
		"/api/bikes?start=soon&hours=2",             // no time
	} {
		if rec := get(mux, url); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status %d, want 400", url, rec.Code)
		}
	}
}

func TestInfo(t *testing.T) {
	rec := get(newTestMux(t), "/api/info")
	var info infoView
	if err := json.Unmarshal(rec.Body.Bytes(), &info); err != nil {
		t.Fatal(err)
	}
	if info.OpenHour != 9 || info.CloseHour != 19 || info.MaxHours != domain.MaxHours {
		t.Errorf("got %+v", info)
	}
}
