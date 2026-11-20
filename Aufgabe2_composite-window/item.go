package main

import (
	"fmt"
	"strings"
)

// Preise der Blätter.
const (
	GlassPricePerM2 = 120.0 // € pro m² Glasfläche
	FramePricePerM  = 25.0  // € pro Laufmeter Rahmen (Umfang)
)

// Item ist die Component-Rolle: gemeinsame Schnittstelle für Blätter und Composite.
// Go kennt keine Klassenvererbung – die "is-a"-Beziehung aus dem UML wird über
// das (implizit erfüllte) Interface abgebildet.
type Item interface {
	// Price liefert den Preis in Euro; bei einem Window rekursiv die Summe aller Teile.
	Price() float64
	// Display liefert die Darstellung als Text; bei einem Window als eingerückten Baum.
	Display() string
}

// Glass ist ein Blatt (Leaf): eine Glasscheibe, Preis nach Fläche.
type Glass struct {
	Width, Height float64 // in m
}

func (g Glass) Price() float64 { return g.Width * g.Height * GlassPricePerM2 }

func (g Glass) Display() string {
	return fmt.Sprintf("Glas %.2f x %.2f m: %.2f €", g.Width, g.Height, g.Price())
}

// Frame ist ein Blatt (Leaf): ein Rahmen, Preis nach Umfang.
type Frame struct {
	Width, Height float64 // in m
}

func (f Frame) Price() float64 { return 2 * (f.Width + f.Height) * FramePricePerM }

func (f Frame) Display() string {
	return fmt.Sprintf("Rahmen %.2f x %.2f m: %.2f €", f.Width, f.Height, f.Price())
}

// Window ist das Composite: es enthält 1..* Items – Glas, Rahmen oder weitere Windows.
type Window struct {
	Name  string
	items []Item
}

// NewWindow erzwingt die Multiplizität 1..* bereits zur Compile-Zeit:
// Ohne mindestens ein Item lässt sich kein Window erzeugen.
func NewWindow(name string, first Item, rest ...Item) *Window {
	return &Window{Name: name, items: append([]Item{first}, rest...)}
}

// Add fügt weitere Teile hinzu.
func (w *Window) Add(items ...Item) { w.items = append(w.items, items...) }

// Price delegiert an alle Kinder und summiert – der Kern des Composite Patterns.
func (w *Window) Price() float64 {
	sum := 0.0
	for _, it := range w.items {
		sum += it.Price()
	}
	return sum
}

// Display gibt das Fenster mit Gesamtpreis aus und rückt die Kinder (rekursiv) ein.
func (w *Window) Display() string {
	var b strings.Builder
	fmt.Fprintf(&b, "Fenster %q: %.2f €", w.Name, w.Price())
	for _, it := range w.items {
		for _, line := range strings.Split(it.Display(), "\n") {
			b.WriteString("\n  " + line)
		}
	}
	return b.String()
}
