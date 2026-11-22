package main

import (
	"math"
	"strings"
	"testing"
)

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

// Prüft die Preise der Blätter und die rekursive Summe der Fenster.
func TestPrices(t *testing.T) {
	tests := []struct {
		name string
		item Item
		want float64
	}{
		{"Glas 1 x 1 m", Glass{1, 1}, 120},
		{"Rahmen 1 x 1 m", Frame{1, 1}, 100},
		{"Fenster mit einem Teil", NewWindow("w", Glass{1, 1}), 120},
		{"Fenster im Fenster", NewWindow("aussen", Frame{1, 1}, NewWindow("innen", Glass{1, 1})), 220},
		{"Unterfenster", buildWindow().items[4], 80 + 4*18},
		{"Fenster von der Tafel", buildWindow(), 160 + 3*72 + 152},
	}
	for _, tt := range tests {
		if got := tt.item.Price(); !almostEqual(got, tt.want) {
			t.Errorf("%s: Price() = %.2f, erwartet %.2f", tt.name, got, tt.want)
		}
	}
}

// Prüft, ob verschachtelte Teile korrekt eingerückt werden.
func TestDisplay(t *testing.T) {
	out := buildWindow().Display()
	for _, want := range []string{
		`Fenster "Hauptfenster": 528.00 EUR`,
		"\n  Rahmen 1.20 x 2.00 m: 160.00 EUR",
		"\n  Fenster \"Unterfenster unten rechts\": 152.00 EUR",
		"\n    Glas 0.30 x 0.50 m: 18.00 EUR",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("Display() enthält %q nicht:\n%s", want, out)
		}
	}
}

// Prüft die komplette Ausgabe des Programms.
func Example_main() {
	main()
	// Output:
	// Fenster "Hauptfenster": 528.00 EUR
	//   Rahmen 1.20 x 2.00 m: 160.00 EUR
	//   Glas 0.60 x 1.00 m: 72.00 EUR
	//   Glas 0.60 x 1.00 m: 72.00 EUR
	//   Glas 0.60 x 1.00 m: 72.00 EUR
	//   Fenster "Unterfenster unten rechts": 152.00 EUR
	//     Rahmen 0.60 x 1.00 m: 80.00 EUR
	//     Glas 0.30 x 0.50 m: 18.00 EUR
	//     Glas 0.30 x 0.50 m: 18.00 EUR
	//     Glas 0.30 x 0.50 m: 18.00 EUR
	//     Glas 0.30 x 0.50 m: 18.00 EUR
	// Gesamtpreis: 528.00 EUR
}
