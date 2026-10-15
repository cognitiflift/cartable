// Kit v1 — type `devoile` (spec #48, ticket #72) : « réfléchis puis dévoile ». L'Élève essaie de se rappeler la
// réponse dans sa tête, la dévoile, puis dit lui-même s'il l'avait (son souvenir).
// Écrit par le prof : { reponse: texte }, la réponse attendue, montrée quand l'Élève la dévoile.
// Réponse de l'Élève : son souvenir, une clé de SOUVENIRS (« avais », « moitie » ou « pas »).
// Points : « je l'avais » = juste (1), « à moitié » = 0,5, « je ne l'avais pas » = faux (0). `choisie` : le libellé
// du souvenir, `bonne` : la réponse dévoilée.
// Rien ne vérifie la réponse : ce format est `minoritaire` (au plus une part minoritaire des questions comptées dans
// le score, voir lireQuiz) pour ne pas permettre de gonfler le score. Pas de Confiance ni de « Je ne sais pas » : le
// souvenir dit par l'Élève les remplace (« je l'avais » vaut juste et sûr, « à moitié » juste en partie, « je ne l'avais pas » faux).
import { texte } from './commun.js';

// Souvenirs possibles, dans l'ordre d'affichage, avec leur bouton (emoji et libellé) et leurs points.
export const SOUVENIRS = {
  avais: { emoji: '😀', libelle: 'Je l’avais', points: 1 },
  moitie: { emoji: '😐', libelle: 'À moitié', points: 0.5 },
  pas: { emoji: '😕', libelle: 'Je ne l’avais pas', points: 0 },
};

export const devoile = {
  minoritaire: true,
  souvenirDeclare: true,
  valider(q) {
    const reponse = texte(q.reponse);
    return reponse ? { reponse } : null;
  },
  reponseAttendue: () => 'avais',
  corriger(q, reponse) {
    const souvenir = typeof reponse === 'string' && Object.hasOwn(SOUVENIRS, reponse) ? SOUVENIRS[reponse] : null;
    return souvenir
      ? { points: souvenir.points, bonne: q.reponse, choisie: souvenir.libelle }
      : { points: 0, bonne: q.reponse, choisie: null };
  },
};
