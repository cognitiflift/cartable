// Kit v1 — rendu de « remettre dans l'ordre » (spec #48, ticket #70) : les éléments mélangés (jamais déjà dans le bon
// ordre), en liste. En touchant : toucher un élément puis un autre les échange ; ou les flèches ⬆️ ⬇️ le déplacent
// d'une place. À la souris, on peut aussi le glisser (seulement d'une ligne de cette liste vers une autre). « Valider »
// envoie l'ordre proposé.
import { el } from '../dom.js';
import { melanger, reponseAttendue } from '../quiz-logique.js';
import { bienPlaces } from '../types/ordre.js';
import { validation } from './commun.js';

export function rendreOrdre(q, { quandPrete }) {
  let ordre = melanger(q.elements.length);
  if (ordre.every((v, i) => v === i)) ordre.push(ordre.shift());
  let selection = null;
  let glissee = null; // position de la ligne en train d'être glissée dans cette liste ; null sinon
  const liste = el('ol', { className: 'kit-ordre' });
  const valider = validation({ quandPrete, reponse: () => [...ordre], rafraichir });

  // Déplace l'élément de la position `de` à la position `vers`, puis remet le focus sur le bouton `garder` déplacé.
  const deplacer = (de, vers, garder) => {
    if (valider.fige || vers < 0 || vers >= ordre.length || de === vers) return;
    ordre.splice(vers, 0, ...ordre.splice(de, 1));
    selection = null;
    rafraichir();
    liste.children[vers]?.querySelector(garder)?.focus();
  };
  const echanger = (a, b) => {
    [ordre[a], ordre[b]] = [ordre[b], ordre[a]];
    selection = null;
    rafraichir();
    liste.children[b]?.querySelector('.kit-ordre-texte')?.focus();
  };

  const ligne = (index, position) => {
    const texte = el('button', { type: 'button', className: 'kit-quiz-reponse kit-ordre-texte', disabled: valider.fige }, q.elements[index]);
    texte.setAttribute('aria-pressed', String(selection === position));
    if (selection === position) texte.classList.add('kit-choisie');
    texte.addEventListener('click', () => {
      if (selection === null) {
        selection = position;
        rafraichir();
        liste.children[position]?.querySelector('.kit-ordre-texte')?.focus();
      } else if (selection === position) {
        selection = null;
        rafraichir();
      } else echanger(selection, position);
    });
    const monter = el('button', { type: 'button', className: 'kit-ordre-fleche', disabled: valider.fige || position === 0, title: 'Monter' }, '⬆️');
    monter.setAttribute('aria-label', `Monter « ${q.elements[index]} »`);
    monter.addEventListener('click', () => deplacer(position, position - 1, '.kit-ordre-fleche'));
    const descendre = el('button', { type: 'button', className: 'kit-ordre-fleche', disabled: valider.fige || position === ordre.length - 1, title: 'Descendre' }, '⬇️');
    descendre.setAttribute('aria-label', `Descendre « ${q.elements[index]} »`);
    descendre.addEventListener('click', () => deplacer(position, position + 1, '.kit-ordre-fleche:last-child'));
    const li = el('li', { className: 'kit-ordre-element', draggable: !valider.fige }, texte, monter, descendre);
    li.addEventListener('dragstart', (e) => {
      glissee = position;
      e.dataTransfer.setData('text/plain', q.elements[index]); // sans donnée, certains navigateurs ne glissent pas
    });
    li.addEventListener('dragend', () => {
      glissee = null;
    });
    li.addEventListener('dragover', (e) => {
      if (glissee !== null) e.preventDefault();
    });
    // Seule une ligne de cette liste se dépose : un texte ou une ligne glissés d'ailleurs sont ignorés.
    li.addEventListener('drop', (e) => {
      if (glissee === null) return;
      e.preventDefault();
      const de = glissee;
      glissee = null;
      deplacer(de, position, '.kit-ordre-texte');
    });
    return li;
  };
  function rafraichir() {
    liste.replaceChildren(...ordre.map(ligne));
    valider.actualiser();
  }
  rafraichir();

  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, liste, valider.bouton),
    figer: () => {
      selection = null;
      valider.figer();
    },
    montrerCorrection: ({ detail }) => {
      // Sans réponse (« Je ne sais pas ») : les éléments dans le bon ordre.
      if (!detail) {
        ordre = reponseAttendue(q);
        rafraichir();
      }
      const bien = new Set(bienPlaces(ordre));
      [...liste.children].forEach((li, i) => li.querySelector('.kit-ordre-texte').classList.add(bien.has(i) ? 'kit-bonne' : 'kit-fausse'));
    },
  };
}
