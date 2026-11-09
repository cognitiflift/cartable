// Moment de révision (#154) : quand l'Élève dit qu'il reviendra, choisi dans une liste fermée tenue par l'appli
// (esprit de l'ADR 0002 : l'écran n'envoie qu'une valeur de cette liste). Module pur.
import { HttpError } from './http-error.js';

export const MOMENTS = [
  { id: 'apres-ecole', libelle: 'Après l’école' },
  { id: 'apres-repas', libelle: 'Après le repas du soir' },
  { id: 'matin', libelle: 'Le matin avant l’école' },
  { id: 'week-end', libelle: 'Le week-end' },
  { id: 'je-ne-sais-pas', libelle: 'Je ne sais pas' },
];

// `moment` : un identifiant de la liste, ou null pour retirer le choix. Toute autre valeur est refusée.
export function validerMoment(moment) {
  if (moment === null) return null;
  if (typeof moment === 'string' && MOMENTS.some((m) => m.id === moment)) return moment;
  throw new HttpError(400, 'Moment de révision inconnu');
}

// Rappel calendrier (#155) : le parent fixe l'heure de chaque moment ; le serveur en tire un fichier iCalendar
// (RFC 5545) que le parent importe dans son propre calendrier. Rien n'est envoyé ni hébergé (ADR 0001).
// « Je ne sais pas » n'a pas d'heure : il ne donne pas de rappel.
export const HEURES_PAR_DEFAUT = { 'apres-ecole': '16:30', 'apres-repas': '19:30', matin: '07:30', 'week-end': '10:00' };
const HEURE_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Heures effectives : les valeurs proposées, remplacées par celles que le parent a réglées.
export const heuresDe = (reglees) => ({ ...HEURES_PAR_DEFAUT, ...(reglees ?? {}) });

// `heures` : un objet { momentId: 'HH:MM' } ; chaque clé doit avoir une heure, chaque valeur être une heure valide.
export function validerHeures(heures) {
  if (!heures || typeof heures !== 'object' || Array.isArray(heures) || !Object.keys(heures).length) throw new HttpError(400, 'Heures à régler : un objet moment → HH:MM');
  for (const [id, heure] of Object.entries(heures)) {
    if (!(id in HEURES_PAR_DEFAUT)) throw new HttpError(400, 'Moment de révision sans heure');
    if (typeof heure !== 'string' || !HEURE_RE.test(heure)) throw new HttpError(400, 'Heure invalide (HH:MM, de 00:00 à 23:59)');
  }
  return heures;
}

const echapper = (t) => String(t).replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');
const chiffres = (n) => String(n).padStart(2, '0');
// Plie une ligne à 75 octets au plus (RFC 5545, 3.1) : la suite commence par une espace.
function plier(ligne) {
  const morceaux = [];
  let courant = '';
  for (const c of ligne) {
    if (Buffer.byteLength(courant + c) > (morceaux.length ? 74 : 75)) { morceaux.push(courant); courant = ''; }
    courant += c;
  }
  morceaux.push(courant);
  return morceaux.join('\r\n ');
}

// Fichier iCalendar du rappel : un événement récurrent à l'heure locale du moment (heure « flottante », sans fuseau :
// elle suit le calendrier du parent), avec une alarme à l'heure de l'événement. Tous les jours ; le week-end, le samedi
// et le dimanche seulement. Sans moment avec heure : HttpError 409.
export function fichierIcal({ moment, heures, pseudo, maintenant }) {
  const heure = moment && heuresDe(heures)[moment];
  if (!heure) throw new HttpError(409, 'Aucun moment de révision choisi : l’Élève doit d’abord en choisir un (autre que « Je ne sais pas »).');
  const libelle = MOMENTS.find((m) => m.id === moment).libelle.toLowerCase();
  const u = new Date(maintenant);
  const stamp = `${u.getUTCFullYear()}${chiffres(u.getUTCMonth() + 1)}${chiffres(u.getUTCDate())}T${chiffres(u.getUTCHours())}${chiffres(u.getUTCMinutes())}${chiffres(u.getUTCSeconds())}Z`;
  // Premier jour de l'événement : aujourd'hui ; pour le week-end, le prochain samedi ou dimanche (DTSTART doit correspondre à la règle).
  const d = new Date(maintenant);
  if (moment === 'week-end' && d.getDay() >= 1 && d.getDay() <= 5) d.setDate(d.getDate() + (6 - d.getDay()));
  const jour = `${d.getFullYear()}${chiffres(d.getMonth() + 1)}${chiffres(d.getDate())}`;
  const [hh, mm] = heure.split(':');
  const resume = `Révision Cartable de ${pseudo}`;
  const lignes = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cartable//Rappel de révision//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:rappel-${moment}-${jour}@cartable.local`, `DTSTAMP:${stamp}`, `DTSTART:${jour}T${hh}${mm}00`, 'DURATION:PT15M',
    moment === 'week-end' ? 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU' : 'RRULE:FREQ=DAILY',
    `SUMMARY:${echapper(resume)}`, `DESCRIPTION:${echapper(`Moment choisi : ${libelle}. Ouvre Cartable pour la Révision du jour.`)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${echapper(resume)}`, 'TRIGGER:PT0S', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return `${lignes.map(plier).join('\r\n')}\r\n`;
}
