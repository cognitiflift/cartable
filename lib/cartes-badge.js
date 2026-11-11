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
const FICHIER_VIDE = { version: 1, livraison: null, son: false, ecartees: [], cartes: {}, paliers: {} };
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
  const suite = { ...avant, versions: [...(avant?.versions ?? []), { numero, calques, creee: iso(maintenant) }], versionActive: avant?.versionActive ?? 1 };
  return { ...(fichier ?? FICHIER_VIDE), badges: { ...fichier?.badges, [id]: suite } };
}

// Choix de la version active par le parent : { fichier, statut }. `statut` : choisie, deja (c'est déjà l'active : même
// fichier) ou sans-version (numéro inconnu). L'existence du badge se vérifie avant (server.js).
export function choisirVersionBadge(fichier, id, numero) {
  if (!versionsDeBadge(fichier, id).some((v) => v.numero === numero)) return { fichier, statut: 'sans-version' };
  if (versionActiveBadge(fichier, id) === numero) return { fichier, statut: 'deja' };
  const avant = entree(fichier, id);
  return { fichier: { ...fichier, badges: { ...fichier.badges, [id]: { ...avant, versions: avant?.versions ?? [], versionActive: numero } } }, statut: 'choisie' };
}

// Régénération (spec #235, ticket #239), même cycle que celle d'une carte de ligne (lib/cartes.js) : `regeneration` :
// { etat: 'demandee' | 'en-cours', essais } tant qu'un tour est attendu ou travaille ; `echecRegeneration` : date ISO du
// dernier abandon, après deux essais ratés (effacée à la demande suivante) ; `couts` : les tours « carteBadge », réussis
// ou non, gardés avec le badge. Un tour réussi AJOUTE une version sans changer l'active ; un abandon ne touche à rien d'autre
// (jamais de dessin de repli : la version 1 est déjà le dessin du code). Le serveur ne lance qu'un tour de carte à la fois
// par Élève, badges et cartes de ligne confondus (server.js, composerCartes).
export const ESSAIS_MAX_BADGE = 2;
const avecEntree = (fichier, id, suite) => ({ ...(fichier ?? FICHIER_VIDE), badges: { ...fichier?.badges, [id]: suite } });

// Demande de régénération : { fichier, statut }. `statut` : demandee, ou deja (une est déjà demandée ou en cours : même
// fichier). L'existence du badge se vérifie avant (server.js).
export function demanderRegenerationBadge(fichier, id) {
  const avant = entree(fichier, id);
  if (avant?.regeneration) return { fichier, statut: 'deja' };
  const { echecRegeneration: _, ...reste } = avant ?? {};
  return { fichier: avecEntree(fichier, id, { versions: [], versionActive: 1, ...reste, regeneration: { etat: 'demandee', essais: 0 } }), statut: 'demandee' };
}

// Identifiant du premier badge dont une régénération est demandée, null sans.
export const prochainBadgeARegenerer = (fichier) => Object.entries(fichier?.badges ?? {}).find(([, e]) => e.regeneration?.etat === 'demandee')?.[0] ?? null;

// Début d'un tour : « en cours », un essai de plus. Sans effet si elle n'est pas « demandée ».
export function commencerRegenerationBadge(fichier, id) {
  const avant = entree(fichier, id);
  if (avant?.regeneration?.etat !== 'demandee') return fichier;
  return avecEntree(fichier, id, { ...avant, regeneration: { etat: 'en-cours', essais: avant.regeneration.essais + 1 } });
}

// Tour réussi : une version de plus, non activée. Sans effet si aucune régénération n'est « en cours ».
export function terminerRegenerationBadge(fichier, id, calques, maintenant) {
  const avant = entree(fichier, id);
  if (avant?.regeneration?.etat !== 'en-cours') return fichier;
  const { regeneration: _, ...reste } = avant;
  return ajouterVersionBadge(avecEntree(fichier, id, reste), id, calques, maintenant);
}

// Tour raté : redemandé tant qu'il reste un essai ; au deuxième échec, abandon (version active inchangée) et
// `echecRegeneration` avertit le parent. Sans effet si aucune régénération n'est « en cours ».
export function echouerRegenerationBadge(fichier, id, maintenant) {
  const avant = entree(fichier, id);
  if (avant?.regeneration?.etat !== 'en-cours') return fichier;
  const { regeneration, ...reste } = avant;
  return avecEntree(fichier, id, regeneration.essais >= ESSAIS_MAX_BADGE ? { ...reste, echecRegeneration: iso(maintenant) } : { ...reste, regeneration: { ...regeneration, etat: 'demandee' } });
}

// Au redémarrage, une régénération interrompue redevient « demandée » (ses essais restent comptés).
export function reprendreRegenerationsBadge(fichier) {
  const interrompue = ([, e]) => e.regeneration?.etat === 'en-cours';
  if (!Object.entries(fichier?.badges ?? {}).some(interrompue)) return fichier;
  return { ...fichier, badges: Object.fromEntries(Object.entries(fichier.badges).map(([id, e]) => [id, interrompue([id, e]) ? { ...e, regeneration: { ...e.regeneration, etat: 'demandee' } } : e])) };
}

// Coût d'un tour « carteBadge » (coutDuTour), gardé avec le badge, daté. Sans coût connu : le même fichier.
export function ajouterCoutBadge(fichier, id, cout, maintenant) {
  if (!Number.isFinite(cout?.coutUsd)) return fichier;
  const avant = entree(fichier, id);
  return avecEntree(fichier, id, { versions: [], versionActive: 1, ...avant, couts: [...(avant?.couts ?? []), { date: iso(maintenant), ...cout }] });
}

// Les tours « carteBadge » gardés dans `couts` entrent dans le Coût de l'Élève (store.lireCouts).

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
    const e = entree(fichier, id);
    const coutUsd = Math.round((e?.couts ?? []).reduce((n, c) => n + (c.coutUsd ?? 0), 0) * 1e6) / 1e6;
    return { id, emoji, nom, phrase, surprise, trouve: paliers.some((p) => p.obtenu), paliers, versionActive: active,
      regeneration: Boolean(e?.regeneration), echecRegeneration: Boolean(e?.echecRegeneration), cout: { coutUsd, tours: (e?.couts ?? []).length },
      versions: versionsDeBadge(fichier, id).map((v) => ({ ...v, active: v.numero === active })) };
  };
  return { badges: [
    ...FAMILLES.map((f) => fiche(f, false, f.seuils.map((_, i) => ({ palier: PALIERS[i], obtenu: Boolean(obtenus[f.id]?.[PALIERS[i]]) })))),
    ...SURPRISES.map((s) => fiche(s, true, [{ palier: PALIER_SURPRISE, obtenu: Boolean(obtenus[s.id]?.[PALIER_SURPRISE]) }])),
  ] };
}
