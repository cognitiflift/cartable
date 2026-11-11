// Cartes à collectionner (spec #182, ticket #183) : le moteur des cartes de ligne et le retournement des cartes, sans
// écran. Une Leçon (libre ou de révision) qui atteint « acquis » pour la première fois donne une carte de ligne
// « à composer » ; elle est définitive, comme un Palier : elle reste à l'Élève si la Leçon redescend ou est supprimée.
// Module pur : il reçoit les Leçons lues, le fichier de Badges et la date « maintenant » (ms).
//
// Fichier de cartes de l'Espace personnel (à côté de badges.json, sans rien y changer) :
// { version, livraison, son, ecartees, cartes, paliers }.
// - `livraison` : date ISO du premier calcul, qui marque la livraison des cartes (null tant que le fichier n'a été créé
//   que par le réglage du carillon) ;
// - `cout` d'une carte : Coût cumulé de ses tours « carte » { coutUsd, tours }, gardé même si la Leçon est supprimée ;
// - `son` : réglage du carillon (éteint tant que l'Élève ne l'a pas activé) ;
// - `ecartees` : Leçons déjà Acquises à la livraison, écartées une fois pour toutes (jamais de carte) ;
// - `cartes` : une carte de ligne par Leçon, { lecon, titre, categorie, objectifs, jourAcquisition, etat, essais, calques,
//   prete, retourne, versions?, versionActive? }. `calques` est toujours ceux de la version active (voir « Versions de
//   carte » plus bas). `etat` : a-composer, en-composition, prete ou generique ; `essais` : tentatives de composition,
//   deux au plus ; `retourne` : date ISO du retournement (null tant que la carte attend face cachée) ;
// - `paliers` : « id/palier » → { retourne }. Les Paliers déjà gagnés à la livraison ont `retourne` à la date de
//   livraison (visibles d'emblée) ; ceux gagnés ensuite l'ont à null jusqu'au retournement.

import { jourLocal } from './jour.js';
import { sceneGenerique } from './carte-generique.js';

export const ESSAIS_MAX = 2;
const iso = (maintenant) => new Date(maintenant).toISOString();
const clePalier = (id, palier) => `${id}/${palier}`;
const estAcquise = (lecon) => lecon.maitrise?.palier === 'acquis';
const toutesLesCles = (badges) => Object.entries(badges?.badges ?? {}).flatMap(([id, paliers]) => Object.keys(paliers).map((palier) => clePalier(id, palier)));

// Fusion des Leçons lues et du fichier de Badges (déjà fusionné) avec le fichier de cartes (null : jamais calculé) à
// `maintenant` : { fichier, nouvelles }. `nouvelles` : identifiants des Leçons dont une carte « à composer » vient d'être
// enregistrée. Premier calcul (fichier absent, ou créé par le seul réglage du carillon, sans livraison) : les Leçons
// Acquises sont écartées, les Paliers existants visibles d'emblée. Le serveur le fait AVANT l'événement en cours
// (server.js, fixerLivraison) : une Acquisition survenue ensuite, même au tout premier quiz, donne sa carte.
// Rien de nouveau : le même fichier, à ne pas réécrire.
export function fusionnerCartes(fichier, { lecons, badges, maintenant }) {
  const date = iso(maintenant);
  const premier = fichier === null || fichier === undefined || fichier.livraison == null;
  const avant = premier ? { version: 1, son: false, ecartees: [], cartes: {}, paliers: {}, ...fichier, livraison: date } : fichier;
  const ecartees = premier ? lecons.filter(estAcquise).map((l) => l.id) : [];
  const dues = premier ? [] : lecons.filter((l) => estAcquise(l) && !avant.ecartees.includes(l.id) && !Object.hasOwn(avant.cartes, l.id));
  const cles = toutesLesCles(badges).filter((cle) => !Object.hasOwn(avant.paliers, cle));
  if (!premier && !dues.length && !cles.length) return { fichier, nouvelles: [] };
  const cartes = { ...avant.cartes };
  for (const l of dues) {
    cartes[l.id] = {
      lecon: l.id, titre: l.titre, categorie: l.categorie, objectifs: (l.objectifs ?? []).length, jourAcquisition: jourLocal(maintenant),
      etat: 'a-composer', essais: 0, calques: null, prete: null, retourne: null,
    };
  }
  const paliers = { ...avant.paliers };
  for (const cle of cles) paliers[cle] = { retourne: premier ? date : null };
  return { fichier: { ...avant, ecartees: [...avant.ecartees, ...ecartees], cartes, paliers }, nouvelles: dues.map((l) => l.id) };
}

