// Kit v1 — rendu d'une question de quiz (DOM seulement), partagé par le quiz de la Page de leçon (quiz.js) et par
// les Révisions du jour de l'appli (#66) : la même question s'affiche et se corrige de la même façon partout.
// L'Élève choisit une réponse (dans un ordre mélangé), dit s'il est sûr (Confiance), puis voit la correction et
// l'explication ; « Je ne sais pas » est corrigé tout de suite, sans Confiance.
import { corriger, melanger, JE_NE_SAIS_PAS } from './quiz-logique.js';

export const el = (tag, attrs = {}, ...enfants) => {
  const n = Object.assign(document.createElement(tag), attrs);
  n.append(...enfants.filter((e) => e != null));
  return n;
};

// Question `q` (validée par lireQuiz : enonce, reponses, bonne, explication, bonus?) dans un fieldset. `legende` :
// ce qui précède l'énoncé (numéro, « 🚀 Bonus · »…). `quandCorrigee({ choisie, sur })` est appelé une fois, à la
// correction : `choisie` = index de la réponse avant mélange, ou JE_NE_SAIS_PAS ; `sur` = Confiance (absente après
// « Je ne sais pas »).
export function rendreQuestion(q, { legende = '', quandCorrigee = () => {} } = {}) {
  const retour = el('div', { className: 'kit-quiz-retour', hidden: true });
  // Confiance : après le choix d'une réponse et avant la correction, l'Élève dit s'il est sûr ou pas.
  const demande = el('div', { className: 'kit-quiz-confiance', hidden: true }, el('span', {}, 'Tu es sûr ?'));
  let choisie = null;
  let choisi = null;
  const corrigerQuestion = (sur) => {
    demande.remove();
    const { juste, bonne, explication } = corriger(q, choisie);
    for (const b of boutons) if (Number(b.dataset.index) === q.bonne) b.classList.add('kit-bonne');
    if (!juste) choisi.classList.add('kit-fausse');
    retour.hidden = false;
    retour.classList.add(juste ? 'kit-juste' : 'kit-faux');
    retour.append(
      el('strong', {}, juste ? '✅ Bravo !' : `❌ La bonne réponse : ${bonne}`),
      explication ? el('p', {}, explication) : null,
    );
    quandCorrigee({ choisie, ...(typeof sur === 'boolean' && { sur }) });
  };
  for (const [libelle, sur] of [['👍 Sûr', true], ['🤔 Pas sûr', false]]) {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-sur' }, libelle);
    bouton.addEventListener('click', () => corrigerQuestion(sur), { once: true });
    demande.append(bouton);
  }
  const choisir = (valeur, bouton) => {
    if (choisie !== null) return false;
    choisie = valeur;
    choisi = bouton;
    for (const b of [...boutons, neSaisPas]) b.disabled = true;
    bouton.classList.add('kit-choisie');
    return true;
  };
  const boutons = melanger(q.reponses.length).map((i) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse' }, q.reponses[i]);
    bouton.dataset.index = i;
    bouton.addEventListener('click', () => {
      if (choisir(i, bouton)) demande.hidden = false;
    });
    return bouton;
  });
  // « Je ne sais pas » : plutôt que deviner, l'Élève le dit ; la question compte comme fausse (voir messageScore).
  const neSaisPas = el('button', { type: 'button', className: 'kit-quiz-reponse kit-quiz-je-ne-sais-pas' }, '🤷 Je ne sais pas');
  neSaisPas.addEventListener('click', () => {
    if (choisir(JE_NE_SAIS_PAS, neSaisPas)) corrigerQuestion();
  });
  return el('fieldset', { className: `kit-quiz-question${q.bonus ? ' kit-bonus' : ''}` },
    el('legend', {}, legende, q.enonce),
    el('div', { className: 'kit-quiz-reponses' }, ...boutons, neSaisPas),
    demande,
    retour);
}
