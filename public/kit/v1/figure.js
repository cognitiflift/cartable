// Kit v1 — figure d'une question (spec #123, DOM seulement) : la copie d'une figure du Kit (`kit-figure`) de la page,
// que la question remontre sous son énoncé, repliée derrière un bouton « 👁 Revoir… » dans le quiz de page, ou dépliée
// d'office. Le libellé du bouton vient de libelleRevoir (quiz-logique.js), d'après descriptionFigure.
import { el } from './dom.js';

let copies = 0; // pour donner à chaque copie un id unique, que son bouton désigne (aria-controls)

// Copie de la figure du Kit d'id `id` dans `doc`, ou null si aucune figure du Kit de la page ne porte cet id. La
// copie perd l'id de la figure (il resterait en double dans la page) et se range sous la question (kit-quiz-figure).
export function copieDeFigure(doc, id) {
  const figure = id ? doc.getElementById(id) : null;
  if (!figure || figure.tagName !== 'FIGURE' || !figure.classList.contains('kit-figure')) return null;
  const copie = figure.cloneNode(true);
  copie.removeAttribute('id');
  copie.classList.add('kit-quiz-figure');
  return copie;
}

// Ce que montre la figure, pour libelleRevoir : le texte de sa légende sans le crédit, et la balise de son visuel.
export function descriptionFigure(figure) {
  const legende = figure.querySelector('figcaption')?.cloneNode(true);
  legende?.querySelectorAll('.kit-credit').forEach((c) => c.remove());
  const visuel = ['blockquote', 'img', 'svg'].find((b) => figure.querySelector(b)) ?? null;
  return { legende: legende?.textContent.trim() ?? '', visuel };
}

// Bloc à placer sous l'énoncé : le bouton « Revoir… » (`libelle`), qui déplie et replie la copie sur place, sans
// faire défiler la page, et annonce son état (aria-expanded) ; ou, `deplie`, la copie seule, montrée d'office.
export function revoirFigure(copie, { libelle, deplie = false }) {
  if (deplie) {
    copie.hidden = false;
    return el('div', { className: 'kit-revoir' }, copie);
  }
  copie.id = `kit-revoir-${++copies}`;
  copie.hidden = true;
  const bouton = el('button', { type: 'button', className: 'kit-revoir-bouton' }, libelle);
  bouton.setAttribute('aria-controls', copie.id);
  bouton.setAttribute('aria-expanded', 'false');
  bouton.addEventListener('click', () => {
    copie.hidden = !copie.hidden;
    bouton.setAttribute('aria-expanded', String(!copie.hidden));
  });
  return el('div', { className: 'kit-revoir' }, bouton, copie);
}