// Début d'une tentative de composition : « en composition », un essai de plus. Refusée (même fichier) au-delà de deux
// essais, ou si la carte n'est pas « à composer ».
export function commencerComposition(fichier, id) {
  const carte = fichier.cartes[id];
  if (!carte || carte.etat !== 'a-composer' || carte.essais >= ESSAIS_MAX) return fichier;
  return { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, etat: 'en-composition', essais: carte.essais + 1 } } };
}

// Identifiant de la plus ancienne carte « à composer » (une seule composition à la fois, voir server.js), null sans.
export function prochaineAComposer(fichier) {
  return Object.values(fichier?.cartes ?? {}).find((c) => c.etat === 'a-composer' && c.essais < ESSAIS_MAX)?.lecon ?? null;
}

// Composition réussie : la carte est prête avec ses calques tels que filtrés (lib/carte-svg.js). Sans effet (même
// fichier) si la carte n'est pas « en composition ».
export function terminerComposition(fichier, id, calques, maintenant) {
  const carte = fichier.cartes[id];
  if (carte?.etat !== 'en-composition') return fichier;
  return { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, etat: 'prete', calques, prete: iso(maintenant) } } };
}

// Tentative échouée (réponse illisible, SVG refusé, panne de l'agent) : la carte redevient « à composer » tant qu'il
// reste un essai ; au deuxième échec elle reçoit sa scène générique, composée en code (lib/carte-generique.js), sans
// nouvel appel à l'agent. Sans effet si la carte n'est pas « en composition ».
export function echouerComposition(fichier, id, maintenant) {
  const carte = fichier.cartes[id];
  if (carte?.etat !== 'en-composition') return fichier;
  const suite = carte.essais >= ESSAIS_MAX
    ? { etat: 'generique', calques: sceneGenerique({ lecon: carte.lecon, categorie: carte.categorie }), prete: iso(maintenant) }
    : { etat: 'a-composer' };
  return { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, ...suite } } };
}

// Une carte « à composer » dont les deux essais sont épuisés (la seconde tentative a été interrompue par un
// redémarrage) reçoit sa scène générique, sans nouvel appel à l'agent.
export function generiquesEpuisees(fichier, maintenant) {
  const epuisees = Object.values(fichier.cartes).filter((c) => c.etat === 'a-composer' && c.essais >= ESSAIS_MAX);
  if (!epuisees.length) return fichier;
  const cartes = { ...fichier.cartes };
  for (const c of epuisees) cartes[c.lecon] = { ...c, etat: 'generique', calques: sceneGenerique({ lecon: c.lecon, categorie: c.categorie }), prete: iso(maintenant) };
  return { ...fichier, cartes };
}

// Au redémarrage, une composition interrompue redevient « à composer » (ses essais restent comptés), une régénération
// interrompue redevient « demandée » (voir « Régénération » plus bas).
export function reprendreCompositions(fichier) {
  const interrompue = (c) => c.etat === 'en-composition' || c.regeneration?.etat === 'en-cours';
  if (!Object.values(fichier.cartes).some(interrompue)) return fichier;
  const reprise = (c) => ({
    ...c,
    ...(c.etat === 'en-composition' && { etat: 'a-composer' }),
    ...(c.regeneration?.etat === 'en-cours' && { regeneration: { ...c.regeneration, etat: 'demandee' } }),
  });
  return { ...fichier, cartes: Object.fromEntries(Object.entries(fichier.cartes).map(([id, c]) => [id, interrompue(c) ? reprise(c) : c])) };
}

