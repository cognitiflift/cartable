// Badges (spec #89, ticket #95) : récompenses au niveau de l'Élève, qui saluent l'effort, les bonnes habitudes et ce
// qui reste en mémoire. Chaque Badge compte quelque chose dans tout l'historique et monte de Palier en Palier
// (bronze, argent, or, diamant) ; la date de chaque Palier se reconstitue depuis l'historique.
// Module pur : il reçoit les Leçons déjà lues (lireLecon), les événements de l'Élève et la date « maintenant » (ms).
// Le fichier de Badges de l'Espace personnel garde les Paliers atteints : la fusion n'en retire jamais (un Badge est
// acquis pour toujours), la progression affichée suit le compte actuel.

import { dateValide as valide, jourDe, jourLocal, jourValide, minuitDu } from './jour.js';
import { activiteParJour, joursAtteints, joursTravailles, reponsesDeLecon, retenusA } from './rythme.js';
import { recompensesDeLEleve } from './recompenses.js';
import { joursDeRevisionTerminee } from './revision-du-jour.js';

export const PALIERS = ['bronze', 'argent', 'or', 'diamant'];

// Une Famille de Badges : `compter(contexte)` renvoie { compte, jours } : `compte`, le compte actuel (la progression) ;
// `jours`, le jour local (AAAA-MM-JJ) où l'historique a atteint 1, 2, 3… (jours[n - 1] : le jour où il a atteint n).
// Une Famille a trois ou quatre seuils (sans diamant pour trois).
// `contexte` : { lecons, evenements, maintenant, activite } (activite : voir activiteParJour).
export const FAMILLES = [
  { id: 'regulier', emoji: '📅', nom: 'Régulier', seuils: [3, 15, 50, 150], compter: compterRegulier },
  { id: 'revisions', emoji: '🔁', nom: 'Révisions du jour', seuils: [1, 10, 25, 50], compter: compterRevisions },
  { id: 'memoire', emoji: '🧠', nom: 'Mémoire', seuils: [1, 5, 15, 40], compter: compterMemoire },
  { id: 'retour-gagnant', emoji: '💪', nom: 'Retour gagnant', seuils: [1, 10, 50, 100], compter: compterRetoursGagnants },
  { id: 'curieux', emoji: '🚀', nom: 'Curieux', seuils: [1, 10, 30, 75], compter: compterFusees },
  { id: 'etoiles', emoji: '⭐', nom: 'Collection d’Étoiles', seuils: [10, 50, 150, 300], compter: compterEtoiles },
  { id: 'jusquau-bout', emoji: '🏆', nom: 'Jusqu’au bout', seuils: [1, 3, 10], compter: compterTerminees },
  { id: 'explorateur', emoji: '🧭', nom: 'Explorateur', seuils: [2, 4, 6], compter: compterCategories },
];

// Badges surprise : uniques, cachés tant qu'ils ne sont pas obtenus. `trouver(contexte)` renvoie le jour local où
// l'historique le justifie pour la première fois, ou null. Leur seul Palier s'appelle « unique ».
export const PALIER_SURPRISE = 'unique';
export const SURPRISES = [
  { id: 'content-de-te-revoir', emoji: '👋', nom: 'Content de te revoir', trouver: trouverRetour },
  { id: 'mission-elargie', emoji: '🗺️', nom: 'Mission élargie', trouver: trouverMissionElargie },
  { id: 'pret-pour-le-controle', emoji: '🎯', nom: 'Prêt pour le contrôle', trouver: trouverPretPourControle },
];

// Pause qui vaut l'accueil « Content de te revoir » : « plus de 14 jours » sans Jour travaillé, soit au moins 15 jours
// vides entre deux Jours travaillés (du 1er au 17 : les 15 jours du 2 au 16 sont vides).
const JOURS_VIDES_MIN = 15;

// 📅 Jours où l'Objectif du jour est atteint, jusqu'à aujourd'hui.
function compterRegulier({ activite, maintenant }) {
  const jours = joursAtteints(activite, maintenant);
  return { compte: jours.length, jours };
}

