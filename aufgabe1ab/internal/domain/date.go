package domain

import (
	"encoding/json"
	"time"
)

const dateLayout = "2006-01-02"

// Date is a calendar day without time of day. It marshals as YYYY-MM-DD.
type Date struct{ time.Time }

// NewDate returns the calendar day of t.
func NewDate(t time.Time) Date {
	y, m, d := t.Date()
	return Date{time.Date(y, m, d, 0, 0, 0, 0, time.UTC)}
}

// ParseDate reads a YYYY-MM-DD string.
func ParseDate(s string) (Date, error) {
	t, err := time.Parse(dateLayout, s)
	if err != nil {
		return Date{}, Invalid("Bitte ein gültiges Datum angeben.")
	}
	return Date{t}, nil
}

func (d Date) String() string               { return d.Format(dateLayout) }
func (d Date) MarshalJSON() ([]byte, error) { return json.Marshal(d.String()) }

func (d Date) IsBefore(o Date) bool { return d.Time.Before(o.Time) }
func (d Date) IsAfter(o Date) bool  { return d.Time.After(o.Time) }
func (d Date) IsSame(o Date) bool   { return d.Time.Equal(o.Time) }
func (d Date) AddDays(n int) Date   { return Date{d.Time.AddDate(0, 0, n)} }

// DaysTo returns the number of days from d to o.
func (d Date) DaysTo(o Date) int { return int(o.Time.Sub(d.Time) / (24 * time.Hour)) }
