import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TACHES } from '../lib/tache.js';
import { modeleDeLaTache } from '../lib/modele.js';

test('Modèle selon la tâche : les Pages de leçon prennent le Modèle du Profil avec l\'effort medium', () => {
  for (const tache of ['premiereSeance', 'page', 'rebond']) {
    assert.deepEqual(modeleDeLaTache(tache, 'opus'), { modele: 'opus', effort: 'medium', secours: 'sonnet' });
    assert.deepEqual(modeleDeLaTache(tache, 'sonnet'), { modele: 'sonnet', effort: 'medium', secours: 'haiku' });
    assert.deepEqual(modeleDeLaTache(tache, 'haiku'), { modele: 'haiku', effort: 'medium', secours: 'sonnet' });
  }
});

test('Modèle selon la tâche : les Propositions et les Variantes passent toujours par Haiku avec l\'effort low, quel que soit le Profil', () => {
  for (const profil of ['haiku', 'sonnet', 'opus']) {
    assert.deepEqual(modeleDeLaTache('propositions', profil), { modele: 'haiku', effort: 'low', secours: 'sonnet' });
    assert.deepEqual(modeleDeLaTache('variantes', profil), { modele: 'haiku', effort: 'low', secours: 'sonnet' });
  }
});

test('Modèle selon la tâche : chaque type de tâche a un Modèle de secours différent du Modèle principal', () => {
  for (const tache of TACHES) {
    for (const profil of ['haiku', 'sonnet', 'opus']) {
      const { modele, secours } = modeleDeLaTache(tache, profil);
      assert.ok(secours && secours !== modele, `${tache} / ${profil}`);
    }
  }
});

test('Modèle selon la tâche : un type de tâche inconnu est refusé', () => {
  assert.throws(() => modeleDeLaTache('retourQuiz', 'sonnet'), /Type de tâche inconnu/);
});
