// Kit v1 — type `trous` (spec #48, ticket #70) : texte à trous avec banque de mots. L'Élève complète la phrase en
// touchant des mots proposés ; il y a toujours plus de mots que de trous (au moins un intrus), pour qu'il ne trouve pas
// le dernier par élimination.
// Écrit par le prof : { texte: "La lave sort par le [cratère] du [volcan].", intrus: ["nuage", …] }
// Validé : { segments: [texte entre les trous…], trous: [mot attendu…], intrus: [mot…] } (segments : un de plus que trous).
// Réponse de l'Élève : pour chaque trou, l'index du mot placé dans la banque avant mélange (motsDe), chaque mot une fois.
// Crédit partiel : part des trous bien remplis. Détail transmis : { places: [mot placé dans chaque trou…] }.
import { texte, textes, indexDistincts, TEXTE_MAX } from './commun.js';

export const TROUS_MAX = 10;
export const MOTS_INTRUS_MAX = 10;
export const MOT_MAX = 100;

// Banque de mots avant mélange : les mots attendus, dans l'ordre des trous, puis les intrus.
export const motsDe = (q) => [...q.trous, ...q.intrus];

// Phrase avec `mots` dans les trous, entre crochets : « La lave sort par le [cratère] du [volcan]. »
const phrase = (q, mots) => q.segments.map((s, i) => (i < mots.length ? `${s}[${mots[i]}]` : s)).join('');

export const trous = {
  valider(q) {
    if (typeof q.texte !== 'string') return null;
    const parties = q.texte.trim().split(/\[([^[\]]*)\]/);
    const segments = parties.filter((_, i) => i % 2 === 0);
    const attendus = parties.filter((_, i) => i % 2 === 1).map((m) => texte(m, MOT_MAX));
    if (!attendus.length || attendus.length > TROUS_MAX || !attendus.every(Boolean)) return null;
    if (segments.some((s) => /[[\]]/.test(s))) return null; // crochet mal fermé
    const intrus = [...new Set(textes(q.intrus, { max: MOT_MAX }) ?? [])].filter((m) => !attendus.includes(m)).slice(0, MOTS_INTRUS_MAX);
    if (!intrus.length) return null;
    return { segments: segments.map((s) => s.slice(0, TEXTE_MAX)), trous: attendus, intrus };
  },
  corriger(q, reponse) {
    const mots = motsDe(q);
    const bonne = phrase(q, q.trous);
    if (!indexDistincts(reponse, q.trous.length, mots.length)) return { points: 0, bonne, choisie: null };
    const places = reponse.map((i) => mots[i]);
    const points = places.filter((m, i) => m === q.trous[i]).length / q.trous.length;
    return { points, bonne, choisie: phrase(q, places), detail: { places } };
  },
  lireDetail(brut) {
    const places = textes(brut?.places, { max: MOT_MAX, nombreMax: TROUS_MAX });
    return places?.length ? { places } : null;
  },
};
