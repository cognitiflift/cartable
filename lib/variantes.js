// Variantes des Questions (spec #47, ticket #69 ; ADR 0006) : d'autres formulations d'une Question de la Banque, qui
// testent la même chose, pour que l'Élève ne retienne pas seulement la forme de la question. Le prof les écrit en
// arrière-plan (type de tâche « variantes », Modèle le moins cher, ADR 0005) quand une Question a été répondue
// REPONSES_AVANT_VARIANTES fois ; l'appli les valide et les range dans la Question (`variantes` de questions.json).
// Une Variante n'a pas de mémoire propre : ses réponses vont au journal de la Question d'origine.
// Module pur : les fichiers et le tour du prof sont dans lib/store.js et server.js.
import { lireQuiz, typeDe } from '../public/kit/v1/quiz-logique.js';
import { legendeDeFigure } from '../public/kit/v1/figure-logique.js';

export const REPONSES_AVANT_VARIANTES = 2; // réponses au journal avant de demander des variantes
export const VARIANTES_PAR_QUESTION = 2;
export const ESSAIS_VARIANTES = 2; // tours demandés au plus pour une Question : un échec n'est retenté qu'une fois
export const QUESTIONS_PAR_TOUR = 10; // Questions d'une Leçon variées en un seul tour, au plus
// Formats variés : le QCM et « choisis la meilleure explication », son cas particulier (spec #48). Une variante garde le
// format de sa Question. Les autres formats (trous, ordre…) n'ont pas de Variantes.
export const TYPES_VARIES = ['qcm', 'explication'];

// Variantes utilisables d'une Question, d'après `brut` (écrites par le prof, ou déjà rangées) : des QCM valides pour le
// Kit (lireQuiz), du type de la Question (`explication` reste `explication`, quel que soit le type écrit), hors bonus, différentes de l'énoncé d'origine et entre elles, au plus VARIANTES_PAR_QUESTION. Elles
// gardent les Objectifs, l'image (US25) et la figure (#126) de la Question d'origine. Une variante mal formée est écartée sans erreur.
// Limite : l'appli ne vérifie que la forme. Que la variante teste la même chose, avec la même bonne réponse en sens
// (spec #47), ne peut pas se vérifier sans comprendre le texte : c'est seulement demandé au prof (consignesVariantes,
// lib/agent.js). Une variante fausse sur le fond passerait ; voir ADR 0006, conséquences.
// Type à garder dans le contenu d'une variante : absent pour un QCM (implicite, comme dans la Banque).
const typeGarde = (contenu) => (typeDe(contenu) === 'qcm' ? {} : { type: typeDe(contenu) });

export function lireVariantes(brut, contenu) {
  if (!Array.isArray(brut) || !contenu) return [];
  const quiz = lireQuiz({ questions: brut.map((v, i) => (v && typeof v === 'object' ? { ...v, id: `v${i}`, type: typeDe(contenu), bonus: false } : null)) });
  const vus = new Set([contenu.enonce]);
  return (quiz?.questions ?? [])
    .filter((v) => !v.bonus && !vus.has(v.enonce) && vus.add(v.enonce))
    .slice(0, VARIANTES_PAR_QUESTION)
    .map(({ enonce, reponses, bonne, explication }) => ({ ...typeGarde(contenu), enonce, reponses, bonne, explication, objectifs: contenu.objectifs, ...(contenu.image && { image: contenu.image }), ...(contenu.figure && { figure: contenu.figure }) }));
}

// Clés des Questions de la Banque à varier : d'un format de TYPES_VARIES, assez répondues, encore sans variante, et pas
// encore demandées ESSAIS_VARIANTES fois (un tour raté ne se relance pas à chaque réponse).
export const questionsAVarier = (banque = {}) => Object.entries(banque)
  .filter(([, q]) => TYPES_VARIES.includes(typeDe(q.contenu)) && q.journal?.length >= REPONSES_AVANT_VARIANTES && !lireVariantes(q.variantes, q.contenu).length && (q.essaisVariantes ?? 0) < ESSAIS_VARIANTES)
  .map(([cle]) => cle)
  .slice(0, QUESTIONS_PAR_TOUR);

// Demande de variantes pour les Questions `cles` : un essai de plus compté pour chacune, avant le tour (un tour
// interrompu compte aussi). Renvoie une nouvelle Banque.
export const noterDemande = (banque, cles) =>
  ({ ...banque, ...Object.fromEntries(cles.map((cle) => [cle, { ...banque[cle], essaisVariantes: (banque[cle].essaisVariantes ?? 0) + 1 }])) });

// Ce que le prof reçoit pour chaque Question à varier (questions-a-varier.json). `image` : description (texte
// alternatif) de l'image de la Question, que ses variantes montreront aussi. `figure` : de même, description de sa
// figure (#126), sa légende sans le crédit. `type` : `explication` pour une question « choisis la meilleure
// explication », absent pour un QCM.
export const demandeDeVariantes = (banque, cles) => cles.map((cle) => {
  const { enonce, reponses, bonne, explication, image, figure } = banque[cle].contenu;
  return {
    cle, ...typeGarde(banque[cle].contenu), enonce, reponses, bonne, explication, ...(image && { image: image.alt }),
    ...(figure && { figure: legendeDeFigure(figure) || 'une figure sans légende' }),
  };
});

// Variantes écrites par le prof (`ecrites` : { "<clé>": [variante…] }, variantes.json) rattachées aux Questions
// demandées (`cles`) qui n'en ont pas encore ; seules les valides sont gardées. Renvoie une nouvelle Banque.
export function rattacherVariantes(banque, cles, ecrites) {
  const suivante = { ...banque };
  for (const cle of cles) {
    const q = banque[cle];
    if (!q || lireVariantes(q.variantes, q.contenu).length) continue;
    const variantes = lireVariantes(ecrites?.[cle], q.contenu);
    if (variantes.length) suivante[cle] = { ...q, variantes };
  }
  return suivante;
}

// Contenu servi pour une Question en Révision du jour : celui de la Question d'origine ou d'une de ses variantes, au
// hasard (`aleatoire` remplaçable pour les tests). `variante` : index de la variante servie, absent pour l'origine.
export function contenuAServir(question, aleatoire = Math.random) {
  const variantes = question.variantes ?? [];
  const n = Math.floor(aleatoire() * (variantes.length + 1)) - 1;
  return n < 0 ? question.contenu : { ...variantes[n], variante: n };
}
