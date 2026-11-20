package main

import (
	"math"
	"strings"
	"testing"
)

func almostEqual(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestPrices(t *testing.T) {
	tests := []struct {
		name string
		item Item
		want float64
	}{
		{"Glas 1 m²", Glass{1, 1}, 120},
		{"Rahmen 1x1 m (4 m Umfang)", Frame{1, 1}, 100},
		{"Fenster aus einem Teil", NewWindow("w", Glass{1, 1}), 120},
		{"Unterfenster", buildWindow().items[4], 80 + 4*18},
		{"Tafel-Fenster gesamt", buildWindow(), 160 + 3*72 + 152},
	}
	for _, tt := range tests {
		if got := tt.item.Price(); !almostEqual(got, tt.want) {
			t.Errorf("%s: Price() = %.2f, want %.2f", tt.name, got, tt.want)
		}
	}
}

func TestAddUpdatesPriceRecursively(t *testing.T) {
	inner := NewWindow("innen", Glass{1, 1})
	outer := NewWindow("außen", Frame{1, 1}, inner)
	inner.Add(Glass{1, 1})
	if got := outer.Price(); !almostEqual(got, 100+2*120) {
		t.Errorf("Price() = %.2f, want 340.00", got)
	}
}

func TestDisplayIndentsNestedItems(t *testing.T) {
	out := buildWindow().Display()
	for _, want := range []string{
		`Fenster "Hauptfenster": 528.00 €`,
		"\n  Rahmen 1.20 x 2.00 m: 160.00 €",
		"\n  Fenster \"Unterfenster unten rechts\": 152.00 €",
		"\n    Glas 0.30 x 0.50 m: 18.00 €",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("Display() fehlt %q in:\n%s", want, out)
		}
	}
}

func Example_main() {
	main()
	// Output:
	// Fenster "Hauptfenster": 528.00 €
	//   Rahmen 1.20 x 2.00 m: 160.00 €
	//   Glas 0.60 x 1.00 m: 72.00 €
	//   Glas 0.60 x 1.00 m: 72.00 €
	//   Glas 0.60 x 1.00 m: 72.00 €
	//   Fenster "Unterfenster unten rechts": 152.00 €
	//     Rahmen 0.60 x 1.00 m: 80.00 €
	//     Glas 0.30 x 0.50 m: 18.00 €
	//     Glas 0.30 x 0.50 m: 18.00 €
	//     Glas 0.30 x 0.50 m: 18.00 €
	//     Glas 0.30 x 0.50 m: 18.00 €
	// Gesamtpreis: 528.00 €
}
