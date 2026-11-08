// Objectifs d'une Leçon (atteint, Retenu, À confirmer) et Pré-test : calculs purs sur les scores et la mémoire des
// Questions, sans accès disque. lib/store.js les ré-exporte.

const JOUR_MS = 86_400_000;

// Scores hors Pré-test : seuls ceux-là comptent pour la Maîtrise, les Objectifs atteints, les Étoiles et le Dépassement.
export const estPretest = (score) => score.pretest === true;
export const horsPretest = (scores = []) => scores.filter((s) => !estPretest(s));

export const QUIZ_REUSSI = 80; // score minimal d'un quiz réussi, en %

// Objectifs (textes, numérotés à partir de 1 par leur position) : atteint dès qu'un score réussi le couvre.
// En Leçon libre, les quiz faits en Révisant ne comptent pas : la révision ne rapporte rien. Le Pré-test non plus.
export function objectifsAtteints(objectifs = [], scores = [], mode) {
  const comptes = horsPretest(scores).filter((s) => s.score >= QUIZ_REUSSI && !(mode === 'libre' && s.reviser));
  const couverts = new Set(comptes.flatMap((s) => s.objectifs ?? []));
  return objectifs.map((texte, i) => ({ texte, atteint: couverts.has(i + 1) }));
}

// Retenu : Objectif atteint et couvert par au moins deux quiz réussis passés à au moins 24 heures d'intervalle. Les quiz
// faits en Révisant comptent, le Pré-test non. Calculé sur tous les scores : acquis pour toujours. `atteints` : voir
// objectifsAtteints. Un booléen par Objectif.
export function objectifsRetenus(atteints = [], scores = []) {
  const reussis = horsPretest(scores).filter((s) => s.score >= QUIZ_REUSSI && !Number.isNaN(Date.parse(s.date)));
  return atteints.map((o, i) => {
    const dates = reussis.filter((s) => s.objectifs?.includes(i + 1)).map((s) => Date.parse(s.date));
    return o.atteint && dates.length >= 2 && Math.max(...dates) - Math.min(...dates) >= JOUR_MS;
  });
}

// À confirmer : Objectif couvert par une question réussie (hors bonus) au Pré-test, et pas encore atteint par un vrai
// quiz. Un Pré-test sans résultats par question ne confirme rien. `atteints` : voir objectifsAtteints. Un booléen par
// Objectif.
function objectifsAConfirmer(atteints = [], scores = []) {
  const devines = new Set(scores.filter(estPretest).flatMap((s) => (s.questions ?? []).filter((q) => q.juste && !q.bonus).flatMap((q) => q.objectifs ?? [])));
  return atteints.map((o, i) => devines.has(i + 1) && !o.atteint);
}

// Stabilité FSRS (jours) à partir de laquelle une Question est tenue pour retenue (spec #47 : « une stabilité d'au
// moins quelques jours »). 5 jours, calés sur la règle des deux succès espacés qu'elle remplace (paramètres FSRS-5
// par défaut, voir lib/memoire.js) : une seule réponse juste donne 3,2 jours, deux le même jour 4,5 jours, deux à un
// jour d'écart 5,9 jours, deux à deux jours d'écart 8,4 jours. Une réponse fausse la fait retomber sous 2 jours.
export const STABILITE_RETENU = 5;

// Retenu d'après la mémoire (spec #47, ticket #67) : pour chaque Objectif que couvre au moins une Question de la
// Banque, true quand l'Objectif est atteint et que toutes ces Questions ont une stabilité (`stabilite`, voir lireLecon)
// d'au moins STABILITE_RETENU ;
// il suit alors la mémoire (une Question oubliée le fait perdre). null pour un Objectif qu'aucune Question ne couvre :
// il garde la règle des deux succès espacés.
export function objectifsRetenusParLaMemoire(atteints = [], questions = []) {
  return atteints.map((o, i) => {
    const couvrantes = questions.filter((q) => q.contenu?.objectifs?.includes(i + 1));
    if (!couvrantes.length) return null;
    return o.atteint && couvrantes.every((q) => (q.stabilite ?? 0) >= STABILITE_RETENU);
  });
}

// État de chaque Objectif, tel que la Leçon l'expose : { texte, atteint, retenu, aConfirmer }. `questions` : Banque de
// Questions de la Leçon avec leur mémoire (vide pour les anciennes Leçons), sur laquelle s'appuie Retenu quand elle
// couvre l'Objectif.
export function etatObjectifs(textes = [], scores = [], mode, questions = []) {
  const atteints = objectifsAtteints(textes, scores, mode);
  const parLaMemoire = objectifsRetenusParLaMemoire(atteints, questions);
  const retenus = objectifsRetenus(atteints, scores).map((r, i) => parLaMemoire[i] ?? r);
  const aConfirmer = objectifsAConfirmer(atteints, scores);
  return atteints.map((o, i) => ({ ...o, retenu: retenus[i], aConfirmer: aConfirmer[i] }));
}
