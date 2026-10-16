import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerBadges, fusionnerBadges, vueMesBadges, marquerVu } from '../lib/badges.js';
import { jourLocal, minuitDu } from '../lib/jour.js';

// Dates en heure locale : les jours de l'Élève sont ceux de sa machine (voir lib/jour.js).
const a = (jour, heure = 12) => { const [an, mois, j] = jour.split('-').map(Number); return new Date(an, mois - 1, j, heure).getTime(); };
const iso = (jour, heure) => new Date(a(jour, heure)).toISOString();
// Jours consécutifs à partir de `debut` : jours('2026-10-01', 3) → ['2026-10-01', '2026-10-02', '2026-10-03'].
const jours = (debut, nombre) => Array.from({ length: nombre }, (_, i) => jourLocal(minuitDu(debut, i)));

// Une Leçon telle que lireLecon la renvoie, réduite à ce qui compte pour les Badges.
const lecon = (champs = {}) => ({ id: 'l', mode: 'libre', categorie: 'Sciences', creee: iso('2026-09-01'), terminee: null, objectifs: [], scores: [], questions: [], ...champs });
// Un quiz de page fait chaque jour donné : l'Objectif du jour est atteint ces jours-là.
const pagesFaites = (dates) => dates.map((jour, i) => ({ score: 50, date: iso(jour), page: `000${i}-p.html` }));
const badge = (calcul, id) => calcul.find((b) => b.id === id);

test('📅 Régulier : jours où l\'Objectif du jour est atteint, Palier daté du jour qui l\'a fait atteindre', () => {
  const faits = jours('2026-10-01', 16);
  const calcul = calculerBadges({ lecons: [lecon({ scores: pagesFaites(faits) })], evenements: [], maintenant: a('2026-10-20') });
  const regulier = badge(calcul, 'regulier');
  assert.equal(regulier.compte, 16);
  assert.deepEqual(regulier.paliers, [{ palier: 'bronze', jour: '2026-10-03' }, { palier: 'argent', jour: '2026-10-15' }]);
  assert.deepEqual(regulier.seuils, [3, 15, 50, 150]);
  assert.equal(regulier.emoji, '📅');
});

test('🏆 Jusqu\'au bout : Leçons terminées (Défi réussi), datées de leur fin ; trois Paliers seulement', () => {
  const terminees = ['2026-10-05', '2026-10-01', '2026-10-09'].map((jour, i) => lecon({ id: `r${i}`, mode: 'revision', terminee: iso(jour) }));
  const calcul = calculerBadges({ lecons: [...terminees, lecon()], evenements: [], maintenant: a('2026-10-20') });
  const bout = badge(calcul, 'jusquau-bout');
  assert.equal(bout.compte, 3);
  assert.deepEqual(bout.seuils, [1, 3, 10]);
  assert.deepEqual(bout.paliers, [{ palier: 'bronze', jour: '2026-10-01' }, { palier: 'argent', jour: '2026-10-09' }]);
});

test('🧭 Explorateur : Catégories ayant au moins une Leçon, datées de la création de la Leçon qui en apporte une nouvelle', () => {
  const lecons = [
    lecon({ id: 'a', categorie: 'Sciences', creee: iso('2026-09-01') }),
    lecon({ id: 'b', categorie: 'Sciences', creee: iso('2026-09-03') }),
    lecon({ id: 'c', categorie: 'Histoire', creee: iso('2026-09-10') }),
    lecon({ id: 'd', categorie: 'Arts', creee: iso('2026-09-12') }),
    lecon({ id: 'e', categorie: 'Langues', creee: iso('2026-09-08') }),
  ];
  const explorateur = badge(calculerBadges({ lecons, evenements: [], maintenant: a('2026-10-20') }), 'explorateur');
  assert.equal(explorateur.compte, 4);
  assert.deepEqual(explorateur.paliers, [{ palier: 'bronze', jour: '2026-09-08' }, { palier: 'argent', jour: '2026-09-12' }]);
});

