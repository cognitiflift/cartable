// Kit v1 — rendu d'un exemple à étapes (spec #48, ticket #73) : les étapes de la résolution, dans l'ordre. Une étape à
// compléter montre « … » puis ses propositions mélangées ; toucher une proposition la place dans l'étape (toucher une
// autre la remplace). « Valider » quand chaque étape à compléter a sa proposition.
import { el } from '../dom.js';
import { melanger } from '../quiz-logique.js';
import { propositionsDe } from '../types/etapes.js';

export function rendreEtapes(q, { quandPrete }) {
  const blocs = q.etapes.filter((e) => e.intrus).map((etape) => ({ etape, choix: null, cible: null, boutons: [] }));
  let fige = false;
  const valider = el('button', { type: 'button', className: 'kit-quiz-valider' }, '✔️ Valider');

  const rafraichir = () => {
    for (const b of blocs) {
      b.cible.textContent = b.choix === null ? '…' : propositionsDe(b.etape)[b.choix];
      for (const bouton of b.boutons) {
        const choisi = Number(bouton.dataset.index) === b.choix;
        bouton.classList.toggle('kit-choisie', choisi);
        bouton.setAttribute('aria-pressed', String(choisi));
        bouton.disabled = fige;
      }
    }
    valider.disabled = fige || blocs.some((b) => b.choix === null);
  };

  let k = 0;
  const lignes = q.etapes.map((etape, i) => {
    if (!etape.intrus) return el('li', { className: 'kit-etape' }, el('span', { className: 'kit-etape-texte' }, etape.texte));
    const bloc = blocs[k++];
    bloc.cible = el('span', { className: 'kit-etape-texte kit-etape-vide' });
    const propositions = propositionsDe(etape);
    bloc.boutons = melanger(propositions.length).map((j) => {
      const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse kit-etape-proposition' }, propositions[j]);
      bouton.dataset.index = j;
      bouton.setAttribute('aria-label', `Étape ${i + 1} : ${propositions[j]}`);
      bouton.addEventListener('click', () => {
        if (fige) return;
        bloc.choix = j;
        rafraichir();
      });
      return bouton;
    });
    return el('li', { className: 'kit-etape kit-etape-a-completer' }, bloc.cible, el('div', { className: 'kit-etape-propositions' }, ...bloc.boutons));
  });
  valider.addEventListener('click', () => {
    if (!blocs.some((b) => b.choix === null)) quandPrete(blocs.map((b) => b.choix));
  });
  rafraichir();

  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, el('ol', { className: 'kit-etapes' }, ...lignes), valider),
    figer: () => {
      fige = true;
      rafraichir();
      valider.hidden = true;
    },
    montrerCorrection: ({ detail }) => {
      for (const b of blocs) {
        for (const bouton of b.boutons) if (bouton.dataset.index === '0') bouton.classList.add('kit-bonne');
        if (!detail) continue;
        const juste = b.choix === 0;
        b.cible.classList.add(juste ? 'kit-bonne' : 'kit-fausse');
        if (!juste) b.boutons.find((bouton) => Number(bouton.dataset.index) === b.choix)?.classList.add('kit-fausse');
      }
    },
  };
}
