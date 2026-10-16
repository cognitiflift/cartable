import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendrier } from '../lib/calendrier.js';

// Dates en heure locale : les jours de l'Élève sont ceux de sa machine (voir lib/jour.js).
const a = (jour, heure = 12) => { const [an, mois, j] = jour.split('-').map(Number); return new Date(an, mois - 1, j, heure).getTime(); };
const iso = (jour, heure) => new Date(a(jour, heure)).toISOString();

// Une Leçon telle que lireLecon la renvoie, réduite à ce qui compte pour le calendrier.
const lecon = ({ id = '0001-volcans', titre = 'Les volcans', mode = 'libre', scores = [], revisions = [], terminee = null } = {}) => ({
  id, titre, mode, terminee,
  scores: scores.map(([jour, page, score = 50, marques = {}]) => ({ score, date: iso(jour), page, ...marques })),
  questions: [{ journal: revisions.map((jour) => ({ date: iso(jour), juste: false, origine: 'revision' })) }],
});

const jourDe = (cal, jour) => cal.jours.find((j) => j.jour === jour);

test('Calendrier : un Jour travaillé est pâle, plein quand l\'Objectif du jour est atteint ; une page lue sans quiz ne colore rien', () => {
  const cal = calendrier({
    lecons: [lecon({ scores: [['2026-10-14', '0002-a.html'], ['2026-10-12', '0001-pretest.html', 40, { pretest: true }]], revisions: ['2026-10-13'] })],
    maintenant: a('2026-10-14', 20),
  });
  assert.equal(cal.aujourdhui, '2026-10-14');
  assert.deepEqual(cal.jours.map((j) => [j.jour, j.etat, j.joker]), [['2026-10-12', 'pale', false], ['2026-10-13', 'pale', false], ['2026-10-14', 'plein', false]]);
  assert.equal(jourDe(calendrier({ lecons: [lecon()], maintenant: a('2026-10-16') }), '2026-10-16'), undefined);
});

test('Calendrier : 🛡️ sur les jours couverts par un Joker, 3 par semaine (lundi à dimanche), même pâles', () => {
  // Lundi 5 et vendredi 9 octobre atteints : mardi, mercredi, jeudi couverts ; samedi 10 ne l'est plus (série repartie
  // lundi 12) ; mardi 13, pâle, est couvert par un Joker de la nouvelle semaine.
  const cal = calendrier({
    lecons: [lecon({ scores: [['2026-10-05', '0002-a.html'], ['2026-10-09', '0005-d.html'], ['2026-10-12', '0003-b.html'], ['2026-10-14', '0004-c.html']], revisions: ['2026-10-13'] })],
    maintenant: a('2026-10-14', 20),
  });
  assert.deepEqual(cal.jours.filter((j) => j.joker).map((j) => [j.jour, j.etat]), [
    ['2026-10-06', 'vide'], ['2026-10-07', 'vide'], ['2026-10-08', 'vide'], ['2026-10-13', 'pale'],
  ]);
});

test('Calendrier : chaque jour dit ce qui a été fait (Leçons travaillées, quiz, Révisions du jour menées jusqu\'au bout)', () => {
  const cal = calendrier({
    lecons: [
      lecon({ scores: [['2026-10-12', '0002-a.html'], ['2026-10-12', '0002-a.html'], ['2026-10-12', '0001-pretest.html', 40, { pretest: true }]], revisions: ['2026-10-05'] }),
      lecon({ id: '0002-romains', titre: 'Les Romains', revisions: ['2026-10-12', '2026-10-13'] }),
    ],
    // Avant le premier événement, un jour avec une réponse de Révision du jour en compte une ; après, seuls les événements.
    evenements: [{ type: 'revision-terminee', date: iso('2026-10-12', 9) }, { type: 'revision-terminee', date: iso('2026-10-12', 18) }],
    maintenant: a('2026-10-14', 20),
  });
  const detail = ({ jour, lecons, quiz, revisions }) => ({ jour, lecons, quiz, revisions });
  assert.deepEqual(cal.jours.filter((j) => j.etat !== 'vide').map(detail), [
    { jour: '2026-10-05', lecons: [{ id: '0001-volcans', titre: 'Les volcans' }], quiz: 0, revisions: 1 },
    { jour: '2026-10-12', lecons: [{ id: '0001-volcans', titre: 'Les volcans' }, { id: '0002-romains', titre: 'Les Romains' }], quiz: 3, revisions: 2 },
    { jour: '2026-10-13', lecons: [{ id: '0002-romains', titre: 'Les Romains' }], quiz: 0, revisions: 0 },
  ]);
});

test('Calendrier : chaque jour dit ce qui a été gagné (Étoiles, Fusées, Paliers de Badge), sans aucun score', () => {
  const depasse = { bonus: { reussies: 2, total: 3 } };
  const cal = calendrier({
    lecons: [
      // Leçon libre : une Étoile par page réussie, une Fusée par page avec un Dépassement réussi, une fois par page.
      lecon({ scores: [['2026-10-12', '0002-a.html', 90, depasse], ['2026-10-12', '0003-b.html', 85], ['2026-10-13', '0002-a.html', 100, depasse],
        ['2026-10-13', '0004-c.html', 50], ['2026-10-13', '0001-pretest.html', 100, { pretest: true, ...depasse }]] }),
      // Leçon de révision : ses 3 Étoiles nommées, datées du quiz réussi, du premier Dépassement réussi et de sa fin.
      lecon({ id: '0003-revision', titre: 'Les fractions', mode: 'revision', terminee: iso('2026-10-14', 10),
        scores: [['2026-10-12', '0002-x.html', 60], ['2026-10-13', '0003-y.html', 80, depasse], ['2026-10-14', '0004-z.html', 90, { defi: true }]] }),
      lecon({ id: '0004-romains', titre: 'Les Romains', revisions: ['2026-10-14'] }),
    ],
    paliers: [{ id: 'curieux', emoji: '🚀', nom: 'Curieux', palier: 'bronze', jour: '2026-10-12' }],
    maintenant: a('2026-10-14', 20),
  });
  assert.deepEqual(cal.jours.map(({ jour, gains }) => ({ jour, gains })), [
    { jour: '2026-10-12', gains: { etoiles: 2, fusees: 1, paliers: [{ id: 'curieux', emoji: '🚀', nom: 'Curieux', palier: 'bronze' }] } },
    { jour: '2026-10-13', gains: { etoiles: 2, fusees: 1, paliers: [] } }, // quiz et bonus de la Leçon de révision
    { jour: '2026-10-14', gains: { etoiles: 2, fusees: 0, paliers: [] } }, // défi et Révision du jour
  ]);
  assert.doesNotMatch(JSON.stringify(cal), /score|%|reussies|juste/i);
});
