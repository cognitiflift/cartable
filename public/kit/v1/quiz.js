// Kit v1 — rendu du quiz dans la Page de leçon. Toute la logique (validation, correction, score, message) est dans
// quiz-logique.js ; ce fichier ne fait qu'afficher, écouter les clics et envoyer le message à l'appli.
// Usage (voir LISEZMOI.md) : <script type="application/json" id="cartable-quiz">{…}</script>
//                            <script type="module" src="/kit/v1/quiz.js"></script>
import { lireQuiz, corriger, melanger, messageScore } from './quiz-logique.js';

const el = (tag, attrs = {}, ...enfants) => {
  const n = Object.assign(document.createElement(tag), attrs);
  n.append(...enfants.filter((e) => e != null));
  return n;
};

function demarrer() {
  const source = document.getElementById('cartable-quiz');
  if (!source) return;
  let quiz = null;
  try {
    quiz = lireQuiz(JSON.parse(source.textContent));
  } catch (e) {
    console.error('Kit : quiz illisible', e);
  }
  const zone = el('section', { className: 'kit-quiz' });
  source.after(zone);
  if (!quiz) {
    zone.append(el('p', { className: 'kit-quiz-erreur' }, 'Ce quiz ne peut pas s’afficher.'));
    return;
  }

  const choix = {};
  const confiance = {};
  const page = location.pathname.split('/').pop();
  const fin = el('div', { className: 'kit-quiz-fin', hidden: true });
  let envoye = false;

  const terminer = () => {
    if (envoye || Object.keys(confiance).length < quiz.questions.length) return;
    envoye = true;
    const message = messageScore(quiz, choix, page, confiance);
    fin.hidden = false;
    fin.append(
      el('p', { className: 'kit-quiz-score' }, `Ton score : ${message.score} %`),
      message.bonus ? el('p', {}, `🚀 Questions bonus : ${message.bonus.reussies} sur ${message.bonus.total}`) : null,
    );
    window.parent.postMessage(message, '*');
  };

  let numero = 0;
  quiz.questions.forEach((q) => {
    const retour = el('div', { className: 'kit-quiz-retour', hidden: true });
    // Confiance : après le choix d'une réponse et avant la correction, l'Élève dit s'il est sûr ou pas.
    const demande = el('div', { className: 'kit-quiz-confiance', hidden: true }, el('span', {}, 'Tu es sûr ?'));
    let choisi = null;
    const corrigerQuestion = (sur) => {
      confiance[q.id] = sur;
      demande.remove();
      const { juste, bonne, explication } = corriger(q, choix[q.id]);
      for (const b of boutons) if (Number(b.dataset.index) === q.bonne) b.classList.add('kit-bonne');
      if (!juste) choisi.classList.add('kit-fausse');
      retour.hidden = false;
      retour.classList.add(juste ? 'kit-juste' : 'kit-faux');
      retour.append(
        el('strong', {}, juste ? '✅ Bravo !' : `❌ La bonne réponse : ${bonne}`),
        explication ? el('p', {}, explication) : null,
      );
      terminer();
    };
    for (const [libelle, sur] of [['👍 Sûr', true], ['🤔 Pas sûr', false]]) {
      const bouton = el('button', { type: 'button', className: 'kit-quiz-sur' }, libelle);
      bouton.addEventListener('click', () => corrigerQuestion(sur), { once: true });
      demande.append(bouton);
    }
    const boutons = melanger(q.reponses.length).map((i) => {
      const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse' }, q.reponses[i]);
      bouton.dataset.index = i;
      bouton.addEventListener('click', () => {
        if (q.id in choix) return;
        choix[q.id] = i;
        choisi = bouton;
        for (const b of boutons) b.disabled = true;
        bouton.classList.add('kit-choisie');
        demande.hidden = false;
      });
      return bouton;
    });
    zone.append(el('fieldset', { className: `kit-quiz-question${q.bonus ? ' kit-bonus' : ''}` },
      el('legend', {}, q.bonus ? '🚀 Bonus · ' : `${++numero}. `, q.enonce),
      el('div', { className: 'kit-quiz-reponses' }, ...boutons),
      demande,
      retour));
  });
  if (quiz.questions.some((q) => q.bonus)) {
    zone.append(el('p', { className: 'kit-quiz-note' }, '🚀 Les questions bonus ne comptent pas dans ton score.'));
  }
  zone.append(fin);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
else demarrer();
