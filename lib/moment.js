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
