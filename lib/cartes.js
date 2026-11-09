// Cartes à collectionner (spec #182, ticket #183) : le moteur des cartes de ligne et le retournement des cartes, sans
// écran. Une Leçon (libre ou de révision) qui atteint « acquis » pour la première fois donne une carte de ligne
// « à composer » ; elle est définitive, comme un Palier : elle reste à l'Élève si la Leçon redescend ou est supprimée.
// Module pur : il reçoit les Leçons lues, le fichier de Badges et la date « maintenant » (ms).
//
// Fichier de cartes de l'Espace personnel (à côté de badges.json, sans rien y changer) :
// { version, livraison, son, ecartees, cartes, paliers }.
// - `livraison` : date ISO du premier calcul, qui marque la livraison des cartes ;
// - `son` : réglage du carillon (éteint tant que l'Élève ne l'a pas activé) ;
// - `ecartees` : Leçons déjà Acquises à la livraison, écartées une fois pour toutes (jamais de carte) ;
// - `cartes` : une carte de ligne par Leçon, { lecon, titre, categorie, objectifs, jourAcquisition, etat, essais, calques,
//   prete, retourne }. `etat` : a-composer, en-composition, prete ou generique ; `essais` : tentatives de composition,
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
// enregistrée. Premier calcul : les Leçons Acquises sont écartées, les Paliers existants visibles d'emblée.
// Rien de nouveau : le même fichier, à ne pas réécrire.
export function fusionnerCartes(fichier, { lecons, badges, maintenant }) {
  const date = iso(maintenant);
  const premier = fichier === null || fichier === undefined;
  const avant = premier ? { version: 1, livraison: date, son: false, ecartees: [], cartes: {}, paliers: {} } : fichier;
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

// Au redémarrage, une composition interrompue redevient « à composer » (ses essais restent comptés).
export function reprendreCompositions(fichier) {
  if (!Object.values(fichier.cartes).some((c) => c.etat === 'en-composition')) return fichier;
  const cartes = Object.fromEntries(Object.entries(fichier.cartes).map(([id, c]) => [id, c.etat === 'en-composition' ? { ...c, etat: 'a-composer' } : c]));
  return { ...fichier, cartes };
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
