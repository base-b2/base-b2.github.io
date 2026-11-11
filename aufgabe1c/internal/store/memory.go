// Package store keeps all data in memory.
package store

import (
	"sync"

	"bikerental/internal/domain"
)

// Store is the data access used by the API.
type Store interface {
	ListBikes() []domain.Bike
	GetBike(id int) (domain.Bike, error)
	ListRentals() []domain.Rental
	GetRental(id int) (domain.Rental, error)
	AddRental(r domain.Rental) (domain.Rental, error)
	ReturnRental(id int, at domain.Moment) (domain.Rental, error)
}

// Memory is a thread-safe in-memory Store.
type Memory struct {
	mu      sync.RWMutex
	bikes   []domain.Bike
	rentals []domain.Rental
	nextID  int
}

var _ Store = (*Memory)(nil)

func NewMemory(bikes []domain.Bike) *Memory {
	return &Memory{bikes: bikes, nextID: 1001}
}

func (m *Memory) ListBikes() []domain.Bike {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return append([]domain.Bike(nil), m.bikes...)
}

func (m *Memory) GetBike(id int) (domain.Bike, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.findBike(id)
}

func (m *Memory) findBike(id int) (domain.Bike, error) {
	for _, b := range m.bikes {
		if b.ID == id {
			return b, nil
		}
	}
	return domain.Bike{}, domain.NotFound("Rad nicht gefunden.")
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

// AddRental assigns an ID and saves the rental if the bike is free.
func (m *Memory) AddRental(r domain.Rental) (domain.Rental, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, err := m.findBike(r.BikeID); err != nil {
		return domain.Rental{}, err
	}
	if !domain.Available(m.rentals, r.BikeID, r.Start, r.End) {
		return domain.Rental{}, domain.Conflict("Dieses Rad ist im gewählten Zeitraum bereits vergeben.")
	}
	r.ID = m.nextID
	m.nextID++
	m.rentals = append(m.rentals, r)
	return r, nil
}

// ReturnRental marks a rental as returned at the given time.
func (m *Memory) ReturnRental(id int, at domain.Moment) (domain.Rental, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.rentals {
		if m.rentals[i].ID != id {
			continue
		}
		if m.rentals[i].ReturnedAt != nil {
			return domain.Rental{}, domain.Conflict("Dieser Verleih wurde bereits zurückgenommen.")
		}
		m.rentals[i].ReturnedAt = &at
		return m.rentals[i], nil
	}
	return domain.Rental{}, domain.NotFound("Verleih nicht gefunden.")
}
