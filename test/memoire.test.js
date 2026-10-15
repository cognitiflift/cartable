import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteDeReponse, NOTES, memoireDeQuestion } from '../lib/memoire.js';

const JOUR = 86_400_000;
const DEBUT = Date.parse('2026-10-01T10:00:00Z');
const a = (jour) => DEBUT + jour * JOUR; // instant, en jours depuis le début
const le = (jour, juste, extra = {}) => ({ date: new Date(a(jour)).toISOString(), juste, origine: 'quiz', ...extra });

test('Note FSRS : faux ou « Je ne sais pas » → à revoir, juste pas sûr → difficile, juste sûr → bien', () => {
  assert.equal(noteDeReponse({ juste: false }), NOTES.aRevoir);
  assert.equal(noteDeReponse({ juste: false, jeNeSaisPas: true }), NOTES.aRevoir);
  assert.equal(noteDeReponse({ juste: true, sur: false }), NOTES.difficile);
  assert.equal(noteDeReponse({ juste: true, sur: true }), NOTES.bien);
  assert.equal(noteDeReponse({ juste: true }), NOTES.bien);
  assert.deepEqual([NOTES.aRevoir, NOTES.difficile, NOTES.bien], [1, 2, 3]);
});

test('Mémoire : une première réponse juste → stabilité initiale FSRS-5 « bien », revue 3 jours plus tard', () => {
  const m = memoireDeQuestion([le(0, true)], { maintenant: a(0) });
  assert.equal(m.stabilite, 3.173);
  assert.equal(m.prochaineRevision, '2026-10-04T10:00:00.000Z');
  assert.equal(m.rappel, 1);
});

test('Mémoire : la probabilité de se souvenir décroît avec le temps, et vaut 90 % après une stabilité', () => {
  const journal = [le(0, true)];
  const rappels = [1, 3.173, 10, 30].map((j) => memoireDeQuestion(journal, { maintenant: a(j) }).rappel);
  assert.ok(rappels[0] > rappels[1] && rappels[1] > rappels[2] && rappels[2] > rappels[3]);
  assert.ok(Math.abs(rappels[1] - 0.9) < 1e-9);
});

test('Mémoire : sans réponse, rien à calculer', () => {
  assert.equal(memoireDeQuestion([], { maintenant: a(0) }), null);
});

// Rejoue des réponses données chacune le jour de la révision prévue ; renvoie les intervalles successifs (jours).
function intervallesSuccessifs(reponses) {
  const journal = [];
  let jour = 0;
  const intervalles = [];
  for (const extra of reponses) {
    journal.push({ ...le(jour, extra.juste), ...extra });
    const prochaine = Date.parse(memoireDeQuestion(journal, { maintenant: a(jour) }).prochaineRevision);
    const suivant = (prochaine - DEBUT) / JOUR;
    intervalles.push(suivant - jour);
    jour = suivant;
  }
  return intervalles;
}

test('Mémoire : des succès à chaque révision espacent de plus en plus les révisions', () => {
  const intervalles = intervallesSuccessifs(Array(5).fill({ juste: true, sur: true }));
  for (let i = 1; i < intervalles.length; i++) assert.ok(intervalles[i] > intervalles[i - 1], `${intervalles}`);
  assert.ok(intervalles.at(-1) > 30, `${intervalles}`);
});

test('Mémoire : un échec après des succès fait rechuter la stabilité et rapproche la révision', () => {
  const succes = { juste: true, sur: true };
  const avant = intervallesSuccessifs([succes, succes, succes]);
  const apres = intervallesSuccessifs([succes, succes, succes, { juste: false }]);
  assert.ok(apres.at(-1) < avant.at(-1) / 3, `${avant} / ${apres}`);
  assert.ok(apres.at(-1) < avant.at(-2), `${avant} / ${apres}`);
});

test('Mémoire : « Je ne sais pas » rechute comme une réponse fausse', () => {
  const succes = { juste: true, sur: true };
  assert.deepEqual(
    intervallesSuccessifs([succes, succes, { juste: false, jeNeSaisPas: true }]),
    intervallesSuccessifs([succes, succes, { juste: false }]),
  );
});

test('Mémoire : un échec rend la Question plus difficile, un succès sûr ne l\'alourdit pas', () => {
  const d = (journal) => memoireDeQuestion(journal, { maintenant: a(10) }).difficulte;
  assert.ok(d([le(0, true), le(3, false)]) > d([le(0, true)]));
  assert.ok(d([le(0, true), le(3, true)]) <= d([le(0, true)]));
});

test('Mémoire : juste mais pas sûr → révision plus tôt que juste et sûr', () => {
  const [pasSur] = intervallesSuccessifs([{ juste: true, sur: true }, { juste: true, sur: false }]).slice(1);
  const [sur] = intervallesSuccessifs([{ juste: true, sur: true }, { juste: true, sur: true }]).slice(1);
  assert.ok(pasSur < sur, `${pasSur} / ${sur}`);
});

test('Mémoire : répondre deux fois le même jour consolide moins qu\'une vraie révision espacée', () => {
  const s = (journal) => memoireDeQuestion(journal, { maintenant: a(10) }).stabilite;
  const memeJour = s([le(0, true), le(0.01, true)]);
  assert.ok(memeJour > 3.173, `${memeJour}`);
  assert.ok(memeJour < s([le(0, true), le(3, true)]), `${memeJour}`);
});

test('Mémoire : l\'état se recalcule depuis le journal, quel que soit l\'ordre où il est rangé', () => {
  const journal = [le(0, true), le(3, false, { sur: true }), le(5, true, { sur: false })];
  const options = { maintenant: a(8) };
  assert.deepEqual(memoireDeQuestion([...journal].reverse(), options), memoireDeQuestion(journal, options));
});

test('Mémoire : « maintenant » accepte une date ISO', () => {
  const journal = [le(0, true)];
  assert.deepEqual(memoireDeQuestion(journal, { maintenant: new Date(a(2)).toISOString() }), memoireDeQuestion(journal, { maintenant: a(2) }));
});
