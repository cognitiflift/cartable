// La carte de Badge à l'écran (spec #182, ticket #186), sans DOM : choix du Palier montré, textes de la face et du dos,
// crans, feuille holographique. Partagé par l'appli et testé à part. Aucun chiffre ni pourcentage : le prochain Palier
// se dit en mots, et la ligne de Badge reste la seule jauge.
//
// Un badge est celui de `collection` dans GET …/badges : { id, emoji, nom, phrase?, surprise?, palier, jour?, paliers,
// prochain, avance }.

export const PALIERS = ['bronze', 'argent', 'or', 'diamant'];

// Les Paliers qui ont une feuille holographique.
export const PALIERS_HOLO = ['or', 'diamant'];
export const aFeuilleHolo = (b) => !b.surprise && PALIERS_HOLO.includes(b.palier);

// Le rang du Palier montré, de 1 à 4 (une surprise est au sommet : 4), qui enrichit le dessin.
export const rangDeCarte = (b) => (b.surprise ? 4 : Math.max(1, PALIERS.indexOf(b.palier) + 1));

// Les crans du bas de la carte : un par Palier de la Famille, allumés jusqu'au Palier atteint (une surprise : un seul).
export function crans(b) {
  if (b.surprise) return [true];
  const total = b.paliers?.length ?? 0;
  const atteints = (b.paliers ?? []).filter((p) => p.jour).length;
  return Array.from({ length: total }, (_, i) => i < atteints);
}

export const motsPalier = (b) => (b.surprise ? 'badge surprise' : `Palier ${b.palier}`);

// Le jour où le Palier montré a été gagné.
export const jourDeCarte = (b) => (b.surprise ? b.jour : b.paliers?.find((p) => p.palier === b.palier)?.jour) ?? null;

// Le prochain Palier en mots, sans chiffre.
export function prochainEnMots(b) {
  if (b.surprise) return 'Un badge surprise, unique.';
  return b.prochain ? `Prochain Palier : ${b.prochain.palier}.` : 'Tous les Paliers sont obtenus.';
}

// `dire(jour)` met le jour en mots (« le 11 novembre 2026 »).
export function libelleCarteBadge(b, dire, nouveau = false) {
  const jour = jourDeCarte(b);
  return `${b.nom}, ${motsPalier(b)}${jour ? `, obtenu ${dire(jour)}` : ''}${nouveau ? ' (nouveau)' : ''}. ${b.phrase ?? ''}`.trim();
}

export const libelleADecouvrir = (b) => `${b.nom}, à découvrir. ${b.phrase ?? ''}`.trim();

// Le dos : ce que le Badge salue, la date de gain, le prochain Palier.
export function dosCarteBadge(b, dire) {
  const jour = jourDeCarte(b);
  return {
    cartouche: b.surprise ? 'unique' : b.palier, nom: b.nom,
    salue: b.phrase ?? 'Trouvé sans le chercher.',
    date: jour ? `Obtenu ${dire(jour)}.` : '', prochain: prochainEnMots(b),
  };
}

// La grille « Mes Badges » : une carte par Famille commencée (au Palier le plus haut), le dernier Palier gagné en
// premier, puis les surprises trouvées. « À découvrir » : les Familles sans Palier ; les surprises non trouvées ne sont
// jamais dans la collection, donc restent cachées.
export function rangerCollection(collection) {
  const dernierJour = (b) => b.paliers.filter((p) => p.jour).at(-1).jour;
  const obtenues = collection.filter((b) => !b.surprise && b.palier).sort((x, y) => dernierJour(y).localeCompare(dernierJour(x)));
  const surprises = collection.filter((b) => b.surprise).sort((x, y) => y.jour.localeCompare(x.jour));
  return { obtenues: [...obtenues, ...surprises], aDecouvrir: collection.filter((b) => !b.surprise && !b.palier) };
}
