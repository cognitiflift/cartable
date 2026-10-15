// Page suivante préparée pendant le quiz (#74) : quand une Page de leçon est affichée, l'appli fait préparer en
// arrière-plan, dans un emplacement à part, la page du Rebond le plus probable. Elle ne devient une Page de leçon que si
// l'Élève choisit ce Rebond et que le résultat de son quiz ne contredit pas la prévision ; sinon, elle est écartée. Si
// aucune page ne s'est préparée pendant le quiz, une se prépare après son Retour, avec ses résultats.
import { QUIZ_REUSSI, horsPretest, estPretest } from './store.js';
import { actionRetourQuiz, tousObjectifsAtteints } from './agent.js';

// Rebonds dont la page peut être préparée : ceux qui créent une page sans rien demander à l'Élève.
const REBONDS_PREPARABLES = ['suivante', 'revoir', 'defi'];

// Prévision pour la Leçon lue `lecon`, dont la dernière page a le quiz du Kit `quiz` (null sans quiz du Kit) :
// { action, reussi, page, resultatsConnus }, ou null quand rien n'est à préparer (Pré-test, Rebond déjà choisi, Leçon
// qui se termine, mission à élargir…).
// Pendant le quiz (`resultatsConnus` false), `reussi` : le quiz de la page affichée est supposé réussi. En Leçon libre,
// toujours (l'Étape suivante suppose qu'il avance) ; en révision (ou en Révisant), selon le dernier vrai quiz :
// réussi, Défi ; sinon ou sans quiz, Revoir.
// Après le Retour de ce quiz (`resultatsConnus` true), le premier Rebond proposé, réussi ou non selon son score : ses
// résultats sont alors transmis au prof.
export function pagePrevue(lecon, quiz) {
  const { mode, scores = [], pages = [], quizEnAttente, rebondsProposes = [], defiEnCours = false, reviserEnCours = false } = lecon;
  if (!quiz || quiz.pretest) return null;
  const page = pages.at(-1);
  const dernier = scores.at(-1);
  const resultatsConnus = !quizEnAttente && rebondsProposes.length > 0 && dernier?.page === page && !estPretest(dernier);
  if (!resultatsConnus && (!quizEnAttente || rebondsProposes.length)) return null;
  const revision = mode === 'revision' || reviserEnCours;
  const reussi = resultatsConnus ? dernier.score >= QUIZ_REUSSI : !revision || (horsPretest(scores).at(-1)?.score ?? 0) >= QUIZ_REUSSI;
  const action = resultatsConnus ? rebondsProposes[0] : actionRetourQuiz(reussi ? 100 : 0, mode, defiEnCours, reviserEnCours);
  if (!REBONDS_PREPARABLES.includes(action)) return null;
  if (action === 'suivante' && tousObjectifsAtteints(lecon)) return null; // le prof proposera d'élargir la mission
  return { action, reussi, page, resultatsConnus };
}

// Bilan des pages préparées d'un Élève, d'après leurs issues [{ date, utilisee }] : retenues, inutilisées et taux
// d'inutilisation (en %, null sans page préparée). Chaque page inutilisée coûte un tour de plus : au-delà de
// SEUIL_INUTILISEES sur les FENETRE_JOURS derniers jours (avec au moins MINIMUM_PREPARATIONS pages), la préparation
// est suspendue, pour ne pas faire grimper le coût ; elle reprend quand ces pages sortent de la fenêtre.
export const SEUIL_INUTILISEES = 0.5;
export const FENETRE_JOURS = 14;
export const MINIMUM_PREPARATIONS = 6;

export function bilanPreparations(historique = [], maintenant = Date.now()) {
  const taux = (issues) => issues.filter((p) => !p.utilisee).length / issues.length;
  const inutilisees = historique.filter((p) => !p.utilisee).length;
  const recentes = historique.filter((p) => maintenant - Date.parse(p.date) <= FENETRE_JOURS * 86_400_000);
  return {
    suspendue: recentes.length >= MINIMUM_PREPARATIONS && taux(recentes) > SEUIL_INUTILISEES,
    utilisees: historique.length - inutilisees,
    inutilisees,
    tauxInutilisation: historique.length ? Math.round(taux(historique) * 100) : null,
  };
}

// La page préparée selon `prevision` peut-elle servir pour le Rebond `action`, choisi dans la Leçon lue `lecon` (après
// le Retour du quiz) ? Il faut le même Rebond, un quiz de la page prévue réussi ou raté comme prévu, et pas de mission à
// élargir (tous les Objectifs atteints par ce quiz).
export function preparationUtilisable(prevision, action, lecon) {
  if (!prevision || prevision.action !== action) return false;
  const dernier = lecon.scores?.at(-1);
  if (!dernier || dernier.pretest || dernier.page !== prevision.page) return false;
  if ((dernier.score >= QUIZ_REUSSI) !== prevision.reussi) return false;
  return !(action === 'suivante' && tousObjectifsAtteints(lecon));
}
