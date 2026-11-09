import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErreurApi, estIntrouvable, chargerProfil, avecAttente, lireEnParallele } from '../public/chargement.js';

test('Profil : un 404 veut dire « absent », sans erreur', async () => {
  const lire = async () => { throw new ErreurApi('Élève introuvable', 404); };
  assert.deepEqual(await chargerProfil(lire, 'zoe'), { absent: true });
});

test('Profil : sans pseudo retenu, absent, sans rien lire', async () => {
  const lire = async () => { throw new Error('ne doit pas être appelé'); };
  assert.deepEqual(await chargerProfil(lire, null), { absent: true });
});

test('Profil : un 500 remonte, il n\'est pas pris pour un Profil absent', async () => {
  const lire = async () => { throw new ErreurApi('Erreur', 500); };
  await assert.rejects(chargerProfil(lire, 'zoe'), (e) => e.statut === 500 && !estIntrouvable(e));
});

test('Profil : une panne réseau (statut 0) remonte aussi', async () => {
  const lire = async () => { throw new ErreurApi('Pas de réponse', 0); };
  await assert.rejects(chargerProfil(lire, 'zoe'), (e) => e.statut === 0);
});

test('Profil : une erreur de programmation (TypeError) remonte', async () => {
  const lire = async () => { throw new TypeError('bug'); };
  await assert.rejects(chargerProfil(lire, 'zoe'), TypeError);
});

test('Profil trouvé : renvoyé tel quel', async () => {
  assert.deepEqual(await chargerProfil(async (slug) => ({ slug }), 'zoe'), { profil: { slug: 'zoe' } });
});

test('Accueil : une lecture en échec n\'empêche pas les autres', async () => {
  const r = await lireEnParallele({
    lecons: Promise.resolve([1]),
    badges: Promise.reject(new ErreurApi('Erreur', 500)),
    moment: Promise.resolve({ choix: [] }),
  });
  assert.deepEqual(r.lecons, { valeur: [1] });
  assert.equal(r.badges.erreur.statut, 500);
  assert.equal('valeur' in r.badges, false);
  assert.deepEqual(r.moment, { valeur: { choix: [] } });
});

// Minuteur factice : le délai ne s'écoule que quand le test le décide.
const minuteurFactice = () => {
  const m = { actions: new Map(), n: 0, setTimeout: (f) => { m.actions.set(++m.n, f); return m.n; }, clearTimeout: (id) => m.actions.delete(id), ecouler: () => { for (const [id, f] of [...m.actions]) { m.actions.delete(id); f(); } } };
  return m;
};

test('Attente : une réponse rapide n\'affiche rien', async () => {
  const minuteur = minuteurFactice();
  const evenements = [];
  const valeur = await avecAttente(async () => 'ok', { minuteur, afficher: () => evenements.push('afficher'), masquer: () => evenements.push('masquer') });
  minuteur.ecouler();
  assert.equal(valeur, 'ok');
  assert.deepEqual(evenements, []);
});

test('Attente : un chargement lent affiche l\'indicateur, puis le retire à la fin', async () => {
  const minuteur = minuteurFactice();
  const evenements = [];
  let finir;
  const travail = new Promise((resolve) => { finir = resolve; });
  const fait = avecAttente(() => travail, { minuteur, afficher: () => evenements.push('afficher'), masquer: () => evenements.push('masquer') });
  minuteur.ecouler();
  assert.deepEqual(evenements, ['afficher']);
  finir('ok');
  assert.equal(await fait, 'ok');
  assert.deepEqual(evenements, ['afficher', 'masquer']);
});

test('Attente : l\'indicateur est retiré aussi quand le chargement échoue', async () => {
  const minuteur = minuteurFactice();
  const evenements = [];
  let echouer;
  const travail = new Promise((_, reject) => { echouer = reject; });
  const fait = avecAttente(() => travail, { minuteur, afficher: () => evenements.push('afficher'), masquer: () => evenements.push('masquer') });
  minuteur.ecouler();
  echouer(new ErreurApi('Erreur', 500));
  await assert.rejects(fait, ErreurApi);
  assert.deepEqual(evenements, ['afficher', 'masquer']);
});
