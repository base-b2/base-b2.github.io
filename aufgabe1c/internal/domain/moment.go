package domain

import (
	"encoding/json"
	"time"
)

const momentLayout = "2006-01-02T15:04"

// Moment is a wall-clock time in the shop's time zone, cut to the minute.
// It marshals as YYYY-MM-DDTHH:MM.
type Moment struct{ time.Time }

// NewMoment returns t cut to the minute.
func NewMoment(t time.Time) Moment {
	y, mo, d := t.Date()
	return Moment{time.Date(y, mo, d, t.Hour(), t.Minute(), 0, 0, t.Location())}
}

// ParseMoment reads a YYYY-MM-DDTHH:MM string in the given time zone.
func ParseMoment(s string, loc *time.Location) (Moment, error) {
	t, err := time.ParseInLocation(momentLayout, s, loc)
	if err != nil {
		return Moment{}, Invalid("Bitte einen gültigen Beginn angeben.")
	}
	return Moment{t}, nil
}

func (m Moment) String() string               { return m.Format(momentLayout) }
func (m Moment) MarshalJSON() ([]byte, error) { return json.Marshal(m.String()) }

// UnmarshalJSON reads YYYY-MM-DDTHH:MM as UTC. Used by tests, the API only writes moments.
func (m *Moment) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	t, err := time.ParseInLocation(momentLayout, s, time.UTC)
	if err != nil {
		return err
	}
	m.Time = t
	return nil
}

func (m Moment) IsBefore(o Moment) bool { return m.Time.Before(o.Time) }
func (m Moment) IsAfter(o Moment) bool  { return m.Time.After(o.Time) }
func (m Moment) AddHours(n int) Moment  { return Moment{m.Time.Add(time.Duration(n) * time.Hour)} }

// StartOfHour cuts m to the full hour.
func (m Moment) StartOfHour() Moment {
	y, mo, d := m.Date()
	return Moment{time.Date(y, mo, d, m.Hour(), 0, 0, 0, m.Location())}
}

// SameDay reports whether both moments fall on the same calendar day.
func (m Moment) SameDay(o Moment) bool {
	y1, m1, d1 := m.Date()
	y2, m2, d2 := o.Date()
	return y1 == y2 && m1 == m2 && d1 == d2
}
