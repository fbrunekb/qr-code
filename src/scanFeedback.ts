import {contrast,type Settings} from './qr';

export function scanFeedback(success:boolean,settings:Settings):string {
  if(success)return 'Der QR-Code müsste erfolgreich gelesen werden können. Starker Kontrast und mittig ausgefüllte Punktform verbessern die Lesbarkeit.';
  const hints=['Der QR-Code kann wahrscheinlich nicht erfolgreich gelesen werden.'];
  if(contrast(settings.foreground,settings.background)<4.5)hints.push('Erhöhe den Kontrast.');
  if(settings.shape!=='square')hints.push('Wähle eine mittig ausgefüllte Punktform.');
  if(settings.logo)hints.push('Achte darauf, dass das Logo in der Mitte nicht zu viel verdeckt, da der QR-Code sonst unlesbar wird.');
  if(hints.length===1)hints.push('Bitte teste den QR-Code mit deinem Smartphone.');
  return hints.join(' ');
}
