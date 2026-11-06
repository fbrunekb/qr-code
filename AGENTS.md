# QR Studio

- Ziel: benutzbarer, rein clientseitiger QR-Studio-MVP entsprechend den bereitgestellten Desktop- und Mobilvorlagen.
- Stack: React, TypeScript, Vite; QR-Codierung mit qrcode, Scanprüfung mit jsQR, Tests mit Node/tsx und sharp.
- Hauptbranch: main (lokal und auf GitHub). Git-Identität: Fabian Brune <fabian.brune@klosebrothers.de>.
- Befehle: npm ci; npm run dev; npm test; npm run build.
- Keine Server-API, keine Übermittlung von URLs/Bildern, keine externen Schriftarten oder Trackingdienste.
- Vier Module Ruhezone erhalten und Scanbarkeit prüfen. Auf ausdrücklichen Nutzerwunsch auch Timing-/Formatmodule in der gewählten Form darstellen. Erkennungskonturen bleiben zusammenhängend; runde Formen erhalten abgerundete Erkennungsecken. Funktionsmuster weiterhin vor Logo-Überlagerung schützen.
- Der Nutzer wünscht autonome, schlanke Umsetzung im vorhandenen Repository ohne Subagenten oder zusätzliche Klone.
