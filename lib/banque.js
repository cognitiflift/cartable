// Banque de Questions d'une Leçon (spec #47, ticket #64 ; ADR 0006) : chaque Question de quiz de la Leçon, avec son
// contenu et le journal de toutes les réponses de l'Élève. Rangée par l'appli dans `questions.json` du dossier de la
// Leçon (jamais écrite par le prof) :
//   { "<page>#<id>": { id, page, contenu: { type?, enonce, …champs du type, explication, objectifs, image?, figure? }, journal: [réponse…], variantes? } }
// `contenu` (spec #48) : la question validée par le Kit, sans id ni bonus ; `type` absent pour un QCM (anciennes
// Banques comprises), sinon `trous`, `ordre`… avec ses champs (voir public/kit/v1/types/). C'est de quoi l'afficher et
// la corriger en Révision du jour (questionDuContenu).
// `image` (US25) : { src: '../images/<fichier>', alt }, seulement une image rapatriée dans la Leçon (une révision se
// fait hors ligne) ; une image encore distante n'est pas gardée.
// `figure` (spec #123, ticket #126) : copie de la figure du Kit de la page que la question désigne (son `figure` dans
// le quiz) : visuel, légende et crédit, passés par la liste blanche du Kit (extraireFigure,
// public/kit/v1/figure-logique.js). C'est un arbre, jamais du HTML. Une révision se fait hors ligne, et la page peut
// changer ou disparaître. Absente si la page n'a pas de figure du Kit avec cet id. Une Question peut garder `image` et
// `figure` : la figure l'emporte à l'affichage.
// Une réponse du journal : { date, juste, points?, sur?, jeNeSaisPas?, origine: 'quiz' | 'revision', variante? }.
// `points` (spec #48) : crédit partiel d'une réponse pas entièrement juste (entre 0 et 1 exclus) ; `juste` reste faux.
// Le journal est la seule source de vérité : la mémoire de l'Élève (stabilité, difficulté, prochaine date) en est
// toujours recalculée, jamais rangée ici.
// Module pur : la lecture de la page et du fichier est dans lib/store.js.
import { lireQuiz, questionsIgnorees, estPartiel, typeDe, IMAGE_LOCALE_RE } from '../public/kit/v1/quiz-logique.js';
import { extraireFigure } from '../public/kit/v1/figure-logique.js';

// Contenu gardé d'une question validée par le Kit (lireQuiz) : tout sauf son id, son type QCM (implicite) et son
// marqueur bonus ; Objectifs résolus (`objectifs`) ; image seulement rapatriée dans la Leçon ; `figure` : la copie de
// la figure que la question désigne (copieDeFigure), à la place de son id, ou rien si la page ne l'a pas.
export function contenuDeQuestion(q, objectifs, figure = null) {
  const { id, bonus, type, image, figure: _id, objectifs: _, ...champs } = q;
  return {
    ...(type && type !== 'qcm' && { type }), ...champs, objectifs,
    ...(IMAGE_LOCALE_RE.test(image?.src ?? '') && { image }),
    ...(figure && { figure }),
  };
}

// Copie sûre de la figure du Kit que désigne la question `q` (son `figure`) dans `html`, sa page ; null sinon.
export const copieDeFigure = (html, q) => (q.figure ? extraireFigure(html, q.figure) : null);

// Question à corriger (voir corriger du Kit) d'après un contenu gardé : son type, QCM par défaut.
export const questionDuContenu = (contenu) => ({ ...contenu, type: typeDe(contenu) });

// Ce qui fait le sens d'une Question : son contenu sans explication, Objectifs, image ni figure, clés triées (comparable).
const sens = ({ explication, objectifs, image, figure, ...reste }) =>
  JSON.stringify(Object.keys(reste).sort().map((k) => [k, reste[k]]));

// Crédit partiel d'un résultat, s'il en a un (voir lireResultats du Kit).
const pointsPartiels = (r) => (estPartiel(r) ? { points: r.points } : {});

// Identifiant stable d'une Question dans sa Leçon : sa page et son identifiant dans la page.
export const cleQuestion = (page, id) => `${page}#${id}`;

