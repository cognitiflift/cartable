// Jours calendaires locaux (spec #47, tickets #66 et #68) : l'appli tourne chez l'Élève, ses jours sont ceux de
// l'heure locale de la machine, pas de l'UTC. Une Question répondue hier à 16 h est due dès ce matin ; la veille d'un
// contrôle commence à minuit, heure locale. Module pur : la date « maintenant » est toujours reçue.

const JOUR_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Jour local de `instant` (ms ou Date) au format AAAA-MM-JJ.
export const jourLocal = (instant) => {
  const d = new Date(instant);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
};

// Date ISO lisible (texte que Date.parse comprend) : true ou false. Les dates illisibles sont écartées partout.
export const dateValide = (date) => typeof date === 'string' && !Number.isNaN(Date.parse(date));

// Jour local (AAAA-MM-JJ) d'une date ISO lisible (voir dateValide).
export const jourDe = (date) => jourLocal(Date.parse(date));

// Début et fin (ms) du jour local de `instant`.
export const debutDuJour = (instant) => new Date(instant).setHours(0, 0, 0, 0);
export const finDuJour = (instant) => new Date(instant).setHours(23, 59, 59, 999);

// Date AAAA-MM-JJ qui existe au calendrier (pas de 13e mois ni de 30 février) : true ou false.
export function jourValide(texte) {
  const [, annee, mois, jour] = (typeof texte === 'string' && texte.match(JOUR_RE)) || [];
  if (!annee) return false;
  const d = new Date(Number(annee), Number(mois) - 1, Number(jour));
  return d.getFullYear() === Number(annee) && d.getMonth() === Number(mois) - 1 && d.getDate() === Number(jour);
}

const JOUR_MS = 86_400_000;

// Jours locaux de `instant` jusqu'à la date AAAA-MM-JJ (0 le jour même, négatif une fois passée) ; null si invalide.
export const joursAvant = (texte, instant) => (jourValide(texte) ? Math.round((minuitDu(texte) - debutDuJour(instant)) / JOUR_MS) : null);

// Minuit local (ms) du jour `decalage` jours après la date AAAA-MM-JJ ; NaN pour une date invalide (voir jourValide).
export function minuitDu(texte, decalage = 0) {
  if (!jourValide(texte)) return NaN;
  const [annee, mois, jour] = texte.split('-').map(Number);
  return new Date(annee, mois - 1, jour + decalage).getTime();
}
