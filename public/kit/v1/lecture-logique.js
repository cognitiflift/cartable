// Kit v1 — logique de la lecture à voix haute (#76), sans DOM ni synthèse vocale : testée seule (test/lecture.test.js).
// Le rendu (boutons 🔊, synthèse vocale du navigateur) est dans lecture.js.
import { estPartiel, typeDe } from './quiz-logique.js';
import { motsDe } from './types/trous.js';
import { propositionsDe } from './types/etapes.js';

// L'appli transmet le réglage du Profil à la page dans son adresse : `…/0002-le-magma.html?lecture=1`.
export const lectureActivee = (recherche) => new URLSearchParams(recherche).get('lecture') === '1';

// Voix parmi celles du navigateur (speechSynthesis.getVoices()). Seules les voix de l'appareil (`localService`) : une voix
// en ligne enverrait le texte de la page à un service extérieur. Française de France d'abord, puis toute voix française,
// puis une autre voix de l'appareil ; null s'il n'y en a aucune (le Kit n'affiche alors pas de bouton de lecture).
export function choisirVoix(voix) {
  const locales = (voix ?? []).filter((v) => v.localService === true);
  const langue = (v) => String(v.lang ?? '').toLowerCase().replace('_', '-');
  return locales.find((v) => langue(v) === 'fr-fr')
    ?? locales.find((v) => langue(v).startsWith('fr'))
    ?? locales[0]
    ?? null;
}

// Longueur d'un morceau lu d'une traite : certains navigateurs coupent une lecture trop longue au bout de quelques
// secondes, et un morceau court permet d'arrêter ou d'enchaîner proprement.
export const MORCEAU_MAX = 200;

// Coupe `max` mots par mots ; un mot plus long que `max` est coupé tel quel.
function couperEnMots(texte, max) {
  const sortie = [];
  let courant = '';
  for (const mot of texte.split(' ')) {
    const essai = courant ? `${courant} ${mot}` : mot;
    if (essai.length <= max) { courant = essai; continue; }
    if (courant) sortie.push(courant);
    courant = mot;
    while (courant.length > max) { sortie.push(courant.slice(0, max)); courant = courant.slice(max); }
  }
  if (courant) sortie.push(courant);
  return sortie;
}

// Texte à lire en morceaux d'au plus `max` caractères, coupés entre deux phrases (ou deux mots pour une phrase trop
// longue), sans émojis (la synthèse les lirait par leur nom : « fusée ») ni blancs en trop.
export function morceaux(texte, max = MORCEAU_MAX) {
  const propre = String(texte ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ').replace(/\s+/g, ' ').trim();
  const phrases = propre.match(/[^.?!…]+[.?!…]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [];
  const sortie = [];
  for (const p of phrases.flatMap((p) => couperEnMots(p, max))) {
    const dernier = sortie.at(-1);
    if (dernier && dernier.length + 1 + p.length <= max) sortie[sortie.length - 1] = `${dernier} ${p}`;
    else sortie.push(p);
  }
  return sortie;
}

// Phrase terminée par un point, sauf si elle finit déjà par une ponctuation.
const phrase = (t) => (/[.?!…:]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

// Ce que lecture.js met à la place d'un <br> avant de lire un bloc : la fin d'un vers (ou d'une ligne) d'un extrait
// de texte. Un séparateur de ligne Unicode, qu'on ne trouve pas dans les blancs du HTML.
export const FIN_DE_VERS = ' ';

// Texte lu d'un bloc de la page (paragraphe, titre, vers d'un extrait…), d'après son texte brut : sans blancs en trop,
// lu comme une phrase (un titre aussi) ; chaque vers finit par une pause (une virgule s'il n'a pas de ponctuation).
export function texteDeBloc(brut) {
  const vers = String(brut ?? '').split(FIN_DE_VERS).map((v) => v.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!vers.length) return '';
  return [...vers.slice(0, -1).map((v) => (/[.?!…:;,]$/.test(v) ? v : `${v},`)), phrase(vers.at(-1))].join(' ');
}
// Propositions lues dans l'ordre alphabétique : ni l'ordre écrit par le prof (souvent la bonne réponse d'abord, ou
// l'ordre attendu), ni le mélange de l'écran, qui change d'une fois à l'autre.
const triees = (textes) => [...textes].sort((a, b) => a.localeCompare(b, 'fr'));
const liste = (titre, textes) => `${titre} : ${triees(textes).map(phrase).join(' ')}`;

// Ce qu'on lit de chaque format : de quoi répondre (énoncé, propositions), jamais la réponse.
const LECTURES = {
  qcm: (q) => [liste('Les réponses', q.reponses)],
  explication: (q) => [liste('Les réponses', q.reponses)],
  trous: (q) => [phrase(q.segments.join('…')), liste('Les mots', motsDe(q))],
  ordre: (q) => [liste('Les éléments', q.elements)],
  associer: (q) => [liste('À gauche', q.paires.map(([g]) => g)), liste('À droite', q.paires.map(([, d]) => d))],
  classer: (q) => [liste('Les catégories', q.categories.map((c) => c.nom)), liste('Les éléments', q.categories.flatMap((c) => c.elements))],
  etapes: (q) => q.etapes.flatMap((e, i) => (e.intrus
    ? [`Étape ${i + 1} : à compléter.`, liste('Les propositions', propositionsDe(e))]
    : [`Étape ${i + 1} : ${phrase(e.texte)}`])),
  devoile: () => [], // la réponse à dévoiler n'est lue qu'après, avec la correction
};

// Texte lu pour une question validée par lireQuiz ; avec sa `correction` (corriger), on lit aussi le verdict, la bonne
// réponse et l'explication, comme à l'écran.
export function texteDeQuestion(q, correction = null) {
  const parties = [
    q.bonus ? 'Question bonus.' : null,
    phrase(q.enonce),
    ...(LECTURES[typeDe(q)] ?? LECTURES.qcm)(q),
  ];
  if (correction) {
    if (correction.juste) parties.push('Bravo !');
    else parties.push(estPartiel(correction) ? 'Juste en partie.' : null, `La bonne réponse : ${phrase(correction.bonne)}`);
    if (correction.explication) parties.push(phrase(correction.explication));
  }
  return parties.filter(Boolean).join(' ');
}