const QUIZ_RE = /<script\b[^>]*\bid=["']cartable-quiz["'][^>]*>([\s\S]*?)<\/script>/i;

// Quiz du Kit déclaré dans une Page de leçon (`<script type="application/json" id="cartable-quiz">`), validé comme le
// Kit le valide (lireQuiz). null sans quiz du Kit ou s'il est illisible (anciennes pages, au quiz écrit à la main).
export function quizDeLaPage(html) {
  const brut = QUIZ_RE.exec(String(html ?? ''))?.[1];
  if (!brut) return null;
  try {
    return lireQuiz(JSON.parse(brut));
  } catch {
    return null;
  }
}

// Questions du quiz du Kit d'une Page de leçon que le Kit n'affiche pas (type inconnu, mal formée…, spec #48), à
// signaler au prof : voir questionsIgnorees du Kit. Quiz illisible : signalé aussi. Sans quiz du Kit : rien.
export function questionsIgnoreesDeLaPage(html) {
  const brut = QUIZ_RE.exec(String(html ?? ''))?.[1];
  if (!brut) return [];
  try {
    return questionsIgnorees(JSON.parse(brut));
  } catch {
    return [{ raison: 'quiz illisible (JSON mal formé) : il ne s’affiche pas' }];
  }
}

// Ajoute à la Banque les réponses d'un quiz du Kit (`resultats` : résultats par question validés, voir
// lib/resultats.js) faites dans `page`, dont `quiz` est le quiz déclaré (quizDeLaPage). Une Question est créée à sa
// première réponse, puis son contenu suit la page ; ses réponses s'ajoutent à son journal. Hors Banque : les questions
// bonus (marquées par la page ou par le résultat), un quiz de Pré-test, et les résultats d'une question absente du
// quiz de la page (contenu inconnu). `nombreObjectifs` : seuls les numéros d'Objectifs existants sont gardés.
// `html` : la page elle-même, d'où vient la copie de la figure que désigne une question (copieDeFigure).
// Renvoie une nouvelle Banque ; celle reçue n'est pas modifiée.
export function ajouterReponsesDuQuiz(banque = {}, { page, quiz, html = '', resultats = [], date, pretest = false, nombreObjectifs = Infinity }) {
  if (pretest || !quiz || quiz.pretest) return banque;
  const suivante = { ...banque };
  for (const r of resultats) {
    const q = quiz.questions.find((qq) => qq.id === r.id);
    if (!q || q.bonus || r.bonus) continue;
    const cle = cleQuestion(page, q.id);
    const objectifs = (q.objectifs ?? quiz.objectifs).filter((n) => n <= nombreObjectifs);
    const contenu = contenuDeQuestion(q, objectifs, copieDeFigure(html, q));
    const reponse = {
      date, juste: r.juste, ...pointsPartiels(r),
      ...(typeof r.sur === 'boolean' && { sur: r.sur }),
      ...(r.jeNeSaisPas === true && { jeNeSaisPas: true }),
      origine: 'quiz',
    };
    const avant = banque[cle];
    // Question réécrite par le prof (énoncé, type ou champs du type : réponses, bonne réponse…) : ses Variantes (#69)
    // ne testent peut-être plus la même chose ; elles sont oubliées et pourront être redemandées.
    const { variantes, essaisVariantes, ...gardee } = avant ?? {};
    const memeSens = avant && sens(avant.contenu) === sens(contenu);
    suivante[cle] = { ...(memeSens ? avant : gardee), id: q.id, page, contenu, journal: [...(avant?.journal ?? []), reponse] };
  }
  return suivante;
}

// Ajoute au journal de la Question `cle` une réponse de Révision du jour (#66), déjà corrigée par le serveur :
// { date, juste, points?, sur?, jeNeSaisPas?, variante? }. « Je ne sais pas » est faux, sans Confiance ni crédit
// partiel, comme dans le Kit.
// `variante` : index de la Variante (#69) à laquelle l'Élève a répondu ; sa réponse compte pour la Question d'origine.
// Renvoie une nouvelle Banque ; celle reçue n'est pas modifiée. Question inconnue : Banque inchangée.
export function ajouterReponseDeRevision(banque = {}, cle, { date, juste, points, sur, jeNeSaisPas = false, variante }) {
  const avant = banque[cle];
  if (!avant) return banque;
  const reponse = {
    date, juste: juste && !jeNeSaisPas, ...(!jeNeSaisPas && pointsPartiels({ juste, points })),
    ...(typeof sur === 'boolean' && !jeNeSaisPas && { sur }),
    ...(jeNeSaisPas && { jeNeSaisPas: true }),
    origine: 'revision',
    ...(Number.isInteger(variante) && { variante }),
  };
  return { ...banque, [cle]: { ...avant, journal: [...avant.journal, reponse] } };
}

// Questions de la Banque, telles que la Leçon les expose : dans l'ordre de leur première réponse.
export const questionsDeLaBanque = (banque = {}) => Object.values(banque);