const estPrete = (carte) => carte.etat === 'prete' || carte.etat === 'generique';

// Cartes à retourner : cartes de ligne prêtes (ou génériques) pas encore retournées, puis Paliers gagnés après la
// livraison pas encore retournés. [{ type: 'ligne', id }, { type: 'palier', id, palier }].
export function aRetourner(fichier) {
  if (!fichier) return [];
  const lignes = Object.values(fichier.cartes).filter((c) => estPrete(c) && !c.retourne).map((c) => ({ type: 'ligne', id: c.lecon }));
  const paliers = Object.entries(fichier.paliers).filter(([, p]) => !p.retourne).map(([cle]) => {
    const i = cle.lastIndexOf('/');
    return { type: 'palier', id: cle.slice(0, i), palier: cle.slice(i + 1) };
  });
  return [...lignes, ...paliers];
}

// Retournement d'une carte, { type: 'ligne', id } ou { type: 'palier', id, palier }, à `maintenant` :
// { fichier, statut }. `statut` : retournee, deja (idempotent : même fichier), pas-prete (carte de ligne pas encore
// composée) ou introuvable.
export function retournerCarte(fichier, { type, id, palier }, maintenant) {
  const date = iso(maintenant);
  if (type === 'ligne') {
    const carte = Object.hasOwn(fichier.cartes, id) ? fichier.cartes[id] : null;
    if (!carte) return { fichier, statut: 'introuvable' };
    if (carte.retourne) return { fichier, statut: 'deja' };
    if (!estPrete(carte)) return { fichier, statut: 'pas-prete' };
    return { fichier: { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, retourne: date } } }, statut: 'retournee' };
  }
  if (type === 'palier') {
    const cle = clePalier(id, palier);
    if (!Object.hasOwn(fichier.paliers, cle)) return { fichier, statut: 'introuvable' };
    if (fichier.paliers[cle].retourne) return { fichier, statut: 'deja' };
    return { fichier: { ...fichier, paliers: { ...fichier.paliers, [cle]: { retourne: date } } }, statut: 'retournee' };
  }
  return { fichier, statut: 'introuvable' };
}

// Coût d'un tour « carte » (coutDuTour), ajouté à la carte : il survit à la suppression de la Leçon. Carte absente :
// le même fichier.
export function ajouterCoutCarte(fichier, id, cout) {
  const carte = fichier && Object.hasOwn(fichier.cartes, id) ? fichier.cartes[id] : null;
  if (!carte || !Number.isFinite(cout?.coutUsd)) return fichier;
  const avant = carte.cout ?? { coutUsd: 0, tours: 0 };
  return { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, cout: { coutUsd: Math.round((avant.coutUsd + cout.coutUsd) * 1e6) / 1e6, tours: avant.tours + 1 } } } };
}

// Réglage du carillon (éteint par défaut), écrit depuis le Profil : un booléen, rien d'autre ne change. Sans fichier,
// il est créé sans livraison (le premier calcul la fixera). Toute autre valeur : le même fichier.
export function reglerSon(fichier, son) {
  if (typeof son !== 'boolean') return fichier;
  if (!fichier) return { version: 1, livraison: null, son, ecartees: [], cartes: {}, paliers: {} };
  return fichier.son === son ? fichier : { ...fichier, son };
}

// Ce que Mes badges renvoie des cartes (fichier null : réponse vide mais valide) : { cartesLigne, aRetourner, son }.
// `cartesLigne` : de la plus récente à la plus ancienne ; les calques ne sont montrés que pour une carte prête ou
// générique.
export function vueCartes(fichier) {
  if (!fichier) return { cartesLigne: [], aRetourner: [], son: false };
  const cartesLigne = Object.values(fichier.cartes).reverse()
    .sort((x, y) => y.jourAcquisition.localeCompare(x.jourAcquisition))
    .map((c) => (estPrete(c) ? c : { ...c, calques: null }));
  return { cartesLigne, aRetourner: aRetourner(fichier), son: fichier.son === true };
}

