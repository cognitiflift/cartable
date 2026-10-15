// Kit v1 — logique pure du quiz (sans DOM), testée avec `node --test`. Le rendu est dans quiz.js.
// L'appli importe aussi ce module pour valider les résultats qu'elle reçoit (lib/resultats.js) : une seule
// validation, avec les mêmes limites, pour le quiz affiché et pour le résultat enregistré.
//
// Données écrites par le prof dans la Page de leçon (voir LISEZMOI.md) :
//   { objectifs: [n…], pretest?, questions: [{ id, type: 'qcm', enonce, reponses: [texte…], bonne: <index>, explication, bonus?, objectifs? }] }
// `pretest: true` : quiz du Pré-test (« Devine ! »), hors Maîtrise, Objectifs atteints, Étoiles et Rebond ordinaire.
// Message envoyé à l'appli à la fin du quiz (`cartable-score`) :
//   { type, score, page, objectifs, pretest?, bonus?, questions: [{ id, enonce, choisie, bonne, juste, jeNeSaisPas?, bonus, objectifs, sur? }] }
// `sur` : Confiance de l'Élève, donnée après le choix et avant la correction (true = « sûr », false = « pas sûr ») ;
// absente si l'Élève ne l'a pas donnée (anciennes pages). Elle n'entre jamais dans le score.
// `jeNeSaisPas: true` : l'Élève a choisi « Je ne sais pas » (#64) plutôt qu'une réponse ; la question compte comme
// fausse, sans Confiance, et `choisie` vaut « Je ne sais pas » (les lecteurs d'avant ce champ restent justes).

// Limites communes : au-delà, un texte est tronqué (jamais écarté) et les questions en trop sont ignorées.
export const QUESTIONS_MAX = 50;
export const ID_MAX = 100;
export const TEXTE_MAX = 500;

// Choix « Je ne sais pas » dans `choix` (voir messageScore), et le texte envoyé à sa place comme réponse choisie.
export const JE_NE_SAIS_PAS = 'je-ne-sais-pas';
export const TEXTE_JE_NE_SAIS_PAS = 'Je ne sais pas';

// Texte non vide, sans espaces autour, tronqué à `max` caractères ; null sinon.
const texte = (v, max = TEXTE_MAX) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max).trim() : null);
const numeros = (v, max = Infinity) => (Array.isArray(v) ? [...new Set(v.filter((n) => Number.isInteger(n) && n >= 1 && n <= max))] : []);

// Questions valides (`valider` : question brute → question ou null), sans doublon d'id, au plus QUESTIONS_MAX.
function questionsValides(brut, valider) {
  const vus = new Set();
  return (Array.isArray(brut) ? brut : [])
    .map(valider)
    .filter((q) => q && !vus.has(q.id) && vus.add(q.id))
    .slice(0, QUESTIONS_MAX);
}

// Questions justes parmi celles hors bonus (avec `bonus: true` : parmi les questions bonus), et leur nombre.
export function compterJustes(questions = [], { bonus = false } = {}) {
  const posees = questions.filter((q) => Boolean(q.bonus) === bonus);
  return { justes: posees.filter((q) => q.juste).length, total: posees.length };
}

// Score d'un quiz : % de questions justes hors bonus, arrondi ; null sans question hors bonus.
export function scoreDesQuestions(questions) {
  const { justes, total } = compterJustes(questions);
  return total ? Math.round((100 * justes) / total) : null;
}

// Résultat des questions bonus (hors score) : { reussies, total } ; null sans question bonus.
export function bonusDesQuestions(questions) {
  const { justes, total } = compterJustes(questions, { bonus: true });
  return total ? { reussies: justes, total } : null;
}

const ROCKET = /^🚀\s*/u;

function questionValide(q) {
  if (!q || typeof q !== 'object') return null;
  const [id, enonce] = [texte(q.id, ID_MAX), texte(q.enonce)];
  if (!id || !enonce || (q.type ?? 'qcm') !== 'qcm') return null;
  if (!Array.isArray(q.reponses) || q.reponses.length < 2) return null;
  const reponses = q.reponses.map((r) => texte(r));
  if (!reponses.every(Boolean)) return null;
  if (!Number.isInteger(q.bonne) || q.bonne < 0 || q.bonne >= reponses.length) return null;
  // Un énoncé qui commence par 🚀 marque une question bonus, même sans `bonus: true` (oubli constaté du prof) : elle
  // reste hors score. Le 🚀 est retiré de l'énoncé, le Kit l'affiche lui-même.
  const fusee = ROCKET.test(enonce);
  return {
    id,
    type: 'qcm',
    enonce: fusee ? texte(enonce.replace(ROCKET, '')) ?? enonce : enonce,
    reponses,
    bonne: q.bonne,
    explication: texte(q.explication) ?? '',
    bonus: q.bonus === true || fusee,
    ...(Array.isArray(q.objectifs) && { objectifs: numeros(q.objectifs) }),
  };
}

