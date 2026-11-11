package store

import (
	"errors"
	"testing"

	"skirental/internal/domain"
)

func date(t *testing.T, s string) domain.Date {
	t.Helper()
	d, err := domain.ParseDate(s)
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestAddRentalConflict(t *testing.T) {
	s := NewMemory([]domain.Ski{{ID: 1}})
	r := domain.Rental{SkiID: 1, Start: date(t, "2026-12-10"), End: date(t, "2026-12-12")}

	first, err := s.AddRental(r)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.AddRental(r); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("second booking: got %v, want conflict", err)
	}
	if _, err := s.ReturnRental(first.ID, date(t, "2026-12-11")); err != nil {
		t.Fatal(err)
	}
	if _, err := s.AddRental(r); err != nil {
		t.Fatalf("after return: %v", err)
	}
}

func TestAddRentalUnknownSki(t *testing.T) {
	s := NewMemory(nil)
	if _, err := s.AddRental(domain.Rental{SkiID: 9}); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("got %v, want not found", err)
	}
}
