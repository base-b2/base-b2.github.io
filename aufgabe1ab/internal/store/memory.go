// Package store keeps all data in memory.
package store

import (
	"sync"

	"skirental/internal/domain"
)

// Store is the data access used by the API.
type Store interface {
	ListSkis() []domain.Ski
	GetSki(id int) (domain.Ski, error)
	ListRentals() []domain.Rental
	GetRental(id int) (domain.Rental, error)
	AddRental(r domain.Rental) (domain.Rental, error)
	ReturnRental(id int, on domain.Date) (domain.Rental, error)
}

// Memory is a thread-safe in-memory Store.
type Memory struct {
	mu      sync.RWMutex
	skis    []domain.Ski
	rentals []domain.Rental
	nextID  int
}

var _ Store = (*Memory)(nil)

func NewMemory(skis []domain.Ski) *Memory {
	return &Memory{skis: skis, nextID: 1001}
}

func (m *Memory) ListSkis() []domain.Ski {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return append([]domain.Ski(nil), m.skis...)
}

func (m *Memory) GetSki(id int) (domain.Ski, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.findSki(id)
}

func (m *Memory) findSki(id int) (domain.Ski, error) {
	for _, s := range m.skis {
		if s.ID == id {
			return s, nil
		}
	}
	return domain.Ski{}, domain.NotFound("Ski nicht gefunden.")
}

func (m *Memory) ListRentals() []domain.Rental {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return append([]domain.Rental(nil), m.rentals...)
}

func (m *Memory) GetRental(id int) (domain.Rental, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, r := range m.rentals {
		if r.ID == id {
			return r, nil
		}
	}
	return domain.Rental{}, domain.NotFound("Verleih nicht gefunden.")
}

// AddRental assigns an ID and saves the rental if the ski is free.
func (m *Memory) AddRental(r domain.Rental) (domain.Rental, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, err := m.findSki(r.SkiID); err != nil {
		return domain.Rental{}, err
	}
	if !domain.Available(m.rentals, r.SkiID, r.Start, r.End) {
		return domain.Rental{}, domain.Conflict("Dieser Ski ist im gewählten Zeitraum bereits vergeben.")
	}
	r.ID = m.nextID
	m.nextID++
	m.rentals = append(m.rentals, r)
	return r, nil
}

// ReturnRental marks a rental as returned on the given day.
func (m *Memory) ReturnRental(id int, on domain.Date) (domain.Rental, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.rentals {
		if m.rentals[i].ID != id {
			continue
		}
		if m.rentals[i].ReturnedOn != nil {
			return domain.Rental{}, domain.Conflict("Dieser Verleih wurde bereits zurückgenommen.")
		}
		m.rentals[i].ReturnedOn = &on
		return m.rentals[i], nil
	}
	return domain.Rental{}, domain.NotFound("Verleih nicht gefunden.")
}
