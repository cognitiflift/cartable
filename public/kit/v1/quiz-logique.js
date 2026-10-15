// Kit v1 — logique pure du quiz (sans DOM), testée avec `node --test`. Le rendu est dans quiz.js et question.js.
// L'appli importe aussi ce module pour valider les résultats qu'elle reçoit (lib/resultats.js) : une seule
// validation, avec les mêmes limites, pour le quiz affiché et pour le résultat enregistré.
//
// Données écrites par le prof dans la Page de leçon (voir LISEZMOI.md) :
//   { objectifs: [n…], pretest?, questions: [{ id, type, enonce, …champs du type, explication, bonus?, objectifs?, image? }] }
// `type` (spec #48) : `qcm` (par défaut), `trous`, `ordre`… ; chaque type a sa validation et sa correction dans
// types/<type>.js, inscrites dans types/index.js. Un type inconnu ou une question mal formée est ignoré à l'affichage
// (le quiz reste utilisable) et signalé au prof au tour suivant (questionsIgnorees).
// `image` (ajout compatible de la v1, spec #47 US25) : { src, alt } d'une image propre à la question, rapatriée dans
// images/ de la Leçon (`../images/<fichier>`, relatif à la page) ou distante (http(s), en attendant le rapatriement).
// `pretest: true` : quiz du Pré-test (« Devine ! »), hors Maîtrise, Objectifs atteints, Étoiles et Rebond ordinaire.
// Message envoyé à l'appli à la fin du quiz (`cartable-score`) :
//   { type, score, page, objectifs, pretest?, bonus?, questions: [{ id, type?, enonce, choisie, bonne, juste, points?, detail?, jeNeSaisPas?, bonus, objectifs, sur? }] }
// `sur` : Confiance de l'Élève, donnée après le choix et avant la correction (true = « sûr », false = « pas sûr ») ;
// absente si l'Élève ne l'a pas donnée (anciennes pages). Elle n'entre jamais dans le score.
// `jeNeSaisPas: true` : l'Élève a choisi « Je ne sais pas » (#64) plutôt qu'une réponse ; la question compte comme
// fausse, sans Confiance, et `choisie` vaut « Je ne sais pas » (les lecteurs d'avant ce champ restent justes).
// Ajouts compatibles de la spec #48 : `type` (absent pour un QCM), `points` (crédit partiel, de 0 à 1 exclus ; absent,
// la question vaut 1 si juste, 0 sinon) et `detail` (réponse détaillée propre au type). `juste` n'est vrai que pour une
// question entièrement juste : c'est lui qui compte pour les Objectifs, la Confiance et la Banque. `choisie` et `bonne`
// restent du texte, lisible par les lecteurs d'avant (« La lave sort par le [cratère]. », « A → B → C »).
import { QUESTIONS_MAX, ID_MAX, TEXTE_MAX, texte, numeros } from './types/commun.js';
import { TYPES } from './types/index.js';

export { QUESTIONS_MAX, ID_MAX, TEXTE_MAX, TYPES };

// Choix « Je ne sais pas » dans `choix` (voir messageScore), et le texte envoyé à sa place comme réponse choisie.
export const JE_NE_SAIS_PAS = 'je-ne-sais-pas';
export const TEXTE_JE_NE_SAIS_PAS = 'Je ne sais pas';

// Questions examinées une à une (`examiner` : question brute → { question } ou { id?, raison }) : les valides, sans
// doublon d'id, au plus QUESTIONS_MAX, et les ignorées avec leur raison.
function trierQuestions(brut, examiner) {
  const vus = new Set();
  const questions = [];
  const ignorees = [];
  (Array.isArray(brut) ? brut : []).forEach((q, i) => {
    const { question, id, raison } = examiner(q);
    const ignorer = (r, ident = id) => ignorees.push({ ...(ident ? { id: ident } : { position: i + 1 }), raison: r });
    if (!question) return ignorer(raison);
    if (vus.has(question.id)) return ignorer('identifiant déjà utilisé par une autre question', question.id);
    if (questions.length >= QUESTIONS_MAX) return ignorer(`au-delà de ${QUESTIONS_MAX} questions`, question.id);
    vus.add(question.id);
    questions.push(question);
  });
  return { questions, ignorees };
}
const questionsValides = (brut, valider) => trierQuestions(brut, (q) => ({ question: valider(q) })).questions;

