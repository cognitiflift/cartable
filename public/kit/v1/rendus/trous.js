// Kit v1 — rendu d'un texte à trous (spec #48, ticket #70) : la phrase avec ses trous, puis la banque de mots
// mélangée. Toucher un mot le place dans le trou sélectionné (au départ, le premier trou vide) ; toucher un trou rempli
// rend son mot à la banque, toucher un trou vide le sélectionne. Quand tous les trous sont remplis, les mots restants
// sont désactivés : pour changer un mot, on vide d'abord son trou. « Valider » quand tous les trous sont remplis.
import { el } from '../dom.js';
import { melanger, reponseAttendue } from '../quiz-logique.js';
import { motsDe } from '../types/trous.js';
import { validation } from './commun.js';

export function rendreTrous(q, { quandPrete }) {
  const mots = motsDe(q);
  let places = q.trous.map(() => null); // index du mot (dans `mots`) placé dans chaque trou
  // Premier trou vide, ou null quand tous sont remplis.
  const premierVide = () => (places.includes(null) ? places.indexOf(null) : null);
  let actif = premierVide();
  const valider = validation({ quandPrete, reponse: () => (places.includes(null) ? null : [...places]), rafraichir });

  const cases = q.trous.map((_, i) => {
    const bouton = el('button', { type: 'button', className: 'kit-trou' });
    bouton.addEventListener('click', () => {
      if (places[i] !== null) places[i] = null;
      actif = i;
      rafraichir();
    });
    return bouton;
  });
  const boutonsMots = melanger(mots.length).map((j) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse kit-mot' }, mots[j]);
    bouton.addEventListener('click', () => {
      const trou = actif !== null && places[actif] === null ? actif : premierVide();
      if (places.includes(j) || trou === null) return;
      places[trou] = j;
      actif = premierVide();
      rafraichir();
    });
    bouton.dataset.index = j;
    return bouton;
  });

  function rafraichir() {
    cases.forEach((c, i) => {
      c.textContent = places[i] === null ? '…' : mots[places[i]];
      c.setAttribute('aria-label', `Trou ${i + 1} : ${places[i] === null ? 'vide' : mots[places[i]]}`);
      c.classList.toggle('kit-trou-actif', !valider.fige && i === actif);
      c.disabled = valider.fige;
    });
    const plein = !places.includes(null);
    for (const b of boutonsMots) b.disabled = valider.fige || plein || places.includes(Number(b.dataset.index));
    valider.actualiser();
  }
  rafraichir();

  const phrase = el('p', { className: 'kit-trous-phrase' }, ...q.segments.flatMap((s, i) => [s, cases[i] ?? null]));
  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, phrase, el('div', { className: 'kit-trous-banque' }, ...boutonsMots), valider.bouton),
    figer: valider.figer,
    montrerCorrection: ({ detail }) => {
      // Sans réponse (« Je ne sais pas ») : les bons mots dans les trous.
      if (!detail) {
        places = reponseAttendue(q);
        rafraichir();
      }
      cases.forEach((c, i) => c.classList.add(mots[places[i]] === q.trous[i] ? 'kit-bonne' : 'kit-fausse'));
    },
  };
}
