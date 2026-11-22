package main

import (
	"fmt"
	"strings"
)

// Preise für die Blätter
const (
	GlassPricePerM2 = 120.0 // Euro pro Quadratmeter Glas
	FramePricePerM  = 25.0  // Euro pro Meter Rahmenumfang
)

// Item ist die gemeinsame Schnittstelle (Component) für Blätter und Composite.
// Da Go keine Vererbung kennt, wird die Beziehung aus dem UML über dieses Interface umgesetzt.
type Item interface {
	// Price liefert den Preis in Euro, bei einem Window die Summe aller enthaltenen Teile.
	Price() float64
	// Display liefert die Darstellung als Text, bei einem Window als eingerückte Struktur.
	Display() string
}

// Glass ist ein Blatt (Leaf): eine Glasscheibe, der Preis richtet sich nach der Fläche.
type Glass struct {
	Width, Height float64 // in Metern
}

func (g Glass) Price() float64 {
	return g.Width * g.Height * GlassPricePerM2
}

func (g Glass) Display() string {
	return fmt.Sprintf("Glas %.2f x %.2f m: %.2f EUR", g.Width, g.Height, g.Price())
}

// Frame ist ein Blatt (Leaf): ein Rahmen, der Preis richtet sich nach dem Umfang.
type Frame struct {
	Width, Height float64 // in Metern
}

func (f Frame) Price() float64 {
	return 2 * (f.Width + f.Height) * FramePricePerM
}

func (f Frame) Display() string {
	return fmt.Sprintf("Rahmen %.2f x %.2f m: %.2f EUR", f.Width, f.Height, f.Price())
}

// Window ist das Composite: es enthält 1..* Items, also Glas, Rahmen oder weitere Windows.
type Window struct {
	Name  string
	items []Item
}

// NewWindow verlangt mindestens ein Item. Damit ist die Multiplizität 1..*
// schon beim Kompilieren sichergestellt und ein leeres Fenster ist nicht möglich.
func NewWindow(name string, first Item, rest ...Item) *Window {
	return &Window{Name: name, items: append([]Item{first}, rest...)}
}

// Price ruft Price() bei allen enthaltenen Items auf und summiert die Ergebnisse.
// Enthaltene Windows rechnen dabei selbst wieder rekursiv.
func (w *Window) Price() float64 {
	sum := 0.0
	for _, item := range w.items {
		sum += item.Price()
	}
	return sum
}

// Display gibt das Fenster mit seinem Gesamtpreis aus und rückt alle enthaltenen Teile ein.
func (w *Window) Display() string {
	var b strings.Builder
	fmt.Fprintf(&b, "Fenster %q: %.2f EUR", w.Name, w.Price())
	for _, item := range w.items {
		for _, line := range strings.Split(item.Display(), "\n") {
			b.WriteString("\n  " + line)
		}
	}
	return b.String()
}