// Type d'une question (écrite par le prof, validée ou gardée dans la Banque) : `qcm` quand il est absent.
export const typeDe = (q) => q?.type ?? 'qcm';

// Résultat ou correction juste en partie (crédit partiel) : pas entièrement juste, mais des points entre 0 et 1 exclus.
export const estPartiel = (r) => !r.juste && Number.isFinite(r.points) && r.points > 0 && r.points < 1;

// Points d'une question : son crédit partiel (0 à 1), ou 1 si juste, 0 sinon.
export const pointsDe = (q) => (q.juste ? 1 : Number.isFinite(q.points) ? q.points : 0);

// Questions justes parmi celles hors bonus (avec `bonus: true` : parmi les questions bonus), et leur nombre.
export function compterJustes(questions = [], { bonus = false } = {}) {
  const posees = questions.filter((q) => Boolean(q.bonus) === bonus);
  return { justes: posees.filter((q) => q.juste).length, total: posees.length };
}

// Score d'un quiz : % des points des questions hors bonus (crédit partiel compris), arrondi ; null sans question hors bonus.
export function scoreDesQuestions(questions) {
  const posees = questions.filter((q) => !q.bonus);
  return posees.length ? Math.round((100 * posees.reduce((s, q) => s + pointsDe(q), 0)) / posees.length) : null;
}

// Résultat des questions bonus (hors score) : { reussies, total } ; null sans question bonus.
export function bonusDesQuestions(questions) {
  const { justes, total } = compterJustes(questions, { bonus: true });
  return total ? { reussies: justes, total } : null;
}

const ROCKET = /^🚀\s*/u;

