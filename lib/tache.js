// Type de tâche (CONTEXT.md) : ce que l'appli demande au prof à un tour donné, dans un ensemble fermé. Le Coût d'un tour
// (lib/cout.js) et le Modèle (lib/modele.js, ADR 0005) en dépendent.
//   premiereSeance : les tours d'une Leçon qui n'a pas encore de Page de leçon ;
//   page :           une Séance suivante (le Retour de quiz, composé par l'appli, n'est pas un tour du prof) ;
//   rebond :         Étape suivante, Revoir, Défi, Réviser ;
//   propositions :   les Propositions de nouvelles Leçons, hors Leçon ;
//   variantes :      les Variantes des Questions d'une Leçon (#69), en arrière-plan, hors Séance.
export const TACHES = ['premiereSeance', 'page', 'rebond', 'propositions', 'variantes'];

// Tours d'une Leçon qui a déjà sa première page : ceux que la session neuve (#55) relance avec le préambule de relais.
export const TACHES_APRES_PREMIERE_PAGE = ['page', 'rebond'];

// Type de tâche connu, rendu tel quel ; une erreur sinon.
export function validerTache(tache) {
  if (!TACHES.includes(tache)) throw new Error(`Type de tâche inconnu : ${tache}`);
  return tache;
}
