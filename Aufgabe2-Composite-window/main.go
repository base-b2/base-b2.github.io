package main

import "fmt"

// buildWindow baut das Fenster von der Tafel nach (1,2 x 2,0 m, 2x2 geteilt).
// Unten rechts sitzt ein Unterfenster mit eigenem Rahmen und vier Scheiben:
//
//	+-----+-----+
//	|     |     |
//	|  G  |  G  |
//	|     |     |
//	+-----+--+--+
//	|     |G |G |
//	|  G  +--+--+
//	|     |G |G |
//	+-----+--+--+
func buildWindow() *Window {
	sub := NewWindow("Unterfenster unten rechts",
		Frame{0.6, 1.0},
		Glass{0.3, 0.5}, Glass{0.3, 0.5},
		Glass{0.3, 0.5}, Glass{0.3, 0.5},
	)
	return NewWindow("Hauptfenster",
		Frame{1.2, 2.0},
		Glass{0.6, 1.0}, // oben links
		Glass{0.6, 1.0}, // oben rechts
		Glass{0.6, 1.0}, // unten links
		sub,             // unten rechts: ein Window im Window
	)
}

func main() {
	w := buildWindow()
	fmt.Println(w.Display())
	fmt.Printf("Gesamtpreis: %.2f EUR\n", w.Price())
}
