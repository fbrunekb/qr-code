# QR Studio

- Ziel: benutzbarer, rein clientseitiger QR-Studio-MVP entsprechend den bereitgestellten Desktop- und Mobilvorlagen.
- Stack: React, TypeScript, Vite; QR-Codierung mit qrcode, Scanprüfung mit jsQR, Tests mit Node/tsx und sharp.
- Hauptbranch für diesen Auftrag: master. Git-Identität: Fabian Brune <fabian.brune@klosebrothers.de>.
- Befehle: npm ci; npm run dev; npm test; npm run build.
- Keine Server-API, keine Übermittlung von URLs/Bildern, keine externen Schriftarten oder Trackingdienste.
- QR-Funktionsmuster und vier Module Ruhezone erhalten. Scanbarkeit hat Vorrang vor Gestaltung.
- Der Nutzer wünscht autonome, schlanke Umsetzung im vorhandenen Repository ohne Subagenten oder zusätzliche Klone.