// Une Question de la Banque et le journal de ses réponses : [jour, juste, marques, heure].
const question = (id, reponses) => ({ id, page: '0002-p.html', contenu: { objectifs: [1] },
  journal: reponses.map(([jour, juste, marques = {}, heure = 12]) => ({ date: iso(jour, heure), juste, origine: 'quiz', ...marques })) });

test('💪 Retour gagnant : une Question ratée puis réussie entièrement un autre jour local, datée du jour de la réussite', () => {
  const questions = [
    question('q1', [['2026-10-01', false], ['2026-10-03', true]]),
    question('q2', [['2026-10-02', false, { jeNeSaisPas: true }], ['2026-10-04', true, { origine: 'revision', variante: 0 }]]), // « Je ne sais pas », puis sa Variante réussie
    question('q3', [['2026-10-05', false, { points: 0.5 }], ['2026-10-06', true]]), // juste en partie : pas entièrement juste
    question('q4', [['2026-10-05', false, {}, 9], ['2026-10-05', true, {}, 18]]), // le même jour : ne compte pas
    question('q5', [['2026-10-05', true], ['2026-10-06', false], ['2026-10-06', false]]), // pas encore réussie après
  ];
  const fort = badge(calculerBadges({ lecons: [lecon({ questions })], evenements: [], maintenant: a('2026-10-20') }), 'retour-gagnant');
  assert.equal(fort.compte, 3);
  assert.deepEqual(fort.paliers, [{ palier: 'bronze', jour: '2026-10-03' }]);
});

// Leçon avec Banque : cinq Objectifs atteints le 1er octobre, chacun couvert par une Question réussie ce jour-là puis
// de nouveau 1, 2… 5 jours plus tard : il devient Retenu ce jour-là (voir STABILITE_RETENU). `retenus` : état actuel.
const leconMemoire = (retenus = [true, true, true, true, true]) => lecon({
  objectifs: retenus.map((retenu, i) => ({ texte: `O${i + 1}`, atteint: true, retenu })),
  scores: [{ score: 100, date: iso('2026-10-01', 10), page: '0002-p.html', objectifs: [1, 2, 3, 4, 5] }],
  questions: retenus.map((_, i) => ({ ...question(`q${i}`, [['2026-10-01', true], [jours('2026-10-02', 5)[i], true]]), contenu: { objectifs: [i + 1] } })),
});

test('🧠 Mémoire : Objectifs devenus Retenus, chaque Palier daté avec le calcul de Retenu à une date donnée', () => {
  const memoire = badge(calculerBadges({ lecons: [leconMemoire()], evenements: [], maintenant: a('2026-10-20') }), 'memoire');
  assert.equal(memoire.compte, 5);
  assert.deepEqual(memoire.seuils, [1, 5, 15, 40]);
  assert.deepEqual(memoire.paliers, [{ palier: 'bronze', jour: '2026-10-02' }, { palier: 'argent', jour: '2026-10-06' }]);
});

test('🧠 Mémoire : la progression suit le compte actuel (un Objectif oublié), les Paliers déjà atteints dans l\'historique restent', () => {
  const memoire = badge(calculerBadges({ lecons: [leconMemoire([true, true, false, true, true])], evenements: [], maintenant: a('2026-10-20') }), 'memoire');
  assert.equal(memoire.compte, 4);
});

test('🧠 et 💪 : une ancienne Leçon sans Banque ne compte pas, même avec des Objectifs Retenus', () => {
  const ancienne = lecon({
    objectifs: [{ texte: 'O1', atteint: true, retenu: true }],
    scores: [{ score: 100, date: iso('2026-10-01'), objectifs: [1] }, { score: 100, date: iso('2026-10-03'), objectifs: [1] }],
  });
  const calcul = calculerBadges({ lecons: [ancienne], evenements: [], maintenant: a('2026-10-20') });
  assert.equal(badge(calcul, 'memoire').compte, 0);
  assert.deepEqual(badge(calcul, 'memoire').paliers, []);
  assert.equal(badge(calcul, 'retour-gagnant').compte, 0);
});

