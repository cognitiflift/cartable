// Kit v1 — rendu du quiz dans la Page de leçon. Toute la logique (validation, correction, score, message) est dans
// quiz-logique.js, le rendu d'une question dans question.js (partagé avec les Révisions du jour) ; ce fichier ne fait
// qu'assembler le quiz et envoyer le message à l'appli.
// Usage (voir LISEZMOI.md) : <script type="application/json" id="cartable-quiz">{…}</script>
//                            <script type="module" src="/kit/v1/quiz.js"></script>
import { lireQuiz, messageScore } from './quiz-logique.js';
import { el, rendreQuestion } from './question.js';
import { lectureActivee } from './lecture-logique.js';
import { ajouterLecturePage } from './lecture.js';
import { copieDeFigure } from './figure.js';

function demarrer() {
  // Lecture à voix haute (#76), si le Profil de l'Élève l'active : un bouton pour la page, un par question.
  const lecture = lectureActivee(location.search);
  if (lecture) ajouterLecturePage();
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
  const corrigees = new Set(); // questions corrigées (après la Confiance, ou tout de suite après « Je ne sais pas »)
  const page = location.pathname.split('/').pop();
  const fin = el('div', { className: 'kit-quiz-fin', hidden: true });
  let envoye = false;

  const terminer = () => {
    if (envoye || corrigees.size < quiz.questions.length) return;
    envoye = true;
    const message = messageScore(quiz, choix, page, confiance);
    fin.hidden = false;
    // Sans questions bonus, pas de ligne bonus : append() écrirait « null » en texte.
    fin.append(...[
      // Pré-test : hors score, on n'affiche que le nombre de bonnes réponses devinées.
      el('p', { className: 'kit-quiz-score' }, message.pretest
        ? `🔮 Tu as deviné ${message.questions.filter((q) => q.juste && !q.bonus).length} sur ${message.questions.filter((q) => !q.bonus).length}`
        : `Ton score : ${message.score} %`),
      message.bonus ? el('p', {}, `🚀 Questions bonus : ${message.bonus.reussies} sur ${message.bonus.total}`) : null,
    ].filter((e) => e != null));
    window.parent.postMessage(message, '*');
  };

  let numero = 0;
  quiz.questions.forEach((q) => {
    // `sur` : Confiance donnée ; absente après « Je ne sais pas », qui est corrigé tout de suite, comme une réponse fausse.
    zone.append(rendreQuestion(q, {
      legende: q.bonus ? '🚀 Bonus · ' : `${++numero}. `,
      lecture,
      // Figure de la page désignée par la question (spec #123) : une copie par question ; un id introuvable est ignoré.
      figure: copieDeFigure(document, q.figure),
      quandCorrigee: ({ choisie, sur }) => {
        choix[q.id] = choisie;
        if (typeof sur === 'boolean') confiance[q.id] = sur;
        corrigees.add(q.id);
        terminer();
      },
    }));
  });
  if (quiz.questions.some((q) => q.bonus)) {
    zone.append(el('p', { className: 'kit-quiz-note' }, '🚀 Les questions bonus ne comptent pas dans ton score.'));
  }
  zone.append(fin);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
else demarrer();
