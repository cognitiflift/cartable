// Les textes des cartes de Badge dans la rubrique « Cartes » de la Vue parent (spec #235, ticket #238), sans DOM : testés à
// part. Un badge vu par le parent est une entrée de `cartes.badges` (lib/cartes-badge.js, vueParentBadges).

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export const TITRE_BADGES = 'Cartes de Badge';
export const INTRO_BADGES = 'Un dessin par Badge, le même à tous ses Paliers : l’appli y ajoute les stations et le Palier. Tu vois aussi les badges surprise que l’Élève n’a pas encore trouvés ; lui ne les voit pas.';

// Les repères d'un badge, dans l'ordre où on les lit : ce qu'il en est pour l'Élève, puis la version active.
export function reperesBadge(b) {
  const obtenus = b.paliers.filter((p) => p.obtenu);
  const etat = b.surprise
    ? (b.trouve ? 'Surprise trouvée' : 'Surprise pas encore trouvée')
    : (obtenus.length ? `Palier ${obtenus.at(-1).palier}` : 'Pas encore commencé');
  return [etat, `Version ${b.versionActive} active`];
}

// Ce que dit l'état à qui se demande si le choix sera vu.
export function noteBadge(b) {
  if (!b.trouve) return b.surprise
    ? 'Pas encore trouvée : il la verra avec ce dessin le jour où il la trouve.'
    : 'Rien d’obtenu pour l’instant : il verra cette carte avec ce dessin dès son premier Palier.';
  return null;
}

export const titreVersionsBadge = (b) => `Versions (${b.versions.length})`;
export const libelleVersionBadge = (v) => `Version ${v.numero}`;
export const origineVersion = (v) => (v.code ? 'Dessin d’origine' : 'Dessinée par le prof');
export const libellePalierApercu = (p) => (p === 'unique' ? 'Surprise' : p[0].toUpperCase() + p.slice(1));
export const libelleChoisirBadge = (b, v) => `Utiliser la version ${v.numero} de la carte de Badge « ${b.nom} », pour tous ses Paliers`;
export const libelleBadgeParent = (b) => `Carte de Badge « ${b.nom} », ${pluriel(b.versions.length, 'version')}, version ${b.versionActive} active`;
