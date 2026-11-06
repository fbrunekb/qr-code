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

## Live-Deployment mit Helm

Das Chart liegt in `charts/qr-studio/`. Das Dockerfile baut die App und liefert sie mit Nginx auf Port 8080 aus. Standardmäßig laufen zwei Replikate mit Rolling Updates, Readiness-/Liveness-Probes, Ressourcenlimits und einem PodDisruptionBudget. Der Container läuft ohne Root-Rechte mit schreibgeschütztem Root-Dateisystem; nur `/tmp` ist beschreibbar. Es gibt weiterhin keine Server-API. HTML wird vor erneuter Verwendung validiert, Vite-Assets mit Inhaltshash werden langfristig gecacht.

Voraussetzungen: Docker, Helm 3, kubectl mit Zugriff auf den Zielcluster (Kubernetes ≥ 1.25), eine erreichbare Container-Registry und für HTTPS ein installierter Ingress-Controller sowie ein TLS-Secret oder cert-manager. Das Chart installiert diese Infrastruktur nicht. Die Beispiele veröffentlichen die App unter `/` einer eigenen Domain.

1. Image bauen und in die eigene Registry hochladen. Für jede Veröffentlichung einen neuen, unveränderlichen Tag verwenden; hier ist `1.0.0` ein Beispiel:

   ```sh
   docker build --pull -t registry.example.com/qr-studio:1.0.0 .
   docker push registry.example.com/qr-studio:1.0.0
   ```

2. Live-Konfiguration anlegen:

   ```sh
   cp charts/qr-studio/values-live.example.yaml charts/qr-studio/values-live.yaml
   ```

   In `values-live.yaml` Registry, Image-Tag, IngressClass, Domain und TLS-Secret anpassen. Die lokale Datei wird von Git ignoriert. Das TLS-Secret muss im Namespace `qr-studio-live` liegen; bei cert-manager die vorhandene ClusterIssuer-Annotation aktivieren. Bei einer privaten Registry ein vorhandenes `imagePullSecret` aus demselben Namespace eintragen. DNS auf den Ingress-Controller zeigen lassen. HTTPS ermöglicht auch die Bild-Zwischenablage im Browser. Zugriffsprotokollierung am Ingress wird durch dessen Betreiber konfiguriert; Nginx im App-Container schreibt keine Access-Logs.

3. Chart prüfen und ausgerenderte Ressourcen vor dem Deployment ansehen:

   ```sh
   helm lint charts/qr-studio -f charts/qr-studio/values-live.yaml
   helm template qr-studio charts/qr-studio \
     --namespace qr-studio-live \
     -f charts/qr-studio/values-live.yaml
   ```

4. Kubernetes-Kontext kontrollieren und installieren bzw. aktualisieren:

   ```sh
   kubectl config current-context
   helm upgrade --install qr-studio charts/qr-studio \
     --namespace qr-studio-live --create-namespace \
     -f charts/qr-studio/values-live.yaml \
     --atomic --timeout 5m
   kubectl rollout status deployment/qr-studio -n qr-studio-live
   ```

   `--atomic` rollt ein fehlgeschlagenes Upgrade zurück bzw. entfernt eine fehlgeschlagene Erstinstallation. Bei späteren Releases denselben Release-Namen und Namespace mit einem neuen Image-Tag verwenden.

Ohne Ingress lässt sich eine Standardinstallation über `kubectl port-forward -n qr-studio-live svc/qr-studio 8080:80` unter `http://localhost:8080` erreichen. Die Standardwerte referenzieren `qr-studio:1.0.0`; im Cluster muss dieses Image verfügbar sein oder die Registry per Values gesetzt werden. Bei nur einer Replik den PodDisruptionBudget deaktivieren oder bewusst anpassen, damit Wartungsarbeiten nicht blockieren. Die zwei Replikate garantieren keine Verteilung auf unterschiedliche Nodes; dies kann über `affinity` konfiguriert werden.

Ein vorhandenes Release lässt sich mit `helm history qr-studio -n qr-studio-live` ansehen und mit `helm rollback qr-studio REVISION -n qr-studio-live --wait --timeout 5m` auf eine frühere Revision zurücksetzen. Für reproduzierbare Container-Builds können die Basisimages im Dockerfile zusätzlich auf geprüfte Digests festgelegt werden.

## Funktionen

- Automatische URL-Normalisierung und Live-Vorschau, ohne Generieren-Button.
- Standard, Abgerundet, Rund, Karo, Herzchen, Blurry-rund und eigene PNG/SVG-Punktformen; Vordergrund- und Hintergrundfarben.
- Logo-Upload, vier optionale Rahmen mit einstellbarer Breite und eigenem Rahmentext. Der Text folgt der eingegebenen URL bis zur ersten manuellen Änderung.
- PNG und SVG als Dateien herunterladen; PNG lässt sich zusätzlich als Bild kopieren, SVG als vollständiger Quelltext. Klick auf die Vorschau kopiert PNG. SVG-Kopieren legt ausschließlich Text in die Zwischenablage.
- Mobile kompakte Sticky-Vorschau, Akkordeons und Feedback-Footer. Der Scanstatus steht unter der Vorschau; Custom-Hilfe ist per Info-Icon erreichbar. Farben werden in einer tastaturbedienbaren Auswahl über den linken Einstellungen ausgewählt; sie überlagert die Karten ohne Layoutverschiebung, Blur oder Abdunklung. Die QR-Vorschau bleibt sichtbar. Der Footer lädt zu Ideen für QR Studio, anderen Softwareideen und Projektanfragen ein.
- QR-Codierung durch `qrcode`, Fehlerkorrektur H, mindestens vier Module Ruhezone. Auch Timing- und Formatmodule folgen der ausgewählten Punktform. Erkennungskonturen bleiben zusammenhängend; bei runden Formen sind ihre Ecken abgerundet. Funktionsmuster sind vor Logo-Überlagerung geschützt.
- Custom-Punkte: zuerst Transparenz auf Weiß abflachen, dann lokales Rasterisieren und Schwarz-Weiß-Konvertierung bei 50 % Helligkeit, ohne erzwungene Füllung oder Mitte. Die letzte Kachel „Eigene Form verwenden“ öffnet direkt die Dateiauswahl. Mehrere Formen lassen sich gleichzeitig oder nacheinander hinzufügen, anhand ihrer Dateinamen auswählen und über das X entfernen. Der Invertierungsstatus bleibt pro Form beim Wechsel gespeichert (für die laufende Sitzung). Custom- und Logo-Uploads haben kein festes Dateigrößenlimit. Logos werden lokal auf maximal 256 × 256 Pixel eingepasst und klein in die Mitte gesetzt.
- `jsQR` decodiert die gerenderte PNG-Vorschau und vergleicht sie mit der normalisierten Ziel-URL. Bei Fehlschlag erscheint eine Warnung. Dies ersetzt keinen Scan auf einem echten Smartphone.

Die Tests prüfen URLs, Kontrast, reservierte Muster und das Decodieren exportierter Bilder für Punktformen, Rahmen und Logo sowie Label-Verhalten, Schwarz-Weiß-Konvertierung und Invertierung.

Die Schrift Manrope wird lokal eingebunden und steht unter der SIL Open Font License 1.1; siehe `public/licenses/manrope.txt`.