// 🔁 Jours avec une Révision du jour menée jusqu'au bout (pour le passé : avec au moins une réponse de Révision du jour,
// voir joursDeRevisionTerminee).
function compterRevisions({ lecons, evenements, maintenant }) {
  const jours = joursDeRevisionTerminee(lecons, evenements, maintenant);
  return { compte: jours.length, jours };
}

// 🚀 Fusées et ⭐ Étoiles (Leçons et Révisions du jour) de l'Élève, chacune datée du jour où elle a été gagnée.
function compterFusees(contexte) {
  const jours = recompensesDeLEleve(contexte).fusees;
  return { compte: jours.length, jours };
}
function compterEtoiles(contexte) {
  const jours = recompensesDeLEleve(contexte).etoiles;
  return { compte: jours.length, jours };
}

// 🧠 Objectifs devenus Retenus, dans les Leçons qui ont une Banque de Questions. Compte actuel : Objectifs Retenus
// aujourd'hui (un Objectif oublié en sort). Jours : rejoués avec retenusA (comme le récapitulatif de la semaine) juste
// après chaque score et chaque réponse ; le total n'est daté que la première fois qu'il atteint chaque valeur.
function compterMemoire({ lecons }) {
  const avecBanque = lecons.filter((l) => (l.questions ?? []).length > 0);
  const etapes = avecBanque.flatMap((l, n) => {
    const dates = reponsesDeLecon(l).map((x) => Date.parse(x.date));
    return [...new Set(dates)].map((instant) => ({ n, instant, retenus: retenusA(l, instant + 1).filter(Boolean).length }));
  }).sort((x, y) => x.instant - y.instant);
  const parLecon = avecBanque.map(() => 0);
  const jours = [];
  for (const { n, instant, retenus } of etapes) {
    parLecon[n] = retenus;
    const total = parLecon.reduce((t, r) => t + r, 0);
    while (jours.length < total) jours.push(jourLocal(instant));
  }
  return { compte: avecBanque.reduce((t, l) => t + (l.objectifs ?? []).filter((o) => o.retenu).length, 0), jours };
}

// 💪 Questions ratées (réponse fausse, juste en partie ou « Je ne sais pas ») puis réussies entièrement un autre jour
// local, une fois par Question, datées du jour de cette réussite. Les réponses aux Variantes sont dans le journal de
// leur Question. Les anciennes Leçons sans Banque n'ont pas de Questions : elles ne comptent pas.
function compterRetoursGagnants({ lecons }) {
  const jours = [];
  for (const q of lecons.flatMap((l) => l.questions ?? [])) {
    const reponses = (q.journal ?? []).filter((r) => valide(r.date)).sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
    let rate = null; // jour de la première réponse ratée
    const reussite = reponses.find((r) => {
      const jour = jourDe(r.date);
      if (r.juste !== true) rate ??= jour;
      return r.juste === true && rate !== null && jour > rate;
    });
    if (reussite) jours.push(jourDe(reussite.date));
  }
  return { compte: jours.length, jours: jours.sort() };
}

// 🏆 Leçons terminées (Défi réussi), datées de leur fin.
function compterTerminees({ lecons }) {
  const jours = lecons.filter((l) => valide(l.terminee)).map((l) => jourDe(l.terminee)).sort();
  return { compte: jours.length, jours };
}

// 🧭 Catégories ayant au moins une Leçon, chacune datée de la création de sa première Leçon (sans date : aujourd'hui).
function compterCategories({ lecons, maintenant }) {
  const premiere = new Map(); // Catégorie → jour de création de sa première Leçon
  for (const l of lecons) {
    const jour = valide(l.creee) ? jourDe(l.creee) : jourLocal(maintenant);
    if (!(premiere.get(l.categorie) <= jour)) premiere.set(l.categorie, jour);
  }
  return { compte: premiere.size, jours: [...premiere.values()].sort() };
}

