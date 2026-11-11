package store

import (
	"errors"
	"testing"
	"time"

	"bikerental/internal/domain"
)

func at(t *testing.T, s string) domain.Moment {
	t.Helper()
	m, err := domain.ParseMoment(s, time.UTC)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestAddRentalConflict(t *testing.T) {
	s := NewMemory([]domain.Bike{{ID: 1}})
	r := domain.Rental{BikeID: 1, Start: at(t, "2026-11-10T10:00"), Hours: 3, End: at(t, "2026-11-10T13:00")}

	first, err := s.AddRental(r)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.AddRental(r); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("second booking: got %v, want conflict", err)
	}
	if _, err := s.ReturnRental(first.ID, at(t, "2026-11-10T11:00")); err != nil {
		t.Fatal(err)
	}
	if _, err := s.ReturnRental(first.ID, at(t, "2026-11-10T11:05")); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("second return: got %v, want conflict", err)
	}
	later := domain.Rental{BikeID: 1, Start: at(t, "2026-11-10T11:00"), Hours: 2, End: at(t, "2026-11-10T13:00")}
	if _, err := s.AddRental(later); err != nil {
		t.Fatalf("after early return: %v", err)
	}
}

func TestAddRentalUnknownBike(t *testing.T) {
	s := NewMemory(nil)
	if _, err := s.AddRental(domain.Rental{BikeID: 9}); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("got %v, want not found", err)
	}
}
