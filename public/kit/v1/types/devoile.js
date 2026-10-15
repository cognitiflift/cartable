// Kit v1 — type `devoile` (spec #48, ticket #72) : « réfléchis puis dévoile ». L'Élève essaie de se rappeler la
// réponse dans sa tête, la dévoile, puis dit lui-même s'il l'avait, comme avec une carte de révision.
// Écrit par le prof : { reponse: texte }, la réponse attendue, montrée quand l'Élève la dévoile.
// Réponse de l'Élève : son auto-évaluation, une clé de AUTO_EVALUATIONS (« avais », « moitie » ou « pas »).
// Points : « je l'avais » = juste (1), « à moitié » = 0,5, « je ne l'avais pas » = faux (0). `choisie` : le libellé
// de l'auto-évaluation, `bonne` : la réponse dévoilée.
// Rien ne vérifie la réponse : ce format est `minoritaire` (au plus une part minoritaire des questions comptées dans
// le score, voir lireQuiz) pour ne pas permettre de gonfler le score. Pas de Confiance ni de « Je ne sais pas » : l'auto-
// évaluation les remplace (« je l'avais » vaut juste et sûr, « à moitié » juste en partie, « je ne l'avais pas » faux).
import { texte } from './commun.js';

export const AUTO_EVALUATIONS = {
  avais: { libelle: 'Je l’avais', points: 1 },
  moitie: { libelle: 'À moitié', points: 0.5 },
  pas: { libelle: 'Je ne l’avais pas', points: 0 },
};

export const devoile = {
  minoritaire: true,
  autoEvaluation: true,
  valider(q) {
    const reponse = texte(q.reponse);
    return reponse ? { reponse } : null;
  },
  corriger(q, reponse) {
    const evaluation = typeof reponse === 'string' && Object.hasOwn(AUTO_EVALUATIONS, reponse) ? AUTO_EVALUATIONS[reponse] : null;
    return evaluation
      ? { points: evaluation.points, bonne: q.reponse, choisie: evaluation.libelle }
      : { points: 0, bonne: q.reponse, choisie: null };
  },
};