// « Content de te revoir » : le premier Jour travaillé qui suit au moins JOURS_VIDES_MIN jours vides.
function trouverRetour({ lecons }) {
  const jours = joursTravailles(lecons);
  return jours.find((jour, i) => i > 0 && jourLocal(minuitDu(jours[i - 1], JOURS_VIDES_MIN + 1)) <= jour) ?? null;
}

// « Mission élargie » : le jour de la première Leçon libre élargie (Objectifs ajoutés à sa mission), d'après l'événement
// `mission-elargie` que le serveur note quand cela arrive. Les Objectifs ne sont pas datés : rien ne montre sans
// ambiguïté un élargissement passé, ce badge ne s'attribue donc pas d'après l'historique d'avant cet événement.
function trouverMissionElargie({ evenements }) {
  return evenements.filter((e) => e.type === 'mission-elargie' && valide(e.date)).map((e) => jourDe(e.date)).sort()[0] ?? null;
}

// « Prêt pour le contrôle » : le premier jour où une Révision du jour a été menée jusqu'au bout (événements, et règle
// du passé, voir joursDeRevisionTerminee) la veille de la date de contrôle d'une Leçon de révision.
function trouverPretPourControle({ lecons, evenements, maintenant }) {
  const veilles = new Set(lecons.filter((l) => l.mode === 'revision' && jourValide(l.dateControle)).map((l) => jourLocal(minuitDu(l.dateControle, -1))));
  return joursDeRevisionTerminee(lecons, evenements, maintenant).find((jour) => veilles.has(jour)) ?? null;
}

// Badges calculés depuis l'historique : pour chaque Famille, { id, emoji, nom, seuils, compte, paliers }, `paliers`
// étant les Paliers atteints d'après l'historique, chacun avec son jour : [{ palier, jour }] ; puis chaque badge
// surprise, { id, emoji, nom, surprise: true, paliers } (un seul Palier, « unique », une fois trouvé).
// `familles` et `surprises` : FAMILLES et SURPRISES par défaut.
export function calculerBadges({ lecons = [], evenements = [], maintenant }, { familles = FAMILLES, surprises = SURPRISES } = {}) {
  const contexte = { lecons, evenements, maintenant, activite: activiteParJour(lecons) };
  return [
    ...familles.map(({ id, emoji, nom, seuils, compter }) => {
      const { compte, jours } = compter(contexte);
      const paliers = seuils.flatMap((seuil, i) => (jours.length >= seuil ? [{ palier: PALIERS[i], jour: jours[seuil - 1] }] : []));
      return { id, emoji, nom, seuils, compte, paliers };
    }),
    ...surprises.map(({ id, emoji, nom, trouver }) => {
      const jour = trouver(contexte);
      return { id, emoji, nom, surprise: true, paliers: jour ? [{ palier: PALIER_SURPRISE, jour }] : [] };
    }),
  ];
}

// Fichier de Badges de l'Espace personnel : { version, vuJusquau, accueil, badges: { id: { palier: { jour, ajoute } } } }.
// `jour` : jour local (reconstitué) où le Palier a été atteint ; `ajoute` : date ISO de son entrée dans le fichier, qui
// le rend « Nouveau » tant qu'elle est postérieure à `vuJusquau` (dernière ouverture de Mes badges). `accueil` : mot
// d'accueil à montrer à la prochaine ouverture (Badges attribués d'office).
//
// Fusion du calcul (calculerBadges) avec le fichier (null : jamais calculé) à `maintenant` : { fichier, nouveaux }.
// Ajoute les Paliers nouvellement atteints et n'en retire jamais. `nouveaux` : [{ id, palier, jour }], à annoncer.
// Premier calcul : tout ce que l'historique justifie est attribué d'office, daté, sans annonce ni « Nouveau », avec le
// mot d'accueil s'il y a au moins un Palier. Rien de nouveau : le même fichier, à ne pas réécrire.
export function fusionnerBadges(fichier, calcul, maintenant) {
  const ajoute = new Date(maintenant).toISOString();
  const premier = fichier === null || fichier === undefined;
  const avant = premier ? { version: 1, vuJusquau: ajoute, accueil: false, badges: {} } : fichier;
  const nouveaux = calcul.flatMap(({ id, paliers }) =>
    paliers.filter(({ palier }) => !avant.badges[id]?.[palier]).map(({ palier, jour }) => ({ id, palier, jour })));
  if (!premier && !nouveaux.length) return { fichier, nouveaux: [] };
  const badges = structuredClone(avant.badges);
  for (const { id, palier, jour } of nouveaux) (badges[id] ??= {})[palier] = { jour, ajoute };
  return {
    fichier: { ...avant, badges, ...(premier && { accueil: nouveaux.length > 0 }) },
    nouveaux: premier ? [] : nouveaux,
  };
}

