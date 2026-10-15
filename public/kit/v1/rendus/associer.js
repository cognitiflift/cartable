// Kit v1 — rendu de « associer » (spec #48, ticket #71) : deux colonnes mélangées chacune. Toucher un élément d'une
// colonne le sélectionne, puis toucher un élément de l'autre colonne les relie : les deux portent alors le même numéro.
// Toucher un élément déjà relié défait son lien (et le sélectionne). « Valider » quand tous sont reliés.
import { el } from '../dom.js';
import { melanger } from '../quiz-logique.js';

export function rendreAssocier(q, { quandPrete }) {
  const n = q.paires.length;
  const liens = q.paires.map(() => null); // pour chaque élément de gauche (index dans paires), l'index de droite relié
  let selection = null; // { cote: 0 (gauche) ou 1 (droite), index }
  let fige = false;
  const ordres = [melanger(n), melanger(n)];
  // Numéro affiché d'un lien : la place (à partir de 1) de son élément de gauche dans la colonne affichée.
  const numero = (gauche) => ordres[0].indexOf(gauche) + 1;
  const gaucheDe = (cote, index) => (cote === 0 ? index : liens.indexOf(index));

  const choisir = (cote, index) => {
    const lie = gaucheDe(cote, index);
    if (lie >= 0 && liens[lie] !== null) liens[lie] = null;
    if (selection?.cote === cote && selection.index === index) selection = null;
    else if (selection && selection.cote !== cote) {
      const [gauche, droite] = cote === 0 ? [index, selection.index] : [selection.index, index];
      const ancien = liens.indexOf(droite);
      if (ancien >= 0) liens[ancien] = null;
      liens[gauche] = droite;
      selection = null;
    } else selection = { cote, index };
    rafraichir();
  };

  const colonnes = ordres.map((ordre, cote) => ordre.map((index) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse kit-associer-element' });
    bouton.addEventListener('click', () => {
      if (!fige) choisir(cote, index);
    });
    return { bouton, index };
  }));

  function rafraichir() {
    colonnes.forEach((colonne, cote) => colonne.forEach(({ bouton, index }) => {
      const gauche = gaucheDe(cote, index);
      const relie = gauche >= 0 && liens[gauche] !== null;
      const choisi = selection?.cote === cote && selection.index === index;
      const texte = q.paires[index][cote];
      bouton.replaceChildren(el('span', { className: 'kit-associer-numero' }, relie ? String(numero(gauche)) : ''), texte);
      bouton.setAttribute('aria-pressed', String(choisi));
      bouton.setAttribute('aria-label', relie ? `${texte}, relié à « ${q.paires[cote === 0 ? liens[gauche] : gauche][1 - cote]} »` : texte);
      bouton.classList.toggle('kit-choisie', choisi);
      bouton.classList.toggle('kit-associer-relie', relie);
      bouton.disabled = fige;
    }));
    valider.disabled = fige || liens.includes(null);
  }

  const valider = el('button', { type: 'button', className: 'kit-quiz-valider' }, '✔️ Valider');
  valider.addEventListener('click', () => {
    if (!liens.includes(null)) quandPrete([...liens]);
  });
  rafraichir();

  const grille = el('div', { className: 'kit-associer' },
    ...colonnes.map((colonne) => el('div', { className: 'kit-associer-colonne' }, ...colonne.map((c) => c.bouton))));
  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, grille, valider),
    figer: () => {
      fige = true;
      selection = null;
      rafraichir();
      valider.hidden = true;
    },
    montrerCorrection: ({ detail }) => {
      if (!detail) return;
      colonnes.forEach((colonne, cote) => colonne.forEach(({ bouton, index }) => {
        const gauche = gaucheDe(cote, index);
        bouton.classList.add(liens[gauche] === gauche ? 'kit-bonne' : 'kit-fausse');
      }));
    },
  };
}
