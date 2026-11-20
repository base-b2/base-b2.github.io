# Prompt (Claude Code)

```text
Implementiere in Go (Modul composite-window, nur Standardbibliothek) das Composite Pattern aus der Vorlesung
(UML: Window, Glass, Frame implementieren Item; Window enthält 1..* Item):

- Component: Interface Item mit Price() float64 und Display() string.
- Leafs: Glass (Breite × Höhe in m, 120 €/m²) und Frame (Breite × Höhe in m, 25 € pro m Umfang).
- Composite: Window mit Name und 1..* Items (auch weitere Windows); NewWindow(name, first Item, rest ...Item)
  erzwingt mindestens ein Item. Price() = rekursive Summe, Display() = eingerückter Baum mit Preis je Zeile.
- main baut das Tafel-Fenster (1,2 × 2,0 m, 2×2 geteilt): Rahmen, drei Scheiben, unten rechts ein Unterfenster
  mit eigenem Rahmen und 2×2 Scheiben; Baum und Gesamtpreis ausgeben.
- Tests mit go test (Preise, Rekursion, Display, Example). Kurzer, idiomatischer, deutsch kommentierter Code,
  README mit go run/go test, dieser Prompt in PROMPT.md.
```
