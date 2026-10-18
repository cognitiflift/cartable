// Kit v1 — rendu d'une question de quiz (DOM seulement), partagé par le quiz de la Page de leçon (quiz.js) et par
// les Révisions du jour de l'appli (#66) : la même question s'affiche et se corrige de la même façon partout.
// L'Élève répond (selon le format de la question, voir rendus/), dit s'il est sûr (Confiance), puis voit la correction
// et l'explication ; « Je ne sais pas » est corrigé tout de suite, sans Confiance. Ce fichier ne contient que ce qui
// est commun à tous les formats ; ce qui est propre à chacun est dans rendus/<type>.js (registre : rendus/index.js).
import { corriger, estPartiel, typeDe, libelleRevoir, JE_NE_SAIS_PAS, TYPES } from './quiz-logique.js';
import { el } from './dom.js';
import { descriptionFigure, revoirFigure } from './figure.js';
import { RENDUS } from './rendus/index.js';
import { boutonLecture } from './lecture.js';
import { texteDeQuestion } from './lecture-logique.js';

export { el };

// Message de correction : juste, juste en partie (crédit partiel, spec #48) ou faux.
const messageCorrection = (correction) => {
  const { juste, bonne } = correction;
  if (juste) return '✅ Bravo !';
  if (estPartiel(correction)) return `🟡 Juste en partie. La bonne réponse : ${bonne}`;
  return `❌ La bonne réponse : ${bonne}`;
};

// Question `q` (validée par lireQuiz : type, enonce, champs du type, explication, bonus?, image?) dans un fieldset. Son
// image (US25) s'affiche sous l'énoncé ; une image qui ne se charge pas est retirée, la question reste. `legende` :
// ce qui précède l'énoncé (numéro, « 🚀 Bonus · »…). `quandCorrigee({ choisie, sur })` est appelé une fois, à la
// correction : `choisie` = réponse de l'Élève propre au type (index de la réponse avant mélange pour un QCM), ou
// JE_NE_SAIS_PAS ; `sur` = Confiance (absente après « Je ne sais pas »). `lecture` : bouton « 🔊 » qui lit la question
// (lecture à voix haute du Profil, #76), puis aussi sa correction une fois corrigée. `figure` (spec #123) : la copie de
// la figure que désigne la question (figure.js), repliée sous l'énoncé derrière un bouton « 👁 Revoir… », ou montrée
// d'office avec `figureDepliee` ; elle prend la place de l'image de la question, qui ne s'affiche que sans figure.
export function rendreQuestion(q, { legende = '', quandCorrigee = () => {}, lecture = false, figure = null, figureDepliee = false } = {}) {
  let correction = null;
  const retour = el('div', { className: 'kit-quiz-retour', hidden: true });
  // Confiance : après la réponse et avant la correction, l'Élève dit s'il est sûr ou pas.
  const demande = el('div', { className: 'kit-quiz-confiance', hidden: true }, el('span', {}, 'Tu es sûr ?'));
  // Format où l'Élève dit lui-même s'il avait la réponse (« réfléchis puis dévoile ») : ni Confiance ni « Je ne sais pas ».
  const souvenirDeclare = TYPES[typeDe(q)]?.souvenirDeclare === true;
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
  const rendu = (RENDUS[typeDe(q)] ?? RENDUS.qcm)(q, {
    quandPrete: (r) => {
      if (!repondre(r)) return;
      if (souvenirDeclare) corrigerQuestion();
      else demande.hidden = false;
    },
  });
  const corrigerQuestion = (sur) => {
    demande.remove();
    correction = corriger(q, reponse);
    rendu.montrerCorrection(correction);
    if (correction.jeNeSaisPas) neSaisPas.classList.add('kit-fausse');
    const partiel = estPartiel(correction);
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
  if (!souvenirDeclare) rendu.zone.append(neSaisPas);
  const revoir = figure && revoirFigure(figure, { libelle: libelleRevoir(descriptionFigure(figure)), deplie: figureDepliee });
  const image = !revoir && q.image && el('img', { className: 'kit-quiz-image', src: q.image.src, alt: q.image.alt });
  if (image) image.addEventListener('error', () => image.remove(), { once: true });
  return el('fieldset', { className: `kit-quiz-question kit-quiz-${typeDe(q)}${q.bonus ? ' kit-bonus' : ''}` },
    el('legend', {}, legende, q.enonce),
    lecture ? boutonLecture(() => texteDeQuestion(q, correction), { titre: 'Lire la question à voix haute' }) : null,
    revoir || image || null,
    rendu.zone,
    demande,
    retour);
}
