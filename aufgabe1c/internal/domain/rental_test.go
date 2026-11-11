package domain

import (
	"testing"
	"time"
)

func at(t *testing.T, s string) Moment {
	t.Helper()
	m, err := ParseMoment(s, time.UTC)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestAvailable(t *testing.T) {
	early := at(t, "2026-11-10T11:00")
	cancelled := at(t, "2026-11-10T08:00")
	rentals := []Rental{
		{BikeID: 1, Start: at(t, "2026-11-10T10:00"), End: at(t, "2026-11-10T13:00")},
		{BikeID: 2, Start: at(t, "2026-11-10T10:00"), End: at(t, "2026-11-10T13:00"), ReturnedAt: &early},
		{BikeID: 3, Start: at(t, "2026-11-10T10:00"), End: at(t, "2026-11-10T13:00"), ReturnedAt: &cancelled},
	}
	tests := []struct {
		name       string
		bike       int
		start, end string
		want       bool
	}{
		{"same period", 1, "2026-11-10T10:00", "2026-11-10T13:00", false},
		{"inside", 1, "2026-11-10T11:00", "2026-11-10T12:00", false},
		{"starts when other ends", 1, "2026-11-10T13:00", "2026-11-10T15:00", true},
		{"ends when other starts", 1, "2026-11-10T08:00", "2026-11-10T10:00", true},
		{"overlaps start", 1, "2026-11-10T09:00", "2026-11-10T11:00", false},
		{"other bike", 4, "2026-11-10T10:00", "2026-11-10T13:00", true},
		{"returned early: before return", 2, "2026-11-10T10:00", "2026-11-10T11:00", false},
		{"returned early: after return", 2, "2026-11-10T11:00", "2026-11-10T13:00", true},
		{"cancelled before start", 3, "2026-11-10T09:00", "2026-11-10T14:00", true},
	}
	for _, tt := range tests {
		got := Available(rentals, tt.bike, at(t, tt.start), at(t, tt.end))
		if got != tt.want {
			t.Errorf("%s: got %v, want %v", tt.name, got, tt.want)
		}
	}
}

func TestValidate(t *testing.T) {
	hours := DefaultOpeningHours()
	now := at(t, "2026-11-10T14:20")
	tests := []struct {
		name    string
		start   string
		hours   int
		wantErr bool
	}{
		{"next hour", "2026-11-10T15:00", 2, false},
		{"current hour", "2026-11-10T14:00", 1, false},
		{"past hour", "2026-11-10T13:00", 1, true},
		{"not a full hour", "2026-11-10T15:30", 1, true},
		{"before opening", "2026-11-11T08:00", 1, true},
		{"last start", "2026-11-10T18:00", 1, false},
		{"after last start", "2026-11-10T19:00", 1, true},
		{"ends at closing", "2026-11-10T17:00", 2, false},
		{"ends after closing", "2026-11-10T18:00", 2, true},
		{"overnight", "2026-11-10T17:00", 17, false},
		{"overnight ends before opening", "2026-11-10T17:00", 15, true},
		{"zero hours", "2026-11-10T15:00", 0, true},
		{"too long", "2026-11-10T15:00", MaxHours + 1, true},
		{"longest", "2026-11-10T15:00", MaxHours, false},
	}
	for _, tt := range tests {
		err := hours.Validate(at(t, tt.start), tt.hours, now)
		if (err != nil) != tt.wantErr {
			t.Errorf("%s: err = %v, wantErr %v", tt.name, err, tt.wantErr)
		}
	}
}

func TestStatus(t *testing.T) {
	now := at(t, "2026-11-10T14:20")
	returned := now
	rental := func(start, end string) Rental { return Rental{Start: at(t, start), End: at(t, end)} }
	done := rental("2026-11-10T09:00", "2026-11-10T11:00")
	done.ReturnedAt = &returned
	tests := []struct {
		name string
		r    Rental
		want string
	}{
		{"upcoming", rental("2026-11-10T15:00", "2026-11-10T17:00"), StatusUpcoming},
		{"active", rental("2026-11-10T13:00", "2026-11-10T16:00"), StatusActive},
		{"ends this hour", rental("2026-11-10T12:00", "2026-11-10T14:00"), StatusOverdue},
		{"overdue", rental("2026-11-10T09:00", "2026-11-10T11:00"), StatusOverdue},
		{"returned", done, StatusReturned},
	}
	for _, tt := range tests {
		if got := tt.r.Status(now); got != tt.want {
			t.Errorf("%s: got %s, want %s", tt.name, got, tt.want)
		}
	}
}
