# QR Studio

Responsive QR-Code-Gestaltung mit React, TypeScript und Vite. Alle URLs und Bilder werden ausschließlich im Browser verarbeitet, ohne Backend, Tracking oder externe APIs.

## Lokal starten

Node.js 22 empfohlen.

```sh
npm ci
npm run dev
```

Vorschau: http://localhost:5173. Auf einem Smartphone im selben Netzwerk die vom Dev-Server angezeigte Netzwerkadresse nutzen. Bild-Zwischenablage benötigt HTTPS oder localhost und Browserunterstützung; Downloads funktionieren auch ohne Zwischenablagezugriff.

```sh
npm test
npm run build
npm run preview
```

Für statisches Hosting den Inhalt von `dist/` bereitstellen. Relative Asset-Pfade erlauben auch Unterverzeichnisse.

## Funktionen

- Automatische URL-Normalisierung und Live-Vorschau, ohne Generieren-Button.
- Standard, Abgerundet, Rund, Karo, Herzchen, Blurry-rund und eigene PNG/SVG-Punktformen; Vordergrund- und Hintergrundfarben.
- Logo-Upload, vier optionale Rahmen mit einstellbarer Breite und eigenem Rahmentext. Der Text folgt der eingegebenen URL bis zur ersten manuellen Änderung.
- PNG und SVG als Dateien herunterladen; PNG lässt sich zusätzlich als Bild kopieren, SVG als vollständiger Quelltext. Klick auf die Vorschau kopiert PNG. SVG-Kopieren legt ausschließlich Text in die Zwischenablage.
- Mobile kompakte Sticky-Vorschau, Akkordeons und Feedback-Footer. Der Scanstatus steht unter der Vorschau; Custom-Hilfe ist per Info-Icon erreichbar. Farben werden in einer tastaturbedienbaren Auswahl oberhalb der linken Einstellungen ausgewählt, während die QR-Vorschau sichtbar bleibt. Der Footer lädt zu Ideen für QR Studio, anderen Softwareideen und Projektanfragen ein.
- QR-Codierung durch `qrcode`, Fehlerkorrektur H, mindestens vier Module Ruhezone. Auch Timing- und Formatmodule folgen der ausgewählten Punktform. Erkennungskonturen bleiben zusammenhängend; bei runden Formen sind ihre Ecken abgerundet. Funktionsmuster sind vor Logo-Überlagerung geschützt.
- Custom-Punkte: zuerst Transparenz auf Weiß abflachen, dann lokales Rasterisieren und Schwarz-Weiß-Konvertierung bei 50 % Helligkeit, ohne erzwungene Füllung oder Mitte. Die letzte Kachel „Eigene Form verwenden“ öffnet direkt die Dateiauswahl. Mehrere Formen lassen sich gleichzeitig oder nacheinander hinzufügen, anhand ihrer Dateinamen auswählen und über das X entfernen. Der Invertierungsstatus bleibt pro Form beim Wechsel gespeichert (für die laufende Sitzung). Custom- und Logo-Uploads haben kein festes Dateigrößenlimit. Logos werden lokal auf maximal 256 × 256 Pixel eingepasst und klein in die Mitte gesetzt.
- `jsQR` decodiert die gerenderte PNG-Vorschau und vergleicht sie mit der normalisierten Ziel-URL. Bei Fehlschlag erscheint eine Warnung. Dies ersetzt keinen Scan auf einem echten Smartphone.

Die Tests prüfen URLs, Kontrast, reservierte Muster und das Decodieren exportierter Bilder für Punktformen, Rahmen und Logo sowie Label-Verhalten, Schwarz-Weiß-Konvertierung und Invertierung.

Die Schrift Manrope wird lokal eingebunden und steht unter der SIL Open Font License 1.1; siehe `public/licenses/manrope.txt`.
