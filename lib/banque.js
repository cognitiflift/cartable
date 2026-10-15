// Banque de Questions d'une Leçon (spec #47, ticket #64 ; ADR 0006) : chaque Question de quiz de la Leçon, avec son
// contenu et le journal de toutes les réponses de l'Élève. Rangée par l'appli dans `questions.json` du dossier de la
// Leçon (jamais écrite par le prof) :
//   { "<page>#<id>": { id, page, contenu: { enonce, reponses, bonne, explication, objectifs }, journal: [réponse…], variantes? } }
// Une réponse du journal : { date, juste, sur?, jeNeSaisPas?, origine: 'quiz' | 'revision', variante? }.
// Le journal est la seule source de vérité : la mémoire de l'Élève (stabilité, difficulté, prochaine date) en est
// toujours recalculée, jamais rangée ici.
// Module pur : la lecture de la page et du fichier est dans lib/store.js.
import { lireQuiz } from '../public/kit/v1/quiz-logique.js';

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

// Ajoute à la Banque les réponses d'un quiz du Kit (`resultats` : résultats par question validés, voir
// lib/resultats.js) faites dans `page`, dont `quiz` est le quiz déclaré (quizDeLaPage). Une Question est créée à sa
// première réponse, puis son contenu suit la page ; ses réponses s'ajoutent à son journal. Hors Banque : les questions
// bonus (marquées par la page ou par le résultat), un quiz de Pré-test, et les résultats d'une question absente du
// quiz de la page (contenu inconnu). `nombreObjectifs` : seuls les numéros d'Objectifs existants sont gardés.
// Renvoie une nouvelle Banque ; celle reçue n'est pas modifiée.
export function ajouterReponsesDuQuiz(banque = {}, { page, quiz, resultats = [], date, pretest = false, nombreObjectifs = Infinity }) {
  if (pretest || !quiz || quiz.pretest) return banque;
  const suivante = { ...banque };
  for (const r of resultats) {
    const q = quiz.questions.find((qq) => qq.id === r.id);
    if (!q || q.bonus || r.bonus) continue;
    const cle = cleQuestion(page, q.id);
    const objectifs = (q.objectifs ?? quiz.objectifs).filter((n) => n <= nombreObjectifs);
    const contenu = { enonce: q.enonce, reponses: q.reponses, bonne: q.bonne, explication: q.explication, objectifs };
    const reponse = {
      date, juste: r.juste,
      ...(typeof r.sur === 'boolean' && { sur: r.sur }),
      ...(r.jeNeSaisPas === true && { jeNeSaisPas: true }),
      origine: 'quiz',
    };
    const avant = banque[cle];
    suivante[cle] = { ...avant, id: q.id, page, contenu, journal: [...(avant?.journal ?? []), reponse] };
  }
  return suivante;
}

// Ajoute au journal de la Question `cle` une réponse de Révision du jour (#66), déjà corrigée par le serveur :
// { date, juste, sur?, jeNeSaisPas? }. « Je ne sais pas » est faux et sans Confiance, comme dans le Kit.
// Renvoie une nouvelle Banque ; celle reçue n'est pas modifiée. Question inconnue : Banque inchangée.
export function ajouterReponseDeRevision(banque = {}, cle, { date, juste, sur, jeNeSaisPas = false }) {
  const avant = banque[cle];
  if (!avant) return banque;
  const reponse = {
    date, juste: juste && !jeNeSaisPas,
    ...(typeof sur === 'boolean' && !jeNeSaisPas && { sur }),
    ...(jeNeSaisPas && { jeNeSaisPas: true }),
    origine: 'revision',
  };
  return { ...banque, [cle]: { ...avant, journal: [...avant.journal, reponse] } };
}

// Questions de la Banque, telles que la Leçon les expose : dans l'ordre de leur première réponse.
export const questionsDeLaBanque = (banque = {}) => Object.values(banque);
