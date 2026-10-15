// Kit v1 — rendu d'un exemple à étapes (spec #48, ticket #73) : les étapes de la résolution, dans l'ordre. Une étape à
// compléter montre « … » puis ses propositions mélangées ; toucher une proposition la place dans l'étape (toucher une
// autre la remplace). « Valider » quand chaque étape à compléter a sa proposition.
import { el } from '../dom.js';
import { melanger, reponseAttendue } from '../quiz-logique.js';
import { propositionsDe, aCompleter } from '../types/etapes.js';
import { validation } from './commun.js';

export function rendreEtapes(q, { quandPrete }) {
  const blocs = aCompleter(q).map((etape) => ({ etape, choix: null, cible: null, boutons: [] }));
  const reponse = () => (blocs.some((b) => b.choix === null) ? null : blocs.map((b) => b.choix));
  const valider = validation({ quandPrete, reponse, rafraichir });

  function rafraichir() {
    for (const b of blocs) {
      b.cible.textContent = b.choix === null ? '…' : propositionsDe(b.etape)[b.choix];
      for (const bouton of b.boutons) {
        const choisi = Number(bouton.dataset.index) === b.choix;
        bouton.classList.toggle('kit-choisie', choisi);
        bouton.setAttribute('aria-pressed', String(choisi));
        bouton.disabled = valider.fige;
      }
    }
    valider.actualiser();
  }

  const lignes = q.etapes.map((etape, i) => {
    const bloc = blocs.find((b) => b.etape.numero === i + 1);
    if (!bloc) return el('li', { className: 'kit-etape' }, el('span', { className: 'kit-etape-texte' }, etape.texte));
    bloc.cible = el('span', { className: 'kit-etape-texte kit-etape-vide' });
    const propositions = propositionsDe(etape);
    bloc.boutons = melanger(propositions.length).map((j) => {
      const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse kit-etape-proposition' }, propositions[j]);
      bouton.dataset.index = j;
      bouton.setAttribute('aria-label', `Étape ${i + 1} : ${propositions[j]}`);
      bouton.addEventListener('click', () => {
        if (valider.fige) return;
        bloc.choix = j;
        rafraichir();
      });
      return bouton;
    });
    return el('li', { className: 'kit-etape kit-etape-a-completer' }, bloc.cible, el('div', { className: 'kit-etape-propositions' }, ...bloc.boutons));
  });
  rafraichir();

  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, el('ol', { className: 'kit-etapes' }, ...lignes), valider.bouton),
    figer: valider.figer,
    montrerCorrection: ({ detail }) => {
      // Sans réponse (« Je ne sais pas ») : la bonne proposition dans chaque étape à compléter.
      if (!detail) {
        reponseAttendue(q).forEach((choix, k) => { blocs[k].choix = choix; });
        rafraichir();
      }
      for (const b of blocs) {
        for (const bouton of b.boutons) if (bouton.dataset.index === '0') bouton.classList.add('kit-bonne');
        const juste = b.choix === 0;
        b.cible.classList.add(juste ? 'kit-bonne' : 'kit-fausse');
        if (!juste) b.boutons.find((bouton) => Number(bouton.dataset.index) === b.choix)?.classList.add('kit-fausse');
      }
    },
  };
}
