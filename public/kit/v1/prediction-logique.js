// Kit v1 — logique pure de la Prédiction (sans DOM), testée avec `node --test` (test/prediction.test.js). Le rendu est
// dans prediction.js. Ajout compatible de la v1 (spec #145, ticket #157) : une page sans Prédiction est inchangée.
//
// Avant une partie de la page, l'Élève dit ce qu'il pense. Pas de correction tout de suite : la révélation s'affiche
// quand il atteint la partie suivante ou le quiz. Hors score, hors Banque de Questions, hors Maîtrise et Étoiles ; ni
// Confiance ni « Je ne sais pas » (on devine). Déclarée en données dans la page, à l'endroit où elle s'affiche :
//   <script type="application/json" class="cartable-prediction">
//     { "id": "p1", "enonce": "…", "reponses": ["…", "…"], "bonne": 0, "revelation": "…" }
//   </script>
// `id` : identifiant stable, unique dans la page ; `reponses` : 2 ou 3 ; `bonne` : index de la bonne réponse ;
// `revelation` : la phrase qui explique, lue après « Tu avais pensé… ; en fait… ». Une déclaration mal formée est ignorée.
// Message envoyé à l'appli quand l'Élève répond (`cartable-prediction`) : { type, page, id, juste }. L'appli le note
// comme événement daté, pour les indicateurs seulement.
import { ID_MAX, TEXTE_MAX, texte } from './types/commun.js';

export const REPONSES_MIN = 2;
export const REPONSES_MAX = 3;
const ID_RE = /^[A-Za-z][\w-]*$/;

// Prédiction validée, ou null si la déclaration est mal formée.
export function lirePrediction(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const id = typeof brut.id === 'string' ? brut.id.trim() : '';
  const enonce = texte(brut.enonce);
  const revelation = texte(brut.revelation);
  const reponses = Array.isArray(brut.reponses) ? brut.reponses.map((r) => texte(r, TEXTE_MAX)) : [];
  if (id.length > ID_MAX || !ID_RE.test(id) || !enonce || !revelation) return null;
  if (reponses.length < REPONSES_MIN || reponses.length > REPONSES_MAX || reponses.some((r) => r === null)) return null;
  if (!Number.isInteger(brut.bonne) || brut.bonne < 0 || brut.bonne >= reponses.length) return null;
  return { id, enonce, reponses, bonne: brut.bonne, revelation };
}

// Les Prédictions valides d'une liste de déclarations, sans doublon d'identifiant.
export function lirePredictions(bruts) {
  const vus = new Set();
  const lues = [];
  for (const brut of Array.isArray(bruts) ? bruts : []) {
    const p = lirePrediction(brut);
    if (!p || vus.has(p.id)) continue;
    vus.add(p.id);
    lues.push(p);
  }
  return lues;
}

// Résultat envoyé à l'appli : juste ou non, sans le choix de l'Élève ni score.
export const messagePrediction = (p, choisie, page) => ({ type: 'cartable-prediction', page, id: p.id, juste: choisie === p.bonne });

// Révélation : ce que l'Élève avait pensé, puis ce qu'il en est, puis la phrase du prof.
export const texteDeRevelation = (p, choisie) =>
  `Tu avais pensé « ${p.reponses[choisie]} » ; en fait, ${choisie === p.bonne ? 'tu avais raison' : `c’était « ${p.reponses[p.bonne]} »`}. ${p.revelation}`;

const phrase = (t) => (/[.?!…:]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

// Texte lu par la Lecture à voix haute : l'énoncé et les réponses, puis la révélation une fois montrée.
export const texteDePrediction = (p, choisieRevelee = null) => [
  phrase(p.enonce), ...p.reponses.map(phrase), choisieRevelee === null ? null : texteDeRevelation(p, choisieRevelee),
].filter(Boolean).join(' ');
