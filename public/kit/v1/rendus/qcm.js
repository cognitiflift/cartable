// Kit v1 — rendu d'un QCM : les réponses dans un ordre mélangé ; toucher une réponse la choisit.
import { el } from '../dom.js';
import { melanger } from '../quiz-logique.js';

export function rendreQcm(q, { quandPrete }) {
  let choisi = null;
  const boutons = melanger(q.reponses.length).map((i) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse' }, q.reponses[i]);
    bouton.dataset.index = i;
    bouton.addEventListener('click', () => {
      if (choisi) return;
      choisi = bouton;
      bouton.classList.add('kit-choisie');
      quandPrete(i);
    });
    return bouton;
  });
  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, ...boutons),
    figer: () => boutons.forEach((b) => { b.disabled = true; }),
    montrerCorrection: ({ juste }) => {
      for (const b of boutons) if (Number(b.dataset.index) === q.bonne) b.classList.add('kit-bonne');
      if (!juste) choisi?.classList.add('kit-fausse');
    },
  };
}
