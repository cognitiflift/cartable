// Kit v1 — rendu de « réfléchis puis dévoile » (spec #48, ticket #72) : l'Élève réfléchit, touche « Dévoiler » pour voir
// la réponse, puis dit s'il l'avait (« je l'avais », « à moitié », « je ne l'avais pas »).
// Ce souvenir est sa réponse : question.js ne demande ni Confiance ni « Je ne sais pas » (type souvenirDeclare).
import { el } from '../dom.js';
import { SOUVENIRS } from '../types/devoile.js';

export function rendreDevoile(q, { quandPrete }) {
  const reponse = el('p', { className: 'kit-devoile-reponse', hidden: true }, q.reponse);
  const consigne = el('p', { className: 'kit-devoile-consigne' }, 'Réfléchis à la réponse dans ta tête, puis dévoile-la.');
  const boutons = Object.entries(SOUVENIRS).map(([cle, { emoji, libelle }]) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse' }, `${emoji} ${libelle}`);
    bouton.addEventListener('click', () => {
      bouton.classList.add('kit-choisie');
      quandPrete(cle);
    });
    return bouton;
  });
  const souvenir = el('div', { className: 'kit-devoile-souvenir', hidden: true }, el('span', {}, 'Tu l’avais ?'), ...boutons);
  const devoiler = el('button', { type: 'button', className: 'kit-quiz-valider' }, '👀 Dévoiler la réponse');
  devoiler.addEventListener('click', () => {
    devoiler.hidden = true;
    consigne.hidden = true;
    reponse.hidden = false;
    souvenir.hidden = false;
    boutons[0].focus();
  }, { once: true });
  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, consigne, devoiler, reponse, souvenir),
    figer: () => {
      devoiler.disabled = true;
      boutons.forEach((b) => { b.disabled = true; });
    },
    montrerCorrection: () => {
      reponse.hidden = false;
    },
  };
}
