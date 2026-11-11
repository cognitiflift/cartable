// Les textes de la rubrique « Cartes » de la Vue parent (spec #235, ticket #236), sans DOM : testés à part.
// Une carte vue par le parent est une ligne de `cartes.lignes` (lib/cartes.js, vueParentCartes).

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export const INTRO_CARTES = 'Les cartes de l’Élève, retournées ou non. La version active est celle qu’il voit.';
export const VIDE_CARTES = 'Aucune carte pour l’instant : elle arrive quand une Leçon devient Acquise.';

// Les repères d'une carte, dans l'ordre où on les lit : son état, puis ce qui la distingue.
export function reperesCarte(c) {
  return [
    { 'face-cachee': 'Face cachée', retournee: 'Retournée', 'en-composition': 'En composition' }[c.statut],
    c.generique && 'Scène générique',
    c.leconSupprimee && 'Leçon supprimée',
  ].filter(Boolean);
}

// Ce que dit l'état à qui se demande pourquoi une carte n'a pas de dessin ou pas de bouton.
export function noteCarte(c) {
  if (c.statut === 'en-composition') return 'Le prof la dessine : elle apparaîtra ici dès qu’elle est prête.';
  if (c.statut === 'face-cachee') return 'L’Élève ne l’a pas encore retournée : changer de version ne la lui montre pas.';
  return null;
}

export const titreVersions = (c) => `Versions (${c.versions.length})`;
export const libelleVersion = (v) => `Version ${v.numero}`;
export const libelleChoisir = (c, v) => `Utiliser la version ${v.numero} de la carte « ${c.titre} »`;
export const libelleCarteParent = (c) => `Carte de la ligne « ${c.titre} », ${c.categorie}, ${pluriel(c.versions.length, 'version')}`;