test('💪 Retour gagnant : une seule fois par Question, même ratée puis réussie plusieurs fois', () => {
  const questions = [question('q1', [['2026-10-01', false], ['2026-10-02', true], ['2026-10-03', false], ['2026-10-04', true]])];
  const fort = badge(calculerBadges({ lecons: [lecon({ questions })], evenements: [], maintenant: a('2026-10-20') }), 'retour-gagnant');
  assert.equal(fort.compte, 1);
  assert.deepEqual(fort.paliers, [{ palier: 'bronze', jour: '2026-10-02' }]);
});

// Calcul réduit à ce que la fusion lit : pour chaque Badge, ses Paliers atteints d'après l'historique.
const calcule = (paliersParBadge) => Object.entries(paliersParBadge).map(([id, paliers]) => ({ id, paliers: paliers.map(([palier, jour]) => ({ palier, jour })) }));

test('Fusion : le premier calcul attribue d\'office tout ce que l\'historique justifie, daté, sans rien annoncer, avec le mot d\'accueil', () => {
  const { fichier, nouveaux } = fusionnerBadges(null, calcule({ regulier: [['bronze', '2026-10-03'], ['argent', '2026-10-15']], memoire: [] }), a('2026-10-20'));
  assert.deepEqual(nouveaux, []);
  assert.equal(fichier.accueil, true);
  assert.deepEqual(fichier.badges, { regulier: {
    bronze: { jour: '2026-10-03', ajoute: iso('2026-10-20') }, argent: { jour: '2026-10-15', ajoute: iso('2026-10-20') },
  } });
  assert.deepEqual(vueMesBadges(fichier, []).nouveaux, []);
});

test('Fusion : un premier calcul sans aucun Palier ne pose pas de mot d\'accueil', () => {
  assert.equal(fusionnerBadges(null, calcule({ regulier: [] }), a('2026-10-20')).fichier.accueil, false);
});

test('Fusion : ajoute les Paliers nouvellement atteints, les annonce, et n\'en retire jamais', () => {
  const premier = fusionnerBadges(null, calcule({ regulier: [['bronze', '2026-10-03']], memoire: [['bronze', '2026-10-02']] }), a('2026-10-20')).fichier;
  const { fichier, nouveaux } = fusionnerBadges(premier, calcule({ regulier: [['bronze', '2026-10-03'], ['argent', '2026-10-21']], memoire: [] }), a('2026-10-21'));
  assert.deepEqual(nouveaux, [{ id: 'regulier', palier: 'argent', jour: '2026-10-21' }]);
  assert.deepEqual(Object.keys(fichier.badges.memoire), ['bronze']);
  assert.deepEqual(fichier.badges.regulier.argent, { jour: '2026-10-21', ajoute: iso('2026-10-21') });
});

test('Fusion : rien de nouveau, le fichier reste le même (rien à réécrire)', () => {
  const premier = fusionnerBadges(null, calcule({ regulier: [['bronze', '2026-10-03']] }), a('2026-10-20')).fichier;
  const { fichier, nouveaux } = fusionnerBadges(premier, calcule({ regulier: [['bronze', '2026-10-03']] }), a('2026-10-22'));
  assert.equal(fichier, premier);
  assert.deepEqual(nouveaux, []);
});

