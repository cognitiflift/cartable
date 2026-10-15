// Kit v1 — type `etapes` (spec #48, ticket #73) : exemple travaillé de mathématiques dont une ou plusieurs étapes sont à
// compléter. Le Kit montre les étapes dans l'ordre ; à chaque étape à compléter, l'Élève touche la bonne proposition
// parmi la bonne étape et ses intrus (les erreurs fréquentes), mélangés.
// Écrit par le prof : { etapes: [{ texte }, { texte, intrus: [texte…] }, …] }, de 2 à 10 étapes dans l'ordre de la
// résolution ; une étape avec `intrus` (1 à 4, différents de `texte`) est à compléter, au moins une par question.
// Réponse de l'Élève : pour chaque étape à compléter, dans l'ordre, l'index choisi dans propositionsDe(etape) (avant
// mélange). Crédit partiel : part des étapes à compléter bien choisies. Détail transmis : { choix: [texte choisi…] }.
import { texte, textes, estIndex } from './commun.js';

export const ETAPES_MIN = 2;
export const ETAPES_MAX = 10;
export const INTRUS_PAR_ETAPE_MAX = 4;

// Propositions d'une étape à compléter, avant mélange : la bonne d'abord, puis ses intrus.
export const propositionsDe = (etape) => [etape.texte, ...etape.intrus];

// Étapes à compléter, avec leur numéro (à partir de 1) dans l'exemple.
export const aCompleter = (q) => q.etapes.flatMap((e, i) => (e.intrus ? [{ ...e, numero: i + 1 }] : []));

// Une étape écrite par le prof : { texte } à montrer telle quelle, ou { texte, intrus } à compléter (1 à
// INTRUS_PAR_ETAPE_MAX intrus, tous différents de `texte` et entre eux) ; null si elle est mal formée.
function validerEtape(brut) {
  const t = texte(brut?.texte);
  if (!t) return null;
  if (brut.intrus === undefined) return { texte: t };
  const intrus = textes(brut.intrus, { nombreMax: INTRUS_PAR_ETAPE_MAX });
  if (!intrus?.length || new Set([t, ...intrus]).size !== intrus.length + 1) return null;
  return { texte: t, intrus };
}

// « étape 2 : … ; étape 4 : … » : le texte de chaque étape à compléter, pour le prof.
const resume = (etapes, textesChoisis) => etapes.map((e, i) => `étape ${e.numero} : ${textesChoisis[i]}`).join(' ; ');

export const etapes = {
  valider(q) {
    if (!Array.isArray(q.etapes) || q.etapes.length < ETAPES_MIN || q.etapes.length > ETAPES_MAX) return null;
    const lues = q.etapes.map(validerEtape);
    if (!lues.every(Boolean) || !lues.some((e) => e.intrus)) return null;
    return { etapes: lues };
  },
  reponseAttendue: (q) => aCompleter(q).map(() => 0),
  corriger(q, reponse) {
    const trous = aCompleter(q);
    const bonne = resume(trous, trous.map((e) => e.texte));
    const possible = Array.isArray(reponse) && reponse.length === trous.length && reponse.every((i, k) => estIndex(i, propositionsDe(trous[k]).length));
    if (!possible) return { points: 0, bonne, choisie: null };
    const choix = reponse.map((i, k) => propositionsDe(trous[k])[i]);
    return { points: reponse.filter((i) => i === 0).length / trous.length, bonne, choisie: resume(trous, choix), detail: { choix } };
  },
  lireDetail(brut) {
    const choix = textes(brut?.choix, { nombreMax: ETAPES_MAX });
    return choix?.length ? { choix } : null;
  },
};
