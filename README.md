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
- Standard-, Rund- und eigene PNG/SVG-Punktformen; Vordergrund- und Hintergrundfarben.
- Logo-Upload, vier optionale Rahmen und eigener Rahmentext.
- PNG/SVG herunterladen oder kopieren; Klick auf die Vorschau kopiert PNG. SVG wird bei fehlender Bild-Unterstützung als Quelltext kopiert.
- Mobile kompakte Sticky-Vorschau, Akkordeons und Feedback-Footer.
- QR-Codierung durch `qrcode`, Fehlerkorrektur H, mindestens vier Module Ruhezone. Reservierte Funktionsmuster bleiben auch unter Logos erhalten.
- Custom-Punkte: lokales Rasterisieren, Helligkeitsschwelle mit mindestens 60 % dunkler Fläche und dunklem Zentrum.
- `jsQR` decodiert die gerenderte PNG-Vorschau und vergleicht sie mit der normalisierten Ziel-URL. Bei Fehlschlag erscheint eine Warnung. Dies ersetzt keinen Scan auf einem echten Smartphone.

Die 14 Tests prüfen URLs, Kontrast, reservierte Muster und das Decodieren exportierter Bilder für Punktformen, Rahmen und Logo.
