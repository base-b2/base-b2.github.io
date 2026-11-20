# Prompt

Implementiere in Go das Composite Pattern anhand des Fenster-Beispiels aus der Vorlesung. Verwende nur die Standardbibliothek.

Vorgaben laut UML:
- Interface Item mit den Methoden Price() und Display()
- Window, Glass und Frame implementieren Item
- Window enthält 1..* Items

Umsetzung:
- Glass und Frame sind die Blätter. Der Preis ergibt sich aus den Maßen in Metern: Glas 120 Euro pro Quadratmeter, Rahmen 25 Euro pro Meter Umfang.
- Window ist das Composite und kann auch weitere Windows enthalten. Mindestens ein Item soll über den Konstruktor NewWindow(name, first, rest...) erzwungen werden.
- Price() berechnet den Preis rekursiv. Display() liefert die Struktur als eingerückten String mit dem Preis jedes Teils.
- In main soll das Fenster von der Tafel nachgebaut werden: 1,2 x 2,0 m, 2x2 geteilt, unten rechts ein Unterfenster mit eigenem Rahmen und vier Scheiben. Ausgegeben werden die Struktur und der Gesamtpreis in EUR.
- Zusätzlich Tests mit go test und eine kurze README.

Der Code soll kurz, verständlich und auf Deutsch kommentiert sein.