// Quiz utilisable : questions mal formées ou en double (même id) écartées. null s'il ne reste aucune question
// comptée dans le score (hors bonus).
export function lireQuiz(donnees) {
  const questions = questionsValides(donnees?.questions, questionValide);
  if (!questions.some((q) => !q.bonus)) return null;
  return { objectifs: numeros(donnees.objectifs), ...(donnees.pretest === true && { pretest: true }), questions };
}

// Résultats par question reçus par l'appli (`questions` du message `cartable-score`), validés avec les mêmes limites
// que le quiz : une question mal formée est écartée sans erreur. `nombreObjectifs` : seuls les numéros d'Objectifs
// existants sont gardés.
export function lireResultats(brut, nombreObjectifs = Infinity) {
  return questionsValides(brut, (q) => {
    if (!q || typeof q !== 'object' || typeof q.juste !== 'boolean') return null;
    const [id, enonce, choisie, bonne] = [texte(q.id, ID_MAX), texte(q.enonce), texte(q.choisie), texte(q.bonne)];
    if (!id || !enonce || !choisie || !bonne) return null;
    // « Je ne sais pas » est toujours faux, et sans Confiance.
    const jeNeSaisPas = q.jeNeSaisPas === true;
    return {
      id, enonce, choisie, bonne, juste: q.juste && !jeNeSaisPas, ...(jeNeSaisPas && { jeNeSaisPas }),
      bonus: q.bonus === true, objectifs: numeros(q.objectifs, nombreObjectifs),
      ...(typeof q.sur === 'boolean' && !jeNeSaisPas && { sur: q.sur }),
    };
  });
}

// Correction d'une réponse (index dans `question.reponses`, avant mélange).
export function corriger(question, choisie) {
  return { juste: choisie === question.bonne, bonne: question.reponses[question.bonne], explication: question.explication };
}

// Ordre d'affichage des réponses : une permutation des index, au hasard (`aleatoire` remplaçable pour les tests).
export function melanger(nombre, aleatoire = Math.random) {
  const ordre = [...Array(nombre).keys()];
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(aleatoire() * (i + 1));
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
  }
  return ordre;
}

// Message de fin de quiz. `choix` : id de question → index de la réponse choisie (avant mélange), ou JE_NE_SAIS_PAS ; `confiance` :
// id de question → true (« sûr ») ou false (« pas sûr »). Score : % de questions justes hors bonus, arrondi, sans
// effet de la Confiance. Objectifs : ceux du quiz et ceux propres aux questions. Un quiz de Pré-test porte son marqueur.
export function messageScore(quiz, choix, page, confiance = {}) {
  const questions = quiz.questions.map((q) => {
    const { juste, bonne } = corriger(q, choix[q.id]);
    if (choix[q.id] === JE_NE_SAIS_PAS) {
      return { id: q.id, enonce: q.enonce, choisie: TEXTE_JE_NE_SAIS_PAS, bonne, juste: false, jeNeSaisPas: true, bonus: q.bonus, objectifs: q.objectifs ?? quiz.objectifs };
    }
    return { id: q.id, enonce: q.enonce, choisie: q.reponses[choix[q.id]] ?? null, bonne, juste, bonus: q.bonus, objectifs: q.objectifs ?? quiz.objectifs,
      ...(typeof confiance[q.id] === 'boolean' && { sur: confiance[q.id] }) };
  });
  const objectifs = [...new Set(questions.filter((q) => !q.bonus).flatMap((q) => q.objectifs))].sort((a, b) => a - b);
  const bonus = bonusDesQuestions(questions);
  return { type: 'cartable-score', score: scoreDesQuestions(questions), page, objectifs, ...(quiz.pretest && { pretest: true }), ...(bonus && { bonus }), questions };
}