// Paliers de Badge obtenus d'après le fichier de Badges (jamais retirés), nommés d'après le calcul (calculerBadges) :
// [{ id, emoji, nom, palier, jour, ajoute }], pour Mes badges, son calendrier et la Vue parent.
export const paliersObtenus = (fichier, calcul) => calcul.flatMap(({ id, emoji, nom }) =>
  Object.entries(fichier?.badges?.[id] ?? {}).map(([palier, { jour, ajoute }]) => ({ id, emoji, nom, palier, jour, ajoute })));

// Ouverture de Mes badges à `maintenant` : plus rien n'est « Nouveau », le mot d'accueil a été lu.
export const marquerVu = (fichier, maintenant) => ({ ...fichier, vuJusquau: new Date(maintenant).toISOString(), accueil: false });

// Vue de Mes badges à partir du fichier (Paliers obtenus, jamais retirés) et du calcul (compte actuel) :
// { collection, nouveaux, dernier, accueil }.
// `collection` : chaque Famille (puis chaque badge surprise obtenu, { id, emoji, nom, surprise, palier, jour }), { id, emoji, nom, compte, paliers: [{ palier, seuil, jour }], palier, prochain } :
// `jour` d'un Palier pas encore obtenu : null ; `palier` : le plus haut obtenu (null) ; `prochain` : { palier, seuil }
// du prochain à atteindre (null quand tout est obtenu), pour la progression « compte/seuil ».
// `nouveaux` et `dernier` : Paliers { id, emoji, nom, palier, jour }, gagnés depuis la dernière ouverture et le plus récent.
export function vueMesBadges(fichier, calcul) {
  const obtenus = fichier?.badges ?? {};
  const vuJusquau = fichier?.vuJusquau ?? '';
  const collection = calcul.flatMap(({ id, emoji, nom, seuils, compte, surprise }) => {
    if (surprise) {
      const obtenu = obtenus[id]?.[PALIER_SURPRISE];
      return obtenu ? [{ id, emoji, nom, surprise: true, palier: PALIER_SURPRISE, jour: obtenu.jour }] : []; // caché sinon
    }
    const paliers = seuils.map((seuil, i) => ({ palier: PALIERS[i], seuil, jour: obtenus[id]?.[PALIERS[i]]?.jour ?? null }));
    const atteints = paliers.filter((p) => p.jour);
    const prochain = paliers.find((p) => !p.jour);
    return [{ id, emoji, nom, compte, paliers, palier: atteints.at(-1)?.palier ?? null, prochain: prochain ? { palier: prochain.palier, seuil: prochain.seuil } : null }];
  });
  const gagnes = paliersObtenus(fichier, calcul)
    .sort((x, y) => x.jour.localeCompare(y.jour) || x.ajoute.localeCompare(y.ajoute) || PALIERS.indexOf(x.palier) - PALIERS.indexOf(y.palier));
  const sansDate = ({ ajoute, ...p }) => p;
  return {
    collection,
    nouveaux: gagnes.filter((p) => p.ajoute > vuJusquau).map(sansDate),
    dernier: gagnes.length ? sansDate(gagnes.at(-1)) : null,
    accueil: fichier?.accueil === true,
  };
}
