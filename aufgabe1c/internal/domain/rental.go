package domain

import (
	"fmt"
	"strings"
)

// MaxHours is the longest allowed rental.
const MaxHours = 72

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

// Rental books one bike for Hours full hours from Start.
type Rental struct {
	ID          int      `json:"id"`
	BikeID      int      `json:"bikeId"`
	Customer    Customer `json:"customer"`
	Start       Moment   `json:"start"`
	Hours       int      `json:"hours"`
	End         Moment   `json:"end"`
	HourlyCents int      `json:"hourlyCents"`
	TotalCents  int      `json:"totalCents"`
	IDFile      string   `json:"idFile,omitempty"`
	ReturnedAt  *Moment  `json:"returnedAt,omitempty"`
}

// Status derives the state of the rental at the given time.
func (r Rental) Status(now Moment) string {
	switch {
	case r.ReturnedAt != nil:
		return StatusReturned
	case now.IsBefore(r.Start):
		return StatusUpcoming
	case now.IsAfter(r.End):
		return StatusOverdue
	default:
		return StatusActive
	}
}

// Until is the time the bike is blocked until: the return time or the end.
func (r Rental) Until() Moment {
	if r.ReturnedAt != nil {
		return *r.ReturnedAt
	}
	return r.End
}

// Overlaps reports whether the rental blocks the bike at some time in [start, end).
// A rental returned before it began blocks nothing.
func (r Rental) Overlaps(start, end Moment) bool {
	until := r.Until()
	return r.Start.IsBefore(until) && r.Start.IsBefore(end) && start.IsBefore(until)
}

// Available reports whether a bike is free from start to end.
func Available(rentals []Rental, bikeID int, start, end Moment) bool {
	for _, r := range rentals {
		if r.BikeID == bikeID && r.Overlaps(start, end) {
			return false
		}
	}
	return true
}

// OpeningHours are the shop hours. Open is the first full hour, Close the end of the last.
type OpeningHours struct{ Open, Close int }

// DefaultOpeningHours is the one place to change the shop hours.
func DefaultOpeningHours() OpeningHours { return OpeningHours{Open: 9, Close: 19} }

func clock(hour int) string { return fmt.Sprintf("%02d:00", hour) }

// Validate checks the start and length of a new rental.
// The start is a full hour inside the opening hours. The end is inside
// the opening hours too, but may fall on a later day.
func (o OpeningHours) Validate(start Moment, hours int, now Moment) error {
	end := start.AddHours(hours)
	switch {
	case hours < 1:
		return Invalid("Die Mietdauer beträgt mindestens eine Stunde.")
	case hours > MaxHours:
		return Invalid(fmt.Sprintf("Die Mietdauer beträgt höchstens %d Stunden.", MaxHours))
	case start.Minute() != 0:
		return Invalid("Der Verleihbeginn muss zu einer vollen Stunde liegen.")
	case start.IsBefore(now.StartOfHour()):
		return Invalid("Der Verleihbeginn liegt in der Vergangenheit.")
	case start.Hour() < o.Open || start.Hour() >= o.Close:
		return Invalid(fmt.Sprintf("Der Verleih beginnt zwischen %s und %s Uhr.", clock(o.Open), clock(o.Close-1)))
	case end.Hour() < o.Open || end.Hour() > o.Close:
		return Invalid(fmt.Sprintf("Die Rückgabe ist nur zwischen %s und %s Uhr möglich.", clock(o.Open), clock(o.Close)))
	}
	return nil
}
