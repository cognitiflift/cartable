// La carte de ligne à l'écran (spec #182, ticket #185), sans DOM : textes et stations, partagés par
// l'appli et testés à part.
//
// Une carte de ligne est celle que renvoie GET …/badges dans `cartesLigne` :
// { lecon, titre, categorie, objectifs, jourAcquisition, etat, calques: { l1, l2, heros }, retourne, … }.
// `calques` : trois chaînes SVG (viewBox 0 0 200 280), déjà filtrées par le serveur (une scène générique aussi).

export { cleCategorieCarte } from './categories-carte.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Les Objectifs d'une carte, pour `ligneLecon` : une station par Objectif, tous Retenus (la Leçon est Acquise). La
// carte ne garde que leur nombre ; une carte sans compte garde une station, pour que la ligne existe.
export function objectifsDeCarte(nombre) {
  return Array.from({ length: Math.max(1, nombre ?? 0) }, (_, i) => ({ texte: `Objectif ${i + 1}`, atteint: true, retenu: true }));
}

// `dire(jour)` met le jour en mots (« le 11 novembre 2026 »).
export function libelleCarteLigne(c, dire) {
  return `Carte de la ligne « ${c.titre} », ${c.categorie} : Leçon acquise ${dire(c.jourAcquisition)}, ${pluriel(c.objectifs, 'Objectif')} Retenu${c.objectifs > 1 ? 's' : ''}.`;
}

// Le dos : ce que la carte salue, sans chiffre ni pourcentage.
export const dosCarteLigne = (c, dire) => ({
  cartouche: c.categorie, nom: c.titre,
  salue: 'Tous les Objectifs sont Retenus : la ligne est allée jusqu\'au terminus.',
  date: `Acquise ${dire(c.jourAcquisition)}.`,
});

// Les calques viennent toujours du serveur (carte prête ou scène générique composée par lib/carte-generique.js) : une carte
// sans les trois calques est un défaut, qui échoue visiblement plutôt que de s'afficher dessinée autrement.
export function calquesDeCarte(c) {
  if (c.calques?.l1 && c.calques?.l2 && c.calques?.heros) return c.calques;
  throw new Error(`Carte « ${c.titre} » sans calques : le serveur doit les fournir`);
}
