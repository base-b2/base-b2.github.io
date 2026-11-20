# Composite Pattern in Go – Fenster aus Glas und Rahmen

Umsetzung des Vorlesungsbeispiels (Aufgabe 2) zum Composite-Konstruktionsprinzip. Der verwendete Prompt steht in [PROMPT.md](PROMPT.md).

## UML → Go

| Rolle im Pattern | UML | Go |
| --- | --- | --- |
| Component | `Item` mit `Price()`, `Display()` | `interface Item` |
| Leaf | `Glass` | `struct Glass` – Preis = Fläche × 120 €/m² |
| Leaf | `Frame` | `struct Frame` – Preis = Umfang × 25 €/m |
| Composite | `Window` mit 1..* `Item` | `struct Window` – summiert/zeigt seine Kinder rekursiv |

- Go hat keine Vererbung: Die Pfeile „ist ein Item" werden dadurch umgesetzt, dass alle drei Typen das Interface `Item` implementieren.
- Die Multiplizität **1..\*** wird von `NewWindow(name, first, rest...)` erzwungen: Ein Fenster ohne Teil lässt sich nicht erzeugen.
- Weil `Window` selbst ein `Item` ist, kann ein Fenster weitere Fenster enthalten. Der Client ruft nur `Price()` bzw. `Display()` auf, egal ob er ein einzelnes Teil oder einen ganzen Baum vor sich hat.

## Beispiel (Tafelskizze)

Ein Hauptfenster (1,2 × 2,0 m) ist 2×2 geteilt. Unten rechts sitzt ein eigenes Unterfenster mit Rahmen und 2×2 Scheiben.

```
Fenster "Hauptfenster": 528.00 €
  Rahmen 1.20 x 2.00 m: 160.00 €
  Glas 0.60 x 1.00 m: 72.00 €
  Glas 0.60 x 1.00 m: 72.00 €
  Glas 0.60 x 1.00 m: 72.00 €
  Fenster "Unterfenster unten rechts": 152.00 €
    Rahmen 0.60 x 1.00 m: 80.00 €
    Glas 0.30 x 0.50 m: 18.00 €
    Glas 0.30 x 0.50 m: 18.00 €
    Glas 0.30 x 0.50 m: 18.00 €
    Glas 0.30 x 0.50 m: 18.00 €
Gesamtpreis: 528.00 €
```

## Ausführen

Voraussetzung: Go 1.21 oder neuer.

```sh
go run .
go test -v ./...
```

## Dateien

- `item.go` – Interface `Item`, Blätter `Glass` und `Frame`, Composite `Window`
- `main.go` – baut das Fenster von der Tafel und gibt Baum und Preis aus
- `item_test.go` – Tests für Preise, Rekursion, Einrückung und die Programmausgabe