// Versions de carte (spec #235, ticket #236). Une carte de ligne a une galerie de versions : la carte existante est la
// version 1, active. Un fichier écrit avant les versions se lit sans migration : `versions` est absent, la version 1 se
// déduit de `calques` (elle n'existe qu'une fois la carte prête ou générique). `versions` : [{ numero, calques, creee,
// generique }], par numéro croissant, jamais raccourci ; `versionActive` : le numéro vu par l'Élève, dont les calques
// sont recopiés dans `calques` (tout ce qui montre la carte à l'Élève lit `calques`, rien d'autre à changer). Choisir une
// version ne touche ni `retourne` ni `etat`.

// Versions d'une carte, dérivées si le fichier est ancien : [] tant que la carte n'a pas de dessin.
export function versionsDeCarte(carte) {
  if (Array.isArray(carte.versions)) return carte.versions;
  if (!carte.calques) return [];
  return [{ numero: 1, calques: carte.calques, creee: carte.prete ?? null, generique: carte.etat === 'generique' }];
}

// Numéro de la version active, null sans version.
export const versionActive = (carte) => (versionsDeCarte(carte).length ? carte.versionActive ?? 1 : null);

// Ajoute une version (numéro suivant) sans la rendre active ni toucher aux précédentes ; pour la régénération (#237). Carte
// sans dessin ou absente : le même fichier.
export function ajouterVersion(fichier, id, calques, maintenant) {
  const carte = fichier && Object.hasOwn(fichier.cartes, id) ? fichier.cartes[id] : null;
  if (!carte || !calques) return fichier;
  const avant = versionsDeCarte(carte);
  if (!avant.length) return fichier;
  const version = { numero: Math.max(...avant.map((v) => v.numero)) + 1, calques, creee: iso(maintenant), generique: false };
  return { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, versions: [...avant, version], versionActive: versionActive(carte) } } };
}

// Choix de la version active par le parent : { fichier, statut }. `statut` : choisie, deja (c'est déjà l'active : même
// fichier), introuvable (carte inconnue) ou sans-version (carte sans dessin, ou numéro inconnu).
export function choisirVersion(fichier, id, numero) {
  const carte = fichier && Object.hasOwn(fichier.cartes, id) ? fichier.cartes[id] : null;
  if (!carte) return { fichier, statut: 'introuvable' };
  const versions = versionsDeCarte(carte);
  const voulue = versions.find((v) => v.numero === numero);
  if (!voulue) return { fichier, statut: 'sans-version' };
  if (versionActive(carte) === numero) return { fichier, statut: 'deja' };
  return { fichier: { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, versions, versionActive: numero, calques: voulue.calques } } }, statut: 'choisie' };
}

// Régénération (spec #235, ticket #237) : le parent demande un nouveau dessin d'une carte, en un clic. `regeneration` :
// { etat: 'demandee' | 'en-cours', essais } tant qu'un tour est attendu ou travaille (absent sinon) ; `echecRegeneration` :
// date ISO du dernier abandon, après deux essais ratés (effacée à la demande suivante). Un tour réussi AJOUTE une version
// sans changer l'active ; un abandon ne touche à rien d'autre (jamais de scène générique). Une carte sans dessin (« à
// composer ») qui est régénérée reçoit son premier dessin, qui devient sa version 1 active. Le serveur ne lance qu'un tour
// de carte à la fois par Élève (server.js, composerCartes).

// Demande de régénération : { fichier, statut }. `statut` : demandee, deja (une est déjà demandée ou en cours, ou la
// carte est en cours de première composition : même fichier), introuvable, lecon-supprimee (pas de bouton : même fichier).
export function demanderRegeneration(fichier, id, leconsExistantes) {
  const carte = fichier && Object.hasOwn(fichier.cartes, id) ? fichier.cartes[id] : null;
  if (!carte) return { fichier, statut: 'introuvable' };
  if (!leconsExistantes.includes(id)) return { fichier, statut: 'lecon-supprimee' };
  if (carte.regeneration || carte.etat === 'en-composition') return { fichier, statut: 'deja' };
  const { echecRegeneration: _, ...reste } = carte;
  return { fichier: { ...fichier, cartes: { ...fichier.cartes, [id]: { ...reste, regeneration: { etat: 'demandee', essais: 0 } } } }, statut: 'demandee' };
}