// Image d'une question : adresse rapatriée dans la Leçon (`../images/<fichier>`) ou distante en HTTP(S), et texte
// alternatif non vide ; null sinon (la question reste, sans image).
export const IMAGE_LOCALE_RE = /^\.\.\/images\/[\w-]+(\.[\w-]+)*$/;
const IMAGE_DISTANTE_RE = /^https?:\/\/[^\s"'<>]+$/;
function imageValide(v) {
  const alt = texte(v?.alt);
  const src = typeof v?.src === 'string' ? v.src.trim() : '';
  if (!alt || src.length > 2000 || !(IMAGE_LOCALE_RE.test(src) || IMAGE_DISTANTE_RE.test(src))) return null;
  return { src, alt };
}

// Une question écrite par le prof : { question } validée, ou { id?, raison } si elle est ignorée. Les champs communs
// sont validés ici, ceux propres au type par son `valider` (types/index.js).
function examinerQuestion(q) {
  if (!q || typeof q !== 'object') return { raison: 'ce n’est pas une question' };
  const [id, enonce] = [texte(q.id, ID_MAX), texte(q.enonce)];
  if (!id) return { raison: 'identifiant manquant' };
  const type = typeDe(q);
  if (typeof type !== 'string' || !Object.hasOwn(TYPES, type)) return { id, raison: `type inconnu « ${String(type).slice(0, ID_MAX)} »` };
  if (!enonce) return { id, raison: 'énoncé manquant' };
  const champs = TYPES[type].valider(q);
  if (!champs) return { id, raison: `question « ${type} » mal formée (voir son format dans LISEZMOI.md)` };
  // Un énoncé qui commence par 🚀 marque une question bonus, même sans `bonus: true` (oubli constaté du prof) : elle
  // reste hors score. Le 🚀 est retiré de l'énoncé, le Kit l'affiche lui-même.
  const fusee = ROCKET.test(enonce);
  return {
    question: {
      id,
      type,
      enonce: fusee ? texte(enonce.replace(ROCKET, '')) ?? enonce : enonce,
      ...champs,
      explication: texte(q.explication) ?? '',
      bonus: q.bonus === true || fusee,
      ...(Array.isArray(q.objectifs) && { objectifs: numeros(q.objectifs) }),
      ...(imageValide(q.image) && { image: imageValide(q.image) }),
    },
  };
}

// Questions d'un type `minoritaire` (sans bonne réponse vérifiable, comme `devoile`) comptées dans le score : elles
// restent moins nombreuses que les autres questions comptées, pour ne pas permettre de gonfler le score. Les premières
// du quiz sont gardées, celles en trop ignorées (à la suite des autres ignorées). Les questions bonus ne sont pas limitées.
function limiterMinoritaires({ questions, ignorees }) {
  const minoritaire = (q) => !q.bonus && TYPES[q.type].minoritaire === true;
  const place = questions.filter((q) => !q.bonus && !minoritaire(q)).length - 1;
  let gardees = 0;
  const raison = (q) => `trop de questions « ${q.type} » : elles doivent rester moins nombreuses que les autres questions comptées dans le score`;
  const enTrop = questions.filter((q) => minoritaire(q) && ++gardees > place);
  return {
    questions: questions.filter((q) => !enTrop.includes(q)),
    ignorees: [...ignorees, ...enTrop.map((q) => ({ id: q.id, raison: raison(q) }))],
  };
}
const trierQuiz = (brut) => limiterMinoritaires(trierQuestions(brut, examinerQuestion));

// Quiz utilisable : questions mal formées, d'un type inconnu, en double (même id) ou d'un type minoritaire en trop
// écartées. null s'il ne reste aucune question comptée dans le score (hors bonus).
export function lireQuiz(donnees) {
  const { questions } = trierQuiz(donnees?.questions);
  if (!questions.some((q) => !q.bonus)) return null;
  return { objectifs: numeros(donnees.objectifs), ...(donnees.pretest === true && { pretest: true }), questions };
}

// Questions du quiz que le Kit n'affiche pas, à signaler au prof (spec #48) : [{ id, raison }] (ou { position, raison }
// sans identifiant lisible), dans l'ordre du quiz. Sans quiz lisible, [{ raison }].
export function questionsIgnorees(donnees) {
  if (!Array.isArray(donnees?.questions)) return [{ raison: 'quiz sans liste "questions"' }];
  const { questions, ignorees } = trierQuiz(donnees.questions);
  return questions.some((q) => !q.bonus) ? ignorees : [...ignorees, { raison: 'aucune question comptée dans le score (hors bonus) : le quiz ne s’affiche pas' }];
}

// Résultats par question reçus par l'appli (`questions` du message `cartable-score`), validés avec les mêmes limites
// que le quiz : une question mal formée est écartée sans erreur. `nombreObjectifs` : seuls les numéros d'Objectifs
// existants sont gardés. `points` n'est gardé que pour un crédit partiel (entre 0 et 1 exclus, question pas juste) ;
// `detail` seulement pour un type connu qui sait le lire, `type` seulement pour un type connu autre que `qcm`.
export function lireResultats(brut, nombreObjectifs = Infinity) {
  return questionsValides(brut, (q) => {
    if (!q || typeof q !== 'object' || typeof q.juste !== 'boolean') return null;
    const [id, enonce, choisie, bonne] = [texte(q.id, ID_MAX), texte(q.enonce), texte(q.choisie), texte(q.bonne)];
    if (!id || !enonce || !choisie || !bonne) return null;
    // « Je ne sais pas » est toujours faux, et sans Confiance ni crédit partiel.
    const jeNeSaisPas = q.jeNeSaisPas === true;
    const juste = q.juste && !jeNeSaisPas;
    const type = typeof q.type === 'string' && q.type !== 'qcm' && Object.hasOwn(TYPES, q.type) ? q.type : null;
    const partiel = !jeNeSaisPas && estPartiel({ juste, points: q.points });
    const detail = type && !jeNeSaisPas ? TYPES[type].lireDetail?.(q.detail) ?? null : null;
    return {
      id, ...(type && { type }), enonce, choisie, bonne, juste, ...(partiel && { points: q.points }),
      ...(detail && { detail }), ...(jeNeSaisPas && { jeNeSaisPas }),
      bonus: q.bonus === true, objectifs: numeros(q.objectifs, nombreObjectifs),
      ...(typeof q.sur === 'boolean' && !jeNeSaisPas && { sur: q.sur }),
    };
  });
}

// Correction d'une réponse de l'Élève, selon le type de la question (`reponse` : propre au type, voir types/, ou
// JE_NE_SAIS_PAS). Renvoie { juste, points, bonne, choisie, explication, detail?, jeNeSaisPas? } : `juste` seulement
// si la question est entièrement juste ; `choisie` null si `reponse` n'est pas une réponse possible (0 point).
export function corriger(question, reponse) {
  const jeNeSaisPas = reponse === JE_NE_SAIS_PAS;
  const r = (TYPES[typeDe(question)] ?? TYPES.qcm).corriger(question, jeNeSaisPas ? null : reponse);
  const points = jeNeSaisPas || r.choisie === null ? 0 : Math.min(1, Math.max(0, Number(r.points) || 0));
  return {
    juste: points === 1, points, bonne: r.bonne, choisie: jeNeSaisPas ? TEXTE_JE_NE_SAIS_PAS : r.choisie,
    explication: question.explication ?? '',
    ...(r.detail && !jeNeSaisPas && r.choisie !== null && { detail: r.detail }),
    ...(jeNeSaisPas && { jeNeSaisPas: true }),
  };
}

// Réponse entièrement juste à une question, propre à son type (comme `reponse` de corriger) : ce que le rendu montre
// quand l'Élève n'a pas donné de réponse (« Je ne sais pas »).
export const reponseAttendue = (question) => (TYPES[typeDe(question)] ?? TYPES.qcm).reponseAttendue(question);

// Ordre d'affichage des réponses : une permutation des index, au hasard (`aleatoire` remplaçable pour les tests).
export function melanger(nombre, aleatoire = Math.random) {
  const ordre = [...Array(nombre).keys()];
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(aleatoire() * (i + 1));
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
  }
  return ordre;
}

