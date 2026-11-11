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
export const libelleBadgeParent = (b) => `Carte de Badge « ${b.nom} », ${pluriel(b.versions.length, 'version')}, version ${b.versionActive} active${b.regeneration ? ', nouvelle version en cours' : ''}`;

// Régénération (ticket #239) : « Régénérer » demande un nouveau dessin, qui s'ajoute à la galerie sans changer la version
// active et vaut pour tous les Paliers. Mêmes mots que pour une carte de ligne (carte-parent-texte.js).
export const libelleRegenererBadge = (b) => `Régénérer la carte de Badge « ${b.nom} » : un nouveau dessin s’ajoute aux versions, pour tous ses Paliers`;
export const badgeRegenerationAbandonnee = (b) => !b.regeneration && Boolean(b.echecRegeneration);
export const NOTE_REGENERATION_BADGE = 'Une nouvelle version est en cours : elle arrivera dans la galerie, la version active ne change pas.';
export const NOTE_ABANDON_BADGE = 'Nouvelle version abandonnée après deux essais ratés. La version active n’a pas changé.';
export const notesRegenerationBadge = (b) => [b.regeneration && NOTE_REGENERATION_BADGE, badgeRegenerationAbandonnee(b) && NOTE_ABANDON_BADGE].filter(Boolean);
