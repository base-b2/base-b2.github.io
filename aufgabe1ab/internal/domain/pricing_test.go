package domain

import "testing"

func TestQuote(t *testing.T) {
	prices := PriceList{{Allround, []Tier{{1, 3000}, {2, 2500}, {4, 2000}}}}
	tests := []struct {
		days, wantDaily, wantTotal int
	}{
		{1, 3000, 3000},
		{2, 2500, 5000},
		{3, 2500, 7500},
		{4, 2000, 8000},
		{10, 2000, 20000},
	}
	for _, tt := range tests {
		q, err := prices.Quote(Allround, tt.days)
		if err != nil {
			t.Fatalf("%d days: %v", tt.days, err)
		}
		if q.DailyCents != tt.wantDaily || q.TotalCents != tt.wantTotal {
			t.Errorf("%d days: got %+v", tt.days, q)
		}
	}
}

func TestQuoteErrors(t *testing.T) {
	prices := PriceList{{Allround, []Tier{{1, 3000}}}}
	if _, err := prices.Quote(Allround, 0); err == nil {
		t.Error("0 days: want error")
	}
	if _, err := prices.Quote(Premium, 1); err == nil {
		t.Error("unknown category: want error")
	}
}
