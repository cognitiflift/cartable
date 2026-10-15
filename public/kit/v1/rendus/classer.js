// Kit v1 — rendu de « classer » (spec #48, ticket #71) : les éléments mélangés, à ranger, puis une case par catégorie.
// L'élément sélectionné (au départ, le premier à ranger) se range en touchant le bouton de sa catégorie ; la sélection
// passe alors au suivant. Toucher un élément, rangé ou non, le sélectionne pour le (re)ranger ; toucher l'élément déjà
// sélectionné le laisse sélectionné (l'élève qui suit « touche un élément, puis la catégorie » ne le désélectionne pas).
// « Valider » quand tout est rangé.
import { el } from '../dom.js';
import { melanger, reponseAttendue } from '../quiz-logique.js';
import { elementsDe } from '../types/classer.js';
import { validation } from './commun.js';

export function rendreClasser(q, { quandPrete }) {
  const elements = elementsDe(q);
  const ordre = melanger(elements.length);
  let rangement = elements.map(() => null); // pour chaque élément, l'index de la catégorie choisie
  let selection = ordre[0];
  const valider = validation({ quandPrete, reponse: () => (rangement.includes(null) ? null : [...rangement]), rafraichir });
  const suivant = () => ordre.find((i) => rangement[i] === null) ?? null;

  const boutons = elements.map(({ texte }, i) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse kit-classer-element' }, texte);
    bouton.addEventListener('click', () => {
      if (valider.fige) return;
      selection = i;
      rafraichir();
    });
    return bouton;
  });
  const aRanger = el('div', { className: 'kit-classer-a-ranger' });
  const cases = q.categories.map(({ nom }, c) => {
    const ranger = el('button', { type: 'button', className: 'kit-quiz-valider kit-classer-ranger' }, nom);
    ranger.addEventListener('click', () => {
      if (valider.fige || selection === null) return;
      rangement[selection] = c;
      selection = suivant();
      rafraichir();
      if (selection === null) valider.bouton.focus(); // tout est rangé : le bouton touché vient d'être désactivé
    });
    return { ranger, contenu: el('div', { className: 'kit-classer-contenu' }), nom };
  });

  function rafraichir() {
    aRanger.replaceChildren(...ordre.filter((i) => rangement[i] === null).map((i) => boutons[i]));
    cases.forEach(({ ranger, contenu, nom }, c) => {
      contenu.replaceChildren(...ordre.filter((i) => rangement[i] === c).map((i) => boutons[i]));
      ranger.disabled = valider.fige || selection === null;
      ranger.setAttribute('aria-label', selection === null ? nom : `Ranger « ${elements[selection].texte} » dans ${nom}`);
    });
    boutons.forEach((b, i) => {
      b.disabled = valider.fige;
      b.classList.toggle('kit-choisie', i === selection);
      b.setAttribute('aria-pressed', String(i === selection));
    });
    aRanger.hidden = !rangement.includes(null);
    valider.actualiser();
  }
  rafraichir();

  const grille = el('div', { className: 'kit-classer' },
    ...cases.map(({ ranger, contenu }) => el('div', { className: 'kit-classer-categorie' }, ranger, contenu)));
  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, aRanger, grille, valider.bouton),
    figer: () => {
      selection = null;
      valider.figer();
    },
    montrerCorrection: ({ detail }) => {
      // Sans réponse (« Je ne sais pas ») : chaque élément rangé dans sa catégorie.
      if (!detail) {
        rangement = reponseAttendue(q);
        rafraichir();
      }
      boutons.forEach((b, i) => b.classList.add(rangement[i] === elements[i].categorie ? 'kit-bonne' : 'kit-fausse'));
    },
  };
}
