// Textes des récompenses de l'Élève (spec #89), sans DOM : partagés par l'appli et testés à part.

// Seul Palier des badges surprise (PALIER_SURPRISE dans lib/badges.js) : il ne se dit pas.
export const PALIER_SURPRISE = 'unique';

// Badge et Palier tels qu'on les écrit : « Régulier, argent » ; un badge surprise, par son seul nom.
export const nomEtPalier = ({ nom, palier }) => (palier === PALIER_SURPRISE ? nom : `${nom}, ${palier}`);

// Les 3 Étoiles nommées d'une Leçon de révision.
const ETOILES_NOMMEES = [['quiz', 'Quiz réussi'], ['bonus', 'Questions bonus réussies'], ['defi', 'Défi réussi']];

// Récompenses sur la carte d'une Leçon, en morceaux { texte, titre?, classe? } : en Leçon libre « ⭐ n » (même à 0),
// en Leçon de révision « ☆☆☆ » (chaque Étoile nommée pleine ou vide) ; puis « · 🚀 n » s'il y a des Fusées.
export function morceauxRecompensesLecon({ mode, etoiles, fusees }) {
  const morceaux = mode === 'libre'
    ? [{ texte: `⭐ ${etoiles ?? 0}`, titre: 'Pages réussies' }]
    : ETOILES_NOMMEES.map(([cle, titre]) => ({ texte: etoiles?.[cle] ? '⭐' : '☆', titre, classe: etoiles?.[cle] ? 'pleine' : 'vide' }));
  if (fusees > 0) morceaux.push({ texte: ' · ' }, { texte: `🚀 ${fusees}`, titre: 'Dépassements réussis', classe: 'fusees' });
  return morceaux;
}
