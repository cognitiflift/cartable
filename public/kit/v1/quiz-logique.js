// Kit v1 — logique pure du quiz (sans DOM), testée avec `node --test`. Le rendu est dans quiz.js.
//
// Données écrites par le prof dans la Page de leçon (voir LISEZMOI.md) :
//   { objectifs: [n…], questions: [{ id, type: 'qcm', enonce, reponses: [texte…], bonne: <index>, explication, bonus?, objectifs? }] }
// Message envoyé à l'appli à la fin du quiz (`cartable-score`) :
//   { type, score, page, objectifs, bonus?, questions: [{ id, enonce, choisie, bonne, juste, bonus, objectifs }] }

const texte = (v) => typeof v === 'string' && v.trim() !== '';
const numeros = (v) => (Array.isArray(v) ? [...new Set(v.filter((n) => Number.isInteger(n) && n >= 1))] : []);

function questionValide(q) {
  if (!q || typeof q !== 'object' || !texte(q.id) || !texte(q.enonce)) return null;
  if ((q.type ?? 'qcm') !== 'qcm') return null;
  if (!Array.isArray(q.reponses) || q.reponses.length < 2 || !q.reponses.every(texte)) return null;
  if (!Number.isInteger(q.bonne) || q.bonne < 0 || q.bonne >= q.reponses.length) return null;
  return {
    id: q.id.trim(),
    type: 'qcm',
    enonce: q.enonce.trim(),
    reponses: q.reponses.map((r) => r.trim()),
    bonne: q.bonne,
    explication: texte(q.explication) ? q.explication.trim() : '',
    bonus: q.bonus === true,
    ...(Array.isArray(q.objectifs) && { objectifs: numeros(q.objectifs) }),
  };
}

// Quiz utilisable : questions mal formées ou en double (même id) écartées. null s'il ne reste aucune question
// comptée dans le score (hors bonus).
export function lireQuiz(donnees) {
  const vus = new Set();
  const questions = (Array.isArray(donnees?.questions) ? donnees.questions : [])
    .map(questionValide)
    .filter((q) => q && !vus.has(q.id) && vus.add(q.id));
  if (!questions.some((q) => !q.bonus)) return null;
  return { objectifs: numeros(donnees.objectifs), questions };
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

// Message de fin de quiz. `choix` : id de question → index de la réponse choisie (avant mélange).
// Score : % de questions justes hors bonus, arrondi. Objectifs : ceux du quiz et ceux propres aux questions.
export function messageScore(quiz, choix, page) {
  const questions = quiz.questions.map((q) => {
    const { juste, bonne } = corriger(q, choix[q.id]);
    return { id: q.id, enonce: q.enonce, choisie: q.reponses[choix[q.id]] ?? null, bonne, juste, bonus: q.bonus, objectifs: q.objectifs ?? quiz.objectifs };
  });
  const comptees = questions.filter((q) => !q.bonus);
  const bonus = questions.filter((q) => q.bonus);
  const objectifs = [...new Set(questions.filter((q) => !q.bonus).flatMap((q) => q.objectifs))].sort((a, b) => a - b);
  return {
    type: 'cartable-score',
    score: Math.round((100 * comptees.filter((q) => q.juste).length) / comptees.length),
    page,
    objectifs,
    ...(bonus.length && { bonus: { reussies: bonus.filter((q) => q.juste).length, total: bonus.length } }),
    questions,
  };
}