test('Mes badges : obtenus avec Palier et date (même si le compte a baissé), à venir avec leur progression', () => {
  const premier = fusionnerBadges(null, calculerBadges({ lecons: [leconMemoire()], evenements: [], maintenant: a('2026-10-20') }), a('2026-10-20')).fichier;
  const oubli = calculerBadges({ lecons: [leconMemoire([true, true, false, true, true])], evenements: [], maintenant: a('2026-10-21') });
  const { collection } = vueMesBadges(fusionnerBadges(premier, oubli, a('2026-10-21')).fichier, oubli);
  const memoire = collection.find((b) => b.id === 'memoire');
  assert.equal(memoire.palier, 'argent');
  assert.equal(memoire.compte, 4);
  assert.deepEqual(memoire.prochain, { palier: 'or', seuil: 15 });
  assert.deepEqual(memoire.paliers.slice(0, 3), [
    { palier: 'bronze', seuil: 1, jour: '2026-10-02' }, { palier: 'argent', seuil: 5, jour: '2026-10-06' }, { palier: 'or', seuil: 15, jour: null },
  ]);
  const bout = collection.find((b) => b.id === 'jusquau-bout');
  assert.deepEqual({ palier: bout.palier, compte: bout.compte, prochain: bout.prochain }, { palier: null, compte: 0, prochain: { palier: 'bronze', seuil: 1 } });
  assert.deepEqual(collection.map((b) => b.emoji), ['📅', '🧠', '💪', '🏆', '🧭']);
});

test('Mes badges : « Nouveau » pour les Paliers gagnés depuis la dernière ouverture, effacé en ouvrant ; le dernier Badge gagné', () => {
  const avant = calculerBadges({ lecons: [lecon({ scores: pagesFaites(jours('2026-10-01', 2)) })], evenements: [], maintenant: a('2026-10-02') });
  const premier = fusionnerBadges(null, avant, a('2026-10-02')).fichier;
  assert.equal(vueMesBadges(premier, avant).dernier, null);
  const apres = calculerBadges({ lecons: [lecon({ scores: pagesFaites(jours('2026-10-01', 3)) })], evenements: [], maintenant: a('2026-10-03') });
  const fichier = fusionnerBadges(premier, apres, a('2026-10-03')).fichier;
  const nouveau = { id: 'regulier', emoji: '📅', nom: 'Régulier', palier: 'bronze', jour: '2026-10-03' };
  assert.deepEqual(vueMesBadges(fichier, apres).nouveaux, [nouveau]);
  assert.deepEqual(vueMesBadges(fichier, apres).dernier, nouveau);
  const vu = marquerVu(fichier, a('2026-10-03', 13));
  assert.deepEqual(vueMesBadges(vu, apres).nouveaux, []);
  assert.deepEqual(vueMesBadges(vu, apres).dernier, nouveau);
});

test('Mes badges : le mot d\'accueil jusqu\'à la première ouverture', () => {
  const calcul = calculerBadges({ lecons: [lecon({ scores: pagesFaites(jours('2026-10-01', 3)) })], evenements: [], maintenant: a('2026-10-05') });
  const fichier = fusionnerBadges(null, calcul, a('2026-10-05')).fichier;
  assert.equal(vueMesBadges(fichier, calcul).accueil, true);
  assert.equal(vueMesBadges(marquerVu(fichier, a('2026-10-05')), calcul).accueil, false);
});

test('Badges surprise (données) : cachés tant qu\'ils ne sont pas obtenus, puis dans la collection avec leur date', () => {
  const surprises = [{ id: 'test-surprise', emoji: '🎁', nom: 'Surprise', trouver: ({ lecons }) => (lecons.length > 1 ? '2026-10-04' : null) }];
  const cache = calculerBadges({ lecons: [lecon()], evenements: [], maintenant: a('2026-10-05') }, { surprises });
  const fichier = fusionnerBadges(null, cache, a('2026-10-05')).fichier;
  assert.equal(vueMesBadges(fichier, cache).collection.some((b) => b.id === 'test-surprise'), false);
  const trouve = calculerBadges({ lecons: [lecon(), lecon()], evenements: [], maintenant: a('2026-10-06') }, { surprises });
  const { fichier: apres, nouveaux } = fusionnerBadges(fichier, trouve, a('2026-10-06'));
  assert.deepEqual(nouveaux, [{ id: 'test-surprise', palier: 'unique', jour: '2026-10-04' }]);
  const surprise = vueMesBadges(apres, trouve).collection.find((b) => b.id === 'test-surprise');
  assert.deepEqual(surprise, { id: 'test-surprise', emoji: '🎁', nom: 'Surprise', surprise: true, palier: 'unique', jour: '2026-10-04' });
});