// Résultat d'une question pour le message de fin de quiz (voir l'en-tête) ; `objectifs` : ceux par défaut du quiz.
function resultatQuestion(q, reponse, sur, objectifs) {
  const c = corriger(q, reponse);
  const partiel = estPartiel(c);
  return {
    id: q.id, ...(q.type && q.type !== 'qcm' && { type: q.type }), enonce: q.enonce, choisie: c.choisie, bonne: c.bonne,
    juste: c.juste, ...(partiel && { points: c.points }), ...(c.detail && { detail: c.detail }),
    ...(c.jeNeSaisPas && { jeNeSaisPas: true }),
    bonus: q.bonus, objectifs: q.objectifs ?? objectifs,
    ...(typeof sur === 'boolean' && !c.jeNeSaisPas && !TYPES[typeDe(q)]?.souvenirDeclare && { sur }),
  };
}

// Message de fin de quiz. `choix` : id de question → réponse de l'Élève (propre au type : index de la réponse avant
// mélange pour un QCM…), ou JE_NE_SAIS_PAS ; `confiance` : id de question → true (« sûr ») ou false (« pas sûr »).
// Score : % des points des questions hors bonus (crédit partiel compris), arrondi, sans effet de la Confiance.
// Objectifs : ceux du quiz et ceux propres aux questions. Un quiz de Pré-test porte son marqueur.
export function messageScore(quiz, choix, page, confiance = {}) {
  const questions = quiz.questions.map((q) => resultatQuestion(q, choix[q.id], confiance[q.id], quiz.objectifs));
  const objectifs = [...new Set(questions.filter((q) => !q.bonus).flatMap((q) => q.objectifs))].sort((a, b) => a - b);
  const bonus = bonusDesQuestions(questions);
  return { type: 'cartable-score', score: scoreDesQuestions(questions), page, objectifs, ...(quiz.pretest && { pretest: true }), ...(bonus && { bonus }), questions };
}
