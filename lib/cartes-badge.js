// Versions des cartes de Badge (spec #235, ticket #238) : le stockage et le choix, sans écran. Une version vaut pour la
// Famille entière (ou pour un badge surprise), donc pour tous ses Paliers : l'appli superpose elle-même les stations et le
// Palier, le dessin d'une version ne contient ni stations ni texte.
//
// Stockage, dans le fichier de cartes de l'Espace personnel (à côté de `cartes`, `paliers`, `ecartees`) :
// `badges: { [idFamilleOuSurprise]: { versions: [{ numero, calques, creee }], versionActive } }`. Un fichier sans `badges`
// se lit sans migration : la version 1 est le dessin d'origine, dans le code (`public/carte-badge-art.js`), jamais
// stocké ; `calques` n'est donc non nul que pour une version dessinée par l'agent (#239). `versions` ne raccourcit jamais.
// Choisir une version ne touche ni `paliers` (retournement) ni le reste du fichier.

import { FAMILLES, SURPRISES, PALIERS, PALIER_SURPRISE } from './badges.js';

const iso = (maintenant) => new Date(maintenant).toISOString();
const entree = (fichier, id) => (fichier?.badges && Object.hasOwn(fichier.badges, id) ? fichier.badges[id] : null);
const VERSION_CODE = { numero: 1, calques: null, creee: null, code: true };

// Versions d'un badge : la version 1 (le code) d'abord, puis celles de l'agent, par numéro croissant.
export const versionsDeBadge = (fichier, id) => [VERSION_CODE, ...(entree(fichier, id)?.versions ?? []).map((v) => ({ ...v, code: false }))];

// Numéro de la version active (1 sans choix).
export const versionActiveBadge = (fichier, id) => entree(fichier, id)?.versionActive ?? 1;

// Ajoute une version dessinée (numéro suivant) sans la rendre active ni toucher aux précédentes ; pour la régénération
// (#239). Sans calques : le même fichier.
export function ajouterVersionBadge(fichier, id, calques, maintenant) {
  if (!calques) return fichier;
  const avant = entree(fichier, id);
  const numero = Math.max(...versionsDeBadge(fichier, id).map((v) => v.numero)) + 1;
  const suite = { versions: [...(avant?.versions ?? []), { numero, calques, creee: iso(maintenant) }], versionActive: avant?.versionActive ?? 1 };
  return { ...(fichier ?? { version: 1, livraison: null, son: false, ecartees: [], cartes: {}, paliers: {} }), badges: { ...fichier?.badges, [id]: suite } };
}

// Choix de la version active par le parent : { fichier, statut }. `statut` : choisie, deja (c'est déjà l'active : même
// fichier) ou sans-version (numéro inconnu). L'existence du badge se vérifie avant (server.js).
export function choisirVersionBadge(fichier, id, numero) {
  if (!versionsDeBadge(fichier, id).some((v) => v.numero === numero)) return { fichier, statut: 'sans-version' };
  if (versionActiveBadge(fichier, id) === numero) return { fichier, statut: 'deja' };
  const avant = entree(fichier, id);
  return { fichier: { ...fichier, badges: { ...fichier.badges, [id]: { versions: avant?.versions ?? [], versionActive: numero } } }, statut: 'choisie' };
}

// Ce que voit l'Élève : { [id]: calques } pour chaque badge dont la version active a été dessinée par l'agent. Les autres
// gardent le dessin du code (absents).
export function calquesBadgesActifs(fichier) {
  return Object.fromEntries(Object.entries(fichier?.badges ?? {}).flatMap(([id, e]) => {
    const active = (e.versions ?? []).find((v) => v.numero === (e.versionActive ?? 1));
    return active?.calques ? [[id, active.calques]] : [];
  }));
}

// Ce que la Vue parent montre des cartes de Badge (rubrique « Cartes ») : une entrée par Famille puis par badge surprise,
// y compris les surprises pas encore trouvées (c'est une vue parent : rien n'y reste caché). `badges` : le fichier de
// Badges (lu seulement, null sans). `paliers` : ceux de la Famille, `obtenu` selon le fichier de Badges.
export function vueParentBadges(fichier, badges) {
  const obtenus = badges?.badges ?? {};
  const fiche = ({ id, emoji, nom, phrase }, surprise, paliers) => {
    const active = versionActiveBadge(fichier, id);
    return { id, emoji, nom, phrase, surprise, trouve: paliers.some((p) => p.obtenu), paliers, versionActive: active,
      versions: versionsDeBadge(fichier, id).map((v) => ({ ...v, active: v.numero === active })) };
  };
  return { badges: [
    ...FAMILLES.map((f) => fiche(f, false, f.seuils.map((_, i) => ({ palier: PALIERS[i], obtenu: Boolean(obtenus[f.id]?.[PALIERS[i]]) })))),
    ...SURPRISES.map((s) => fiche(s, true, [{ palier: PALIER_SURPRISE, obtenu: Boolean(obtenus[s.id]?.[PALIER_SURPRISE]) }])),
  ] };
}
