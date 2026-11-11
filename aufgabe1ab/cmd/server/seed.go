package main

import (
	"log"
	"strings"

	"skirental/internal/domain"
	"skirental/internal/store"
)

func demoSkis() []domain.Ski {
	return []domain.Ski{
		{ID: 1, Brand: "Atomic", Model: "Maverick Jr", LengthCm: 110, Category: domain.Junior},
		{ID: 2, Brand: "Head", Model: "Supershape Team", LengthCm: 130, Category: domain.Junior},
		{ID: 3, Brand: "Rossignol", Model: "Experience 76", LengthCm: 150, Category: domain.Junior},
		{ID: 4, Brand: "Salomon", Model: "E Lab 80", LengthCm: 160, Category: domain.Allround},
		{ID: 5, Brand: "Fischer", Model: "RC One 82", LengthCm: 165, Category: domain.Allround},
		{ID: 6, Brand: "Blizzard", Model: "Quattro 7.4", LengthCm: 170, Category: domain.Allround},
		{ID: 7, Brand: "Elan", Model: "Amphibio 78", LengthCm: 170, Category: domain.Allround},
		{ID: 8, Brand: "Atomic", Model: "Redster Q7", LengthCm: 175, Category: domain.Allround},
		{ID: 9, Brand: "Head", Model: "Kore 85", LengthCm: 180, Category: domain.Allround},
		{ID: 10, Brand: "Völkl", Model: "Deacon 80", LengthCm: 170, Category: domain.Premium},
		{ID: 11, Brand: "Rossignol", Model: "Hero Elite", LengthCm: 175, Category: domain.Premium},
		{ID: 12, Brand: "Salomon", Model: "S/Max 12", LengthCm: 180, Category: domain.Premium},
	}
}

// demoRental uses day offsets from today.
type demoRental struct {
	skiID, from, to int
	returned        bool
	customer        domain.Customer
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
		{4, -1, 1, false, person("Anna", "Berger", domain.Passport, "P4471823")},
		{5, -2, 0, false, person("Lukas", "Gruber", domain.IDCard, "ID-882301")},
		{6, 0, 3, false, person("Sophie", "Moser", domain.DriverLicense, "DL-550912")},
		{2, 0, 4, false, person("Jonas", "Wagner", domain.IDCard, "ID-120457")},
		{9, 2, 5, false, person("Mia", "Huber", domain.Passport, "P9034415")},
		{10, 3, 9, false, person("Felix", "Steiner", domain.Passport, "P2208876")},
		{7, -5, -1, false, person("Laura", "Fischer", domain.IDCard, "ID-704418")},
		{1, -8, -4, true, person("Paul", "Leitner", domain.IDCard, "ID-330982")},
		{8, -6, -3, true, person("Eva", "Pichler", domain.DriverLicense, "DL-189026")},
		{11, -1, 0, false, person("Stefan", "Aigner", domain.Passport, "P6615207")},
		{3, -3, 2, false, person("Nora", "Hofer", domain.IDCard, "ID-451190")},
	}
}

// seedRentals fills the store with rentals around today.
func seedRentals(s store.Store, prices domain.PriceList, today domain.Date) {
	skis := map[int]domain.Ski{}
	for _, k := range s.ListSkis() {
		skis[k.ID] = k
	}
	for _, d := range demoRentals() {
		ski := skis[d.skiID]
		start, end := today.AddDays(d.from), today.AddDays(d.to)
		quote, err := prices.Quote(ski.Category, domain.Days(start, end))
		if err != nil {
			log.Fatalf("seed quote: %v", err)
		}
		rental, err := s.AddRental(domain.Rental{
			SkiID:      ski.ID,
			Customer:   d.customer,
			Start:      start,
			End:        end,
			DailyCents: quote.DailyCents,
			TotalCents: quote.TotalCents,
		})
		if err != nil {
			log.Fatalf("seed rental: %v", err)
		}
		if d.returned {
			if _, err := s.ReturnRental(rental.ID, end); err != nil {
				log.Fatalf("seed return: %v", err)
			}
		}
	}
}
