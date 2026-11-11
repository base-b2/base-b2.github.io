package main

import (
	"log"
	"strings"
	"time"

	"bikerental/internal/domain"
	"bikerental/internal/store"
)

func demoBikes() []domain.Bike {
	return []domain.Bike{
		{ID: 1, Brand: "Gazelle", Model: "Esprit", FrameSize: "M", Category: domain.City},
		{ID: 2, Brand: "Pegasus", Model: "Solero", FrameSize: "L", Category: domain.City},
		{ID: 3, Brand: "Kettler", Model: "Ravenna", FrameSize: "S", Category: domain.City},
		{ID: 4, Brand: "Batavus", Model: "Wayz", FrameSize: "M", Category: domain.City},
		{ID: 5, Brand: "Cube", Model: "Nature", FrameSize: "M", Category: domain.Trekking},
		{ID: 6, Brand: "Stevens", Model: "Cardiff", FrameSize: "L", Category: domain.Trekking},
		{ID: 7, Brand: "Winora", Model: "Domingo", FrameSize: "L", Category: domain.Trekking},
		{ID: 8, Brand: "KTM", Model: "Life Joy", FrameSize: "S", Category: domain.Trekking},
		{ID: 9, Brand: "Scott", Model: "Aspect 950", FrameSize: "L", Category: domain.Mountain},
		{ID: 10, Brand: "Canyon", Model: "Grand Canyon 7", FrameSize: "M", Category: domain.Mountain},
		{ID: 11, Brand: "Giant", Model: "Talon 3", FrameSize: "M", Category: domain.Mountain},
		{ID: 12, Brand: "Riese & Müller", Model: "Nevo", FrameSize: "M", Category: domain.EBike},
		{ID: 13, Brand: "Cube", Model: "Kathmandu Hybrid", FrameSize: "L", Category: domain.EBike},
		{ID: 14, Brand: "Haibike", Model: "Trekking 5", FrameSize: "M", Category: domain.EBike},
	}
}

// demoRental sits at a fixed shop hour, counted in days from today.
// What has ended by now counts as returned, except if overdue is set.
type demoRental struct {
	bikeID, day, hour, hours int
	overdue                  bool
	customer                 domain.Customer
}

func person(first, last string, idType domain.IDType, idNumber string) domain.Customer {
	return domain.Customer{
		FirstName: first,
		LastName:  last,
		Email:     strings.ToLower(first + "." + last + "@mail.example"),
		IDType:    idType,
		IDNumber:  idNumber,
	}
}

func demoRentals() []demoRental {
	return []demoRental{
		{1, 0, 9, 4, false, person("Anna", "Berger", domain.Passport, "P4471823")},
		{5, 0, 10, 3, false, person("Lukas", "Gruber", domain.IDCard, "ID-882301")},
		{9, 0, 11, 6, false, person("Sophie", "Moser", domain.DriverLicense, "DL-550912")},
		{12, 0, 13, 4, false, person("Jonas", "Wagner", domain.IDCard, "ID-120457")},
		{3, 0, 15, 3, false, person("Mia", "Huber", domain.Passport, "P9034415")},
		{7, 0, 16, 2, false, person("Felix", "Steiner", domain.Passport, "P2208876")},
		{14, 0, 17, 2, false, person("Eva", "Pichler", domain.DriverLicense, "DL-189026")},
		{2, 0, 9, 3, true, person("Laura", "Fischer", domain.IDCard, "ID-704418")},
		{10, -1, 17, 40, false, person("Nora", "Hofer", domain.IDCard, "ID-451190")},
		{6, -1, 10, 3, false, person("Clara", "Reiter", domain.Passport, "P7782134")},
		{13, 1, 10, 8, false, person("Stefan", "Aigner", domain.Passport, "P6615207")},
		{4, 1, 9, 2, false, person("Paul", "Leitner", domain.IDCard, "ID-330982")},
	}
}

// seedRentals fills the store with rentals around today.
func seedRentals(s store.Store, prices domain.PriceList, now domain.Moment) {
	bikes := map[int]domain.Bike{}
	for _, b := range s.ListBikes() {
		bikes[b.ID] = b
	}
	y, mo, d := now.Date()
	for _, dr := range demoRentals() {
		bike := bikes[dr.bikeID]
		start := domain.NewMoment(time.Date(y, mo, d+dr.day, dr.hour, 0, 0, 0, now.Location()))
		quote, err := prices.Quote(bike.Category, dr.hours)
		if err != nil {
			log.Fatalf("seed quote: %v", err)
		}
		rental, err := s.AddRental(domain.Rental{
			BikeID:      bike.ID,
			Customer:    dr.customer,
			Start:       start,
			Hours:       dr.hours,
			End:         start.AddHours(dr.hours),
			HourlyCents: quote.HourlyCents,
			TotalCents:  quote.TotalCents,
		})
		if err != nil {
			log.Fatalf("seed rental: %v", err)
		}
		if !dr.overdue && rental.End.IsBefore(now) {
			if _, err := s.ReturnRental(rental.ID, rental.End); err != nil {
				log.Fatalf("seed return: %v", err)
			}
		}
	}
}
