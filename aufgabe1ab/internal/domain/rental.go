package domain

import (
	"fmt"
	"strings"
)

// MaxDays is the longest allowed rental.
const MaxDays = 28

// Rental statuses.
const (
	StatusUpcoming = "upcoming"
	StatusActive   = "active"
	StatusOverdue  = "overdue"
	StatusReturned = "returned"
)

// IDType is the kind of identity document.
type IDType string

const (
	Passport      IDType = "passport"
	IDCard        IDType = "id_card"
	DriverLicense IDType = "driver_license"
)

func (t IDType) Valid() bool {
	switch t {
	case Passport, IDCard, DriverLicense:
		return true
	}
	return false
}

// Customer is the renter and the identity document shown at pickup.
type Customer struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	IDType    IDType `json:"idType"`
	IDNumber  string `json:"idNumber"`
}

// Validate checks the required customer fields.
func (c Customer) Validate() error {
	switch {
	case c.FirstName == "" || c.LastName == "":
		return Invalid("Bitte Vor- und Nachnamen angeben.")
	case !strings.Contains(c.Email, "@"):
		return Invalid("Bitte eine gültige E-Mail-Adresse angeben.")
	case !c.IDType.Valid():
		return Invalid("Bitte die Art des Ausweises wählen.")
	case len(c.IDNumber) < 4:
		return Invalid("Bitte die Ausweisnummer angeben.")
	}
	return nil
}

// Rental books one ski for a period. Start and End are both rental days.
type Rental struct {
	ID         int      `json:"id"`
	SkiID      int      `json:"skiId"`
	Customer   Customer `json:"customer"`
	Start      Date     `json:"start"`
	End        Date     `json:"end"`
	DailyCents int      `json:"dailyCents"`
	TotalCents int      `json:"totalCents"`
	IDFile     string   `json:"idFile,omitempty"`
	ReturnedOn *Date    `json:"returnedOn,omitempty"`
}

// Status derives the state of the rental on the given day.
func (r Rental) Status(today Date) string {
	switch {
	case r.ReturnedOn != nil:
		return StatusReturned
	case today.IsBefore(r.Start):
		return StatusUpcoming
	case today.IsAfter(r.End):
		return StatusOverdue
	default:
		return StatusActive
	}
}

// Overlaps reports whether the rental shares a day with start..end.
func (r Rental) Overlaps(start, end Date) bool {
	return !r.End.IsBefore(start) && !end.IsBefore(r.Start)
}

// Days counts the rental days from start to end, both included.
func Days(start, end Date) int { return start.DaysTo(end) + 1 }

// ValidatePeriod checks start and end of a new rental.
func ValidatePeriod(start, end, today Date) error {
	switch {
	case start.IsBefore(today):
		return Invalid("Der Verleihbeginn liegt in der Vergangenheit.")
	case end.IsBefore(start):
		return Invalid("Die Rückgabe liegt vor dem Verleihbeginn.")
	case Days(start, end) > MaxDays:
		return Invalid(fmt.Sprintf("Die Verleihdauer beträgt höchstens %d Tage.", MaxDays))
	}
	return nil
}

// Available reports whether a ski is free from start to end.
// Returned rentals do not block.
func Available(rentals []Rental, skiID int, start, end Date) bool {
	for _, r := range rentals {
		if r.SkiID == skiID && r.ReturnedOn == nil && r.Overlaps(start, end) {
			return false
		}
	}
	return true
}
