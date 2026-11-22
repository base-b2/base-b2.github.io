# Aufgabe 2: Composite Pattern in Go

Umsetzung des Fenster-Beispiels aus der Vorlesung Software Engineering mit dem Composite Pattern.
Der Code wurde mit Claude Code erstellt, der verwendete Prompt steht in [PROMPT.md](PROMPT.md).

## Aufbau

Ein Fenster besteht aus Glasscheiben und einem Rahmen, kann aber auch selbst wieder kleinere Fenster enthalten.
Damit ein ganzes Fenster genauso behandelt werden kann wie ein einzelnes Teil, implementieren alle Typen dasselbe Interface Item:

- Item (Component): Price() und Display()
- Glass (Leaf): Preis = Fläche x 120 Euro pro Quadratmeter
- Frame (Leaf): Preis = Umfang x 25 Euro pro Meter
- Window (Composite): enthält 1..* Items und berechnet Preis und Ausgabe rekursiv über alle enthaltenen Teile

Da Go keine Vererbung kennt, wird die Beziehung aus dem UML über das Interface umgesetzt.
Die Multiplizität 1..* wird über den Konstruktor NewWindow(name, first, rest...) sichergestellt, ein leeres Fenster kann also nicht erstellt werden.

## Beispiel

In main.go wird das Fenster von der Tafel nachgebaut: 1,2 x 2,0 m, 2x2 geteilt, unten rechts ein Unterfenster mit eigenem Rahmen und vier Scheiben.

Ausgabe:

    Fenster "Hauptfenster": 528.00 EUR
      Rahmen 1.20 x 2.00 m: 160.00 EUR
      Glas 0.60 x 1.00 m: 72.00 EUR
      Glas 0.60 x 1.00 m: 72.00 EUR
      Glas 0.60 x 1.00 m: 72.00 EUR
      Fenster "Unterfenster unten rechts": 152.00 EUR
        Rahmen 0.60 x 1.00 m: 80.00 EUR
        Glas 0.30 x 0.50 m: 18.00 EUR
        Glas 0.30 x 0.50 m: 18.00 EUR
        Glas 0.30 x 0.50 m: 18.00 EUR
        Glas 0.30 x 0.50 m: 18.00 EUR
    Gesamtpreis: 528.00 EUR

## Starten

Voraussetzung ist Go ab Version 1.21.

    go run .
    go test -v ./...

## Dateien

- item.go: Interface Item sowie Glass, Frame und Window
- main.go: baut das Beispiel-Fenster und gibt es aus
- item_test.go: Tests für Preise, Rekursion und Ausgabe
- PROMPT.md: der verwendete Prompt
