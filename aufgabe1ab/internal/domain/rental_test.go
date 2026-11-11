package domain

import "testing"

func day(t *testing.T, s string) Date {
	t.Helper()
	d, err := ParseDate(s)
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestDays(t *testing.T) {
	if got := Days(day(t, "2026-12-10"), day(t, "2026-12-10")); got != 1 {
		t.Errorf("same day: got %d, want 1", got)
	}
	if got := Days(day(t, "2026-12-10"), day(t, "2026-12-13")); got != 4 {
		t.Errorf("10th to 13th: got %d, want 4", got)
	}
}

func TestAvailable(t *testing.T) {
	returned := day(t, "2026-12-12")
	rentals := []Rental{
		{SkiID: 1, Start: day(t, "2026-12-10"), End: day(t, "2026-12-12")},
		{SkiID: 2, Start: day(t, "2026-12-10"), End: day(t, "2026-12-12"), ReturnedOn: &returned},
	}
	tests := []struct {
		name       string
		ski        int
		start, end string
		want       bool
	}{
		{"same period", 1, "2026-12-10", "2026-12-12", false},
		{"touches last day", 1, "2026-12-12", "2026-12-14", false},
		{"day after", 1, "2026-12-13", "2026-12-14", true},
		{"day before", 1, "2026-12-08", "2026-12-09", true},
		{"other ski", 3, "2026-12-10", "2026-12-12", true},
		{"returned rental", 2, "2026-12-10", "2026-12-12", true},
	}
	for _, tt := range tests {
		got := Available(rentals, tt.ski, day(t, tt.start), day(t, tt.end))
		if got != tt.want {
			t.Errorf("%s: got %v, want %v", tt.name, got, tt.want)
		}
	}
}

func TestValidatePeriod(t *testing.T) {
	today := day(t, "2026-11-05")
	tests := []struct {
		name       string
		start, end string
		wantErr    bool
	}{
		{"valid", "2026-11-05", "2026-11-07", false},
		{"start in past", "2026-11-04", "2026-11-07", true},
		{"end before start", "2026-11-08", "2026-11-07", true},
		{"too long", "2026-11-05", "2026-12-04", true},
		{"longest", "2026-11-05", "2026-12-02", false},
	}
	for _, tt := range tests {
		err := ValidatePeriod(day(t, tt.start), day(t, tt.end), today)
		if (err != nil) != tt.wantErr {
			t.Errorf("%s: err = %v, wantErr %v", tt.name, err, tt.wantErr)
		}
	}
}

func TestStatus(t *testing.T) {
	today := day(t, "2026-11-05")
	returned := today
	tests := []struct {
		name string
		r    Rental
		want string
	}{
		{"upcoming", Rental{Start: day(t, "2026-11-06"), End: day(t, "2026-11-08")}, StatusUpcoming},
		{"active", Rental{Start: day(t, "2026-11-04"), End: day(t, "2026-11-05")}, StatusActive},
		{"overdue", Rental{Start: day(t, "2026-11-01"), End: day(t, "2026-11-04")}, StatusOverdue},
		{"returned", Rental{Start: day(t, "2026-11-01"), End: day(t, "2026-11-04"), ReturnedOn: &returned}, StatusReturned},
	}
	for _, tt := range tests {
		if got := tt.r.Status(today); got != tt.want {
			t.Errorf("%s: got %s, want %s", tt.name, got, tt.want)
		}
	}
}
