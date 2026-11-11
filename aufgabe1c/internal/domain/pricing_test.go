package domain

import "testing"

func TestQuote(t *testing.T) {
	prices := PriceList{{City, []Tier{{1, 500}, {2, 450}, {4, 350}}, 1600}}
	tests := []struct {
		name                         string
		hours, wantHourly, wantTotal int
		wantDayRate                  bool
	}{
		{"one hour", 1, 500, 500, false},
		{"two hours", 2, 450, 900, false},
		{"three hours", 3, 450, 1350, false},
		{"four hours", 4, 350, 1400, false},
		{"day price caps", 5, 350, 1600, true},
		{"full day", 24, 350, 1600, true},
		{"started second day", 25, 350, 3200, true},
		{"three days", 72, 350, 4800, true},
	}
	for _, tt := range tests {
		q, err := prices.Quote(City, tt.hours)
		if err != nil {
			t.Fatalf("%s: %v", tt.name, err)
		}
		if q.HourlyCents != tt.wantHourly || q.TotalCents != tt.wantTotal || q.DayRate != tt.wantDayRate {
			t.Errorf("%s: got %+v", tt.name, q)
		}
	}
}

func TestQuoteErrors(t *testing.T) {
	prices := PriceList{{City, []Tier{{1, 500}}, 1600}}
	if _, err := prices.Quote(City, 0); err == nil {
		t.Error("0 hours: want error")
	}
	if _, err := prices.Quote(EBike, 1); err == nil {
		t.Error("unknown category: want error")
	}
}

func TestDefaultPricesNeverRiseWithDuration(t *testing.T) {
	for _, cp := range DefaultPrices() {
		prev := 0
		for h := 1; h <= MaxHours; h++ {
			q, err := DefaultPrices().Quote(cp.Category, h)
			if err != nil {
				t.Fatal(err)
			}
			if q.TotalCents < prev {
				t.Errorf("%s: %d hours cost less than %d", cp.Category, h, h-1)
			}
			prev = q.TotalCents
		}
	}
}
