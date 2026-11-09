// Kit v1 — rendu de la Prédiction dans la Page de leçon (DOM seulement, ticket #157) ; la logique (validation, texte de
// la révélation, message) est dans prediction-logique.js. Chaque déclaration `<script class="cartable-prediction">` est
// remplacée, à sa place, par une carte : l'Élève touche ce qu'il pense, sans correction ; la révélation s'ouvre quand il
// atteint le titre (<h2>) de la partie suivante, ou le quiz, ou la fin de la page. Hors score : ni Confiance, ni
// « Je ne sais pas », aucune couleur de juste ou de faux.
import { lirePrediction, messagePrediction, texteDeRevelation, texteDePrediction } from './prediction-logique.js';
import { el, poser } from './dom.js';
import { boutonLecture } from './lecture.js';

export const SELECTEUR = 'script.cartable-prediction[type="application/json"]';

// Premier repère après `depart` dans la page : le titre d'une partie (h1 ou h2) ou le quiz ; à défaut, un repère posé à
// la fin de la page.
function repereApres(doc, depart, quiz) {
  const suit = (n) => n !== depart && !depart.contains(n) && Boolean(depart.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
  const candidat = [...doc.querySelectorAll('h1, h2'), ...(quiz ? [quiz] : [])].find(suit);
  if (candidat) return candidat;
  const fin = el('div', { ariaHidden: 'true', className: 'kit-prediction-fin' });
  doc.body.append(fin);
  return fin;
}

// Appelle `quandAtteint` une fois, quand `repere` est entré dans l'écran ou l'a dépassé par le haut (il a été lu).
function surveiller(repere, quandAtteint) {
  if (!('IntersectionObserver' in globalThis)) return quandAtteint();
  const observateur = new IntersectionObserver((entrees) => {
    if (!entrees.some((e) => e.isIntersecting || e.boundingClientRect.top < 0)) return;
    observateur.disconnect();
    quandAtteint();
  });
  observateur.observe(repere);
}

// Carte d'une Prédiction validée. `envoyer(message)` : l'appli est prévenue quand l'Élève répond ; `lecture` : bouton 🔊.
function rendrePrediction(p, { page, envoyer, lecture }) {
  let choisie = null;
  let atteinte = false;
  const revelation = el('div', { className: 'kit-prediction-revelation', role: 'status' });
  const boutons = p.reponses.map((texte, i) => {
    const b = el('button', { type: 'button', className: 'kit-prediction-reponse' }, texte);
    b.addEventListener('click', () => {
      if (choisie !== null) return;
      choisie = i;
      boutons.forEach((x) => { x.disabled = true; });
      b.classList.add('kit-choisie');
      b.setAttribute('aria-pressed', 'true');
      note.textContent = 'Ta réponse est gardée. Lis la suite : tu verras si tu avais vu juste.';
      envoyer(messagePrediction(p, i, page));
      if (atteinte) reveler();
    });
    return b;
  });
  const note = el('p', { className: 'kit-prediction-note' }, 'Pas de note ici : dis ce que tu penses.');
  const reveler = () => {
    poser(revelation, texteDeRevelation(p, choisie));
    note.hidden = true;
  };
  const carte = el('section', { className: 'kit-prediction', ariaLabel: 'Ton avis avant de lire' },
    el('p', { className: 'kit-prediction-etiquette' }, '🤔 Avant de lire, devine'),
    el('p', { className: 'kit-prediction-enonce' }, p.enonce),
    lecture ? boutonLecture(() => texteDePrediction(p, atteinte ? choisie : null), { titre: 'Lire la question à voix haute' }) : null,
    el('div', { className: 'kit-prediction-reponses', role: 'group', ariaLabel: p.enonce }, ...boutons),
    note,
    revelation);
  return {
    carte,
    // Le repère de la partie suivante a été atteint : la révélation s'ouvre si l'Élève a déjà répondu, sinon dès qu'il répond.
    atteindre: () => { atteinte = true; if (choisie !== null) reveler(); },
  };
}

// Remplace chaque déclaration de la page par sa carte ; une déclaration mal formée ou illisible est retirée sans bruit.
// `quiz` : le quiz de la page (lireQuiz) ou null ; un Pré-test n'a pas de Prédiction. `zoneQuiz` : où il s'affiche.
export function montrerPredictions(doc, { page, envoyer, lecture = false, pretest = false, zoneQuiz = null }) {
  const vus = new Set();
  for (const source of [...doc.querySelectorAll(SELECTEUR)]) {
    let p = null;
    try {
      p = lirePrediction(JSON.parse(source.textContent));
    } catch {
      p = null;
    }
    if (!p || pretest || vus.has(p.id)) { source.remove(); continue; }
    vus.add(p.id);
    const { carte, atteindre } = rendrePrediction(p, { page, envoyer, lecture });
    source.replaceWith(carte);
    surveiller(repereApres(doc, carte, zoneQuiz), atteindre);
  }
}
