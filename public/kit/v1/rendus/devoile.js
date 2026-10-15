// Kit v1 — rendu de « réfléchis puis dévoile » (spec #48, ticket #72) : l'Élève réfléchit, touche « Dévoiler » pour voir
// la réponse, puis dit s'il l'avait (« je l'avais », « à moitié », « je ne l'avais pas »), comme une carte de révision.
// Son auto-évaluation est sa réponse : question.js ne demande ni Confiance ni « Je ne sais pas » (type autoEvaluation).
import { el } from '../dom.js';
import { AUTO_EVALUATIONS } from '../types/devoile.js';

const EMOJIS = { avais: '😀', moitie: '😐', pas: '😕' };

export function rendreDevoile(q, { quandPrete }) {
  const reponse = el('p', { className: 'kit-devoile-reponse', hidden: true }, q.reponse);
  const consigne = el('p', { className: 'kit-devoile-consigne' }, 'Réfléchis à la réponse dans ta tête, puis dévoile-la.');
  const boutons = Object.entries(AUTO_EVALUATIONS).map(([cle, { libelle }]) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse' }, `${EMOJIS[cle]} ${libelle}`);
    bouton.addEventListener('click', () => {
      bouton.classList.add('kit-choisie');
      quandPrete(cle);
    });
    return bouton;
  });
  const evaluation = el('div', { className: 'kit-devoile-evaluation', hidden: true }, el('span', {}, 'Tu l’avais ?'), ...boutons);
  const devoiler = el('button', { type: 'button', className: 'kit-quiz-valider' }, '👀 Dévoiler la réponse');
  devoiler.addEventListener('click', () => {
    devoiler.hidden = true;
    consigne.hidden = true;
    reponse.hidden = false;
    evaluation.hidden = false;
    boutons[0].focus();
  }, { once: true });
  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, consigne, devoiler, reponse, evaluation),
    figer: () => {
      devoiler.disabled = true;
      boutons.forEach((b) => { b.disabled = true; });
    },
    montrerCorrection: () => {
      reponse.hidden = false;
    },
  };
}
