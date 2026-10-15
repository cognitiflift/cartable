// Kit v1 — rendu d'une question de quiz (DOM seulement), partagé par le quiz de la Page de leçon (quiz.js) et par
// les Révisions du jour de l'appli (#66) : la même question s'affiche et se corrige de la même façon partout.
// L'Élève répond (selon le format de la question, voir rendus/), dit s'il est sûr (Confiance), puis voit la correction
// et l'explication ; « Je ne sais pas » est corrigé tout de suite, sans Confiance. Ce fichier ne contient que ce qui
// est commun à tous les formats ; ce qui est propre à chacun est dans rendus/<type>.js (registre : rendus/index.js).
import { corriger, JE_NE_SAIS_PAS } from './quiz-logique.js';
import { el } from './dom.js';
import { RENDUS } from './rendus/index.js';

export { el };

// Message de correction : juste, juste en partie (crédit partiel, spec #48) ou faux.
const messageCorrection = ({ juste, points, bonne }) => {
  if (juste) return '✅ Bravo !';
  if (points > 0) return `🟡 Juste en partie. La bonne réponse : ${bonne}`;
  return `❌ La bonne réponse : ${bonne}`;
};

// Question `q` (validée par lireQuiz : type, enonce, champs du type, explication, bonus?, image?) dans un fieldset. Son
// image (US25) s'affiche sous l'énoncé ; une image qui ne se charge pas est retirée, la question reste. `legende` :
// ce qui précède l'énoncé (numéro, « 🚀 Bonus · »…). `quandCorrigee({ choisie, sur })` est appelé une fois, à la
// correction : `choisie` = réponse de l'Élève propre au type (index de la réponse avant mélange pour un QCM), ou
// JE_NE_SAIS_PAS ; `sur` = Confiance (absente après « Je ne sais pas »).
export function rendreQuestion(q, { legende = '', quandCorrigee = () => {} } = {}) {
  const retour = el('div', { className: 'kit-quiz-retour', hidden: true });
  // Confiance : après la réponse et avant la correction, l'Élève dit s'il est sûr ou pas.
  const demande = el('div', { className: 'kit-quiz-confiance', hidden: true }, el('span', {}, 'Tu es sûr ?'));
  let reponse = null;
  let repondu = false;
  // Une seule réponse : le format la donne quand l'Élève a fini (ou « Je ne sais pas »), puis tout est figé.
  const repondre = (r) => {
    if (repondu) return false;
    repondu = true;
    reponse = r;
    rendu.figer();
    neSaisPas.disabled = true;
    return true;
  };
  const rendu = (RENDUS[q.type ?? 'qcm'] ?? RENDUS.qcm)(q, {
    quandPrete: (r) => {
      if (repondre(r)) demande.hidden = false;
    },
  });
  const corrigerQuestion = (sur) => {
    demande.remove();
    const correction = corriger(q, reponse);
    rendu.montrerCorrection(correction);
    if (correction.jeNeSaisPas) neSaisPas.classList.add('kit-fausse');
    const partiel = !correction.juste && correction.points > 0;
    retour.hidden = false;
    retour.classList.add(correction.juste ? 'kit-juste' : partiel ? 'kit-partiel' : 'kit-faux');
    retour.append(
      el('strong', {}, messageCorrection(correction)),
      correction.explication ? el('p', {}, correction.explication) : null,
    );
    quandCorrigee({ choisie: reponse, ...(typeof sur === 'boolean' && { sur }) });
  };
  for (const [libelle, sur] of [['👍 Sûr', true], ['🤔 Pas sûr', false]]) {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-sur' }, libelle);
    bouton.addEventListener('click', () => corrigerQuestion(sur), { once: true });
    demande.append(bouton);
  }
  // « Je ne sais pas » : plutôt que deviner, l'Élève le dit ; la question compte comme fausse (voir messageScore).
  const neSaisPas = el('button', { type: 'button', className: 'kit-quiz-reponse kit-quiz-je-ne-sais-pas' }, '🤷 Je ne sais pas');
  neSaisPas.addEventListener('click', () => {
    if (!repondre(JE_NE_SAIS_PAS)) return;
    neSaisPas.classList.add('kit-choisie');
    corrigerQuestion();
  });
  rendu.zone.append(neSaisPas);
  const image = q.image && el('img', { className: 'kit-quiz-image', src: q.image.src, alt: q.image.alt });
  image?.addEventListener('error', () => image.remove(), { once: true });
  return el('fieldset', { className: `kit-quiz-question kit-quiz-${q.type ?? 'qcm'}${q.bonus ? ' kit-bonus' : ''}` },
    el('legend', {}, legende, q.enonce),
    image,
    rendu.zone,
    demande,
    retour);
}
