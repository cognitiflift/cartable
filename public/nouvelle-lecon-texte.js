// Textes de l'écran Nouvelle leçon (spec #115), sans DOM : partagés par l'appli et testés à part.
// Ce module décide de ce que l'écran dit ; l'écran ne fait que le dessiner. Chaque texte attendu est une chaîne
// non vide, jamais `false` ni `null`, pour que rien ne s'affiche comme « false ».

// État de la section d'idées quand la lecture des Propositions a échoué ; les autres états viennent de
// GET …/propositions : « prêtes », « en préparation », « indisponibles ».
export const ECHEC_LECTURE = 'échec de lecture';

const QUOI_FAIRE = "Tu peux choisir ton propre sujet, ou demander d'autres idées.";

// Section « 🎲 Des idées pour toi », d'après l'état des Propositions et le nombre de cartes affichées.
// Renvoie { texte?, autresIdees } : `texte` (absent quand les cartes suffisent) se dit sous les cartes ;
// `autresIdees` dit si « D'autres idées » est proposé, c'est-à-dire si aucune préparation n'est en cours.
export function sectionIdees({ etat, nombreCartes }) {
  if (etat === 'en préparation') {
    return { texte: nombreCartes > 0 ? 'Nouvelles idées en préparation…' : 'On prépare tes idées…', autresIdees: false };
  }
  if (etat === ECHEC_LECTURE) return { texte: `Tes idées n'ont pas pu s'afficher, ce n'est pas de ta faute. ${QUOI_FAIRE}`, autresIdees: true };
  if (nombreCartes === 0) return { texte: `Pas d'idée pour l'instant. ${QUOI_FAIRE}`, autresIdees: true };
  return { autresIdees: true };
}

// Cartouche d'une carte de Proposition, d'après son type. Une suite « prolonge » une ligne du réseau de l'Élève :
// pas « Pour aller plus loin », qui désigne déjà le Dépassement d'une Page de leçon.
export function cartoucheProposition(type) {
  return type === 'suite' ? 'Prolonge ta ligne' : 'Nouveau sujet';
}

// Nombre de colonnes de la grille des Propositions quand la place en tient au plus `maximum` : le plus grand nombre
// qui ne laisse aucune carte seule sur la dernière rangée (5 cartes en 3 + 2 plutôt qu'en 4 + 1), et une seule
// colonne quand aucun ne convient.
export function colonnesPropositions(nombre, maximum) {
  for (let colonnes = Math.min(nombre, maximum); colonnes > 1; colonnes--) {
    if (nombre % colonnes !== 1) return colonnes;
  }
  return 1;
}