// Identifiant de la plus ancienne carte dont une régénération est demandée, null sans.
export const prochaineARegenerer = (fichier) => Object.values(fichier?.cartes ?? {}).find((c) => c.regeneration?.etat === 'demandee')?.lecon ?? null;

// Début d'un tour de régénération : « en cours », un essai de plus. Sans effet si elle n'est pas « demandée ».
export function commencerRegeneration(fichier, id) {
  const carte = fichier.cartes[id];
  if (carte?.regeneration?.etat !== 'demandee') return fichier;
  return { ...fichier, cartes: { ...fichier.cartes, [id]: { ...carte, regeneration: { etat: 'en-cours', essais: carte.regeneration.essais + 1 } } } };
}

// Tour réussi : une version de plus, non activée (sauf pour une carte sans dessin, dont c'est le premier). Sans effet si
// aucune régénération n'est « en cours ».
export function terminerRegeneration(fichier, id, calques, maintenant) {
  const carte = fichier.cartes[id];
  if (carte?.regeneration?.etat !== 'en-cours') return fichier;
  const { regeneration: _, ...reste } = carte;
  const sans = { ...fichier, cartes: { ...fichier.cartes, [id]: reste } };
  if (versionsDeCarte(reste).length) return ajouterVersion(sans, id, calques, maintenant);
  return terminerComposition({ ...sans, cartes: { ...sans.cartes, [id]: { ...reste, etat: 'en-composition' } } }, id, calques, maintenant);
}

// Tour raté : redemandé tant qu'il reste un essai ; au deuxième échec, abandon (la version active ne change pas, aucune
// scène générique) et `echecRegeneration` avertit le parent. Sans effet si aucune régénération n'est « en cours ».
export function echouerRegeneration(fichier, id, maintenant) {
  const carte = fichier.cartes[id];
  if (carte?.regeneration?.etat !== 'en-cours') return fichier;
  const { regeneration, ...reste } = carte;
  const suite = regeneration.essais >= ESSAIS_MAX ? { ...reste, echecRegeneration: iso(maintenant) } : { ...reste, regeneration: { ...regeneration, etat: 'demandee' } };
  return { ...fichier, cartes: { ...fichier.cartes, [id]: suite } };
}

// Ce que la Vue parent montre des cartes de ligne (rubrique « Cartes ») : toutes, Leçon supprimée comprise, retournées ou
// non, de la plus récente à la plus ancienne. `statut` : en-composition (pas encore de dessin), face-cachee ou retournee ;
// `generique` : la version active est une scène de repli. `leconsExistantes` : identifiants des Leçons encore là.
export function vueParentCartes(fichier, leconsExistantes) {
  const lignes = Object.values(fichier?.cartes ?? {}).reverse()
    .sort((x, y) => y.jourAcquisition.localeCompare(x.jourAcquisition))
    .map((c) => {
      const versions = versionsDeCarte(c);
      const active = versionActive(c);
      return {
        lecon: c.lecon, titre: c.titre, categorie: c.categorie, objectifs: c.objectifs, jourAcquisition: c.jourAcquisition,
        statut: !versions.length ? 'en-composition' : c.retourne ? 'retournee' : 'face-cachee',
        generique: versions.find((v) => v.numero === active)?.generique === true,
        leconSupprimee: !leconsExistantes.includes(c.lecon),
        regeneration: Boolean(c.regeneration), echecRegeneration: Boolean(c.echecRegeneration),
        versionActive: active,
        versions: versions.map((v) => ({ numero: v.numero, calques: v.calques, creee: v.creee, generique: v.generique === true, active: v.numero === active })),
      };
    });
  return { lignes };
}
