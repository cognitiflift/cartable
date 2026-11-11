import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerBadges, fusionnerBadges, vueMesBadges, marquerVu, SURPRISES } from '../lib/badges.js';
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
  assert.deepEqual(collection.map((b) => b.emoji), ['📅', '🔁', '🧠', '💪', '🚀', '⭐', '🏆', '🧭']);
});

test('Mes badges : l\'avancée vers le prochain Palier suit le meilleur compte atteint, jamais en recul ; aucune avant le premier Palier', () => {
  const premier = fusionnerBadges(null, calculerBadges({ lecons: [leconMemoire()], evenements: [], maintenant: a('2026-10-20') }), a('2026-10-20')).fichier;
  const oubli = calculerBadges({ lecons: [leconMemoire([true, true, false, true, true])], evenements: [], maintenant: a('2026-10-21') });
  const { collection } = vueMesBadges(fusionnerBadges(premier, oubli, a('2026-10-21')).fichier, oubli);
  const memoire = collection.find((b) => b.id === 'memoire');
  assert.equal(memoire.avance, 0); // compte actuel 4, meilleur 5 : argent (5) atteint, rien de perdu vers or (15)
  assert.equal(memoire.phrase, 'Les Objectifs qui restent en mémoire.');
  assert.equal(collection.find((b) => b.id === 'jusquau-bout').avance, null); // À découvrir : ni ligne ni chiffre

  const seize = calculerBadges({ lecons: [lecon({ scores: pagesFaites(jours('2026-10-01', 16)) })], evenements: [], maintenant: a('2026-10-20') });
  const regulier = vueMesBadges(fusionnerBadges(null, seize, a('2026-10-20')).fichier, seize).collection.find((b) => b.id === 'regulier');
  assert.equal(regulier.avance, (16 - 15) / (50 - 15)); // argent (15) atteint, en route vers or (50)
  assert.ok(collection.every((b) => b.surprise || b.phrase), 'chaque Famille dit ce qu\'elle salue');
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

// Un quiz de page réussi chaque jour donné (une Étoile par page en Leçon libre), avec un Dépassement réussi (une Fusée)
// si `bonus`.
const pagesReussies = (dates, bonus = false) => dates.map((jour, i) => ({ score: 90, date: iso(jour), page: `r${i}.html`, ...(bonus && { bonus: { reussies: 2, total: 3 } }) }));

test('⭐ Collection d\'Étoiles : Étoiles des Leçons et des Révisions du jour, Palier daté du jour de la 10e', () => {
  const libre = lecon({ scores: pagesReussies(jours('2026-10-01', 8)) });
  const revisions = lecon({ id: 'rv', questions: [question('q', [['2026-10-12', false, { origine: 'revision' }], ['2026-10-14', true, { origine: 'revision' }]])] });
  const etoiles = badge(calculerBadges({ lecons: [libre, revisions], evenements: [], maintenant: a('2026-10-20') }), 'etoiles');
  assert.equal(etoiles.emoji, '⭐');
  assert.deepEqual(etoiles.seuils, [10, 50, 150, 300]);
  assert.equal(etoiles.compte, 10);
  assert.deepEqual(etoiles.paliers, [{ palier: 'bronze', jour: '2026-10-14' }]);
});

test('🚀 Curieux : Fusées de toutes les Leçons, Paliers datés de la 1re et de la 10e', () => {
  const libre = lecon({ scores: pagesReussies(jours('2026-10-01', 6), true) });
  const revision = lecon({ id: 'r', mode: 'revision', scores: pagesReussies(jours('2026-10-11', 5), true) });
  const curieux = badge(calculerBadges({ lecons: [libre, revision], evenements: [], maintenant: a('2026-10-20') }), 'curieux');
  assert.equal(curieux.emoji, '🚀');
  assert.deepEqual(curieux.seuils, [1, 10, 30, 75]);
  assert.equal(curieux.compte, 11);
  assert.deepEqual(curieux.paliers, [{ palier: 'bronze', jour: '2026-10-01' }, { palier: 'argent', jour: '2026-10-14' }]);
});

test('🔁 Révisions du jour : jours avec une Révision du jour menée jusqu\'au bout ; pour le passé, un jour avec au moins une réponse de Révision du jour', () => {
  const passees = jours('2026-10-01', 9).map((jour, i) => question(`q${i}`, [[jour, true, { origine: 'revision' }]]));
  const evenements = [
    { type: 'revision-terminee', date: iso('2026-10-15') },
    { type: 'revision-terminee', date: iso('2026-10-15', 18) }, // le même jour : une fois
  ];
  const revisions = badge(calculerBadges({ lecons: [lecon({ questions: passees })], evenements, maintenant: a('2026-10-20') }), 'revisions');
  assert.equal(revisions.emoji, '🔁');
  assert.deepEqual(revisions.seuils, [1, 10, 25, 50]);
  assert.equal(revisions.compte, 10);
  assert.deepEqual(revisions.paliers, [{ palier: 'bronze', jour: '2026-10-01' }, { palier: 'argent', jour: '2026-10-15' }]);
});

// Badges surprise (#97) : Paliers d'un badge surprise calculés depuis l'historique ([] tant qu'il n'est pas obtenu).
const paliersSurprise = (id, { lecons = [], evenements = [], maintenant = '2026-12-31' }) =>
  badge(calculerBadges({ lecons, evenements, maintenant: a(maintenant) }), id).paliers;

test('« Content de te revoir » : un Jour travaillé après plus de 14 jours sans aucun, daté de ce retour', () => {
  // Pré-test le 1er octobre ; 15 jours sans rien (2 → 16) ; une Révision du jour le 17.
  const retour = lecon({
    scores: [{ score: 40, date: iso('2026-10-01'), page: '0001-p.html', pretest: true }],
    questions: [question('q1', [['2026-10-17', false, { origine: 'revision' }], ['2026-11-20', true, { origine: 'revision' }]])],
  });
  assert.deepEqual(paliersSurprise('content-de-te-revoir', { lecons: [retour] }), [{ palier: 'unique', jour: '2026-10-17' }]);
  const calcul = calculerBadges({ lecons: [retour], evenements: [], maintenant: a('2026-12-31') });
  assert.equal(badge(calcul, 'content-de-te-revoir').surprise, true);
});

test('« Content de te revoir » : pas après 13 ni 14 jours de pause, ni pour le tout premier Jour travaillé', () => {
  const pause = (vides) => lecon({ scores: pagesFaites(['2026-10-01', jourLocal(minuitDu('2026-10-01', vides + 1))]) });
  assert.deepEqual(paliersSurprise('content-de-te-revoir', { lecons: [pause(13)] }), []);
  assert.deepEqual(paliersSurprise('content-de-te-revoir', { lecons: [pause(14)] }), []);
  assert.deepEqual(paliersSurprise('content-de-te-revoir', { lecons: [pause(15)] }), [{ palier: 'unique', jour: '2026-10-17' }]);
  assert.deepEqual(paliersSurprise('content-de-te-revoir', { lecons: [lecon({ scores: pagesFaites(['2026-10-20']) })] }), []);
});

const terminee = (jour, heure = 18) => ({ type: 'revision-terminee', date: iso(jour, heure) });
const controle = (dateControle) => lecon({ id: 'r', mode: 'revision', dateControle });

test('« Prêt pour le contrôle » : une Révision du jour menée jusqu\'au bout la veille de la date de contrôle', () => {
  const evenements = [terminee('2026-11-05'), terminee('2026-11-09')];
  assert.deepEqual(paliersSurprise('pret-pour-le-controle', { lecons: [controle('2026-11-10')], evenements }), [{ palier: 'unique', jour: '2026-11-09' }]);
});

test('« Prêt pour le contrôle » : pas l\'avant-veille, ni le jour même, ni sans Leçon de révision datée', () => {
  const evenements = [terminee('2026-11-08'), terminee('2026-11-10')];
  assert.deepEqual(paliersSurprise('pret-pour-le-controle', { lecons: [controle('2026-11-10')], evenements }), []);
  assert.deepEqual(paliersSurprise('pret-pour-le-controle', { lecons: [controle(null)], evenements: [terminee('2026-11-09')] }), []);
});

test('« Mission élargie » : une Leçon libre élargie (événement `mission-elargie`), datée de la première', () => {
  const evenements = [
    { type: 'mission-elargie', date: iso('2026-10-12'), lecon: 'b' },
    { type: 'mission-elargie', date: iso('2026-10-08'), lecon: 'a' },
  ];
  assert.deepEqual(paliersSurprise('mission-elargie', { evenements }), [{ palier: 'unique', jour: '2026-10-08' }]);
  assert.deepEqual(paliersSurprise('mission-elargie', { evenements: [terminee('2026-10-08')] }), []);
});

test('« Prêt pour le contrôle » : d\'après l\'historique, une Révision du jour répondue la veille avant tout événement compte', () => {
  const ancienne = { ...controle('2026-11-10'), questions: [question('q1', [['2026-11-09', true, { origine: 'revision' }]])] };
  assert.deepEqual(paliersSurprise('pret-pour-le-controle', { lecons: [ancienne] }), [{ palier: 'unique', jour: '2026-11-09' }]);
});

// Badges surprise du groupe « Rythme » (#219) : première fois, à partir de `depuis` (la livraison : 2026-11-11), sans
// rétroactivité. Les dates des tests de gain sont donc toutes après le 11 novembre 2026.
const DEPUIS = '2026-11-11';
const unJourDeTravail = (jour, pages = 1) => Array.from({ length: pages }, (_, i) => ({ score: 50, date: iso(jour), page: `${jour}-${i}-p.html` }));
const travail = (liste, pages = 1) => lecon({ scores: liste.flatMap((j) => unJourDeTravail(j, pages)) });
const surprise = (id, lecons, maintenant = '2028-12-31') => paliersSurprise(id, { lecons, maintenant });
const unique = (jour) => [{ palier: 'unique', jour }];

test('Surprises du Rythme : chacune a `depuis` ; toutes ont une phrase sans score ni pourcentage', () => {
  const neuves = ['sept-d-un-coup', 'mois-complet', 'semaine-pleine', 'reparti', 'centenaire', 'rentree'];
  for (const id of neuves) assert.equal(SURPRISES.find((s) => s.id === id)?.depuis, DEPUIS, id);
  for (const s of SURPRISES) assert.ok(s.phrase && !/%|score/i.test(s.phrase), s.id);
});

test('🔥 Sept d\'un coup : la Série de jours atteint 7, datée du 7e jour ; pas à 6', () => {
  assert.deepEqual(surprise('sept-d-un-coup', [travail(jours('2026-12-01', 6))]), []);
  assert.deepEqual(surprise('sept-d-un-coup', [travail(jours('2026-12-01', 7))]), unique('2026-12-07'));
});

test('🗓️ Mois complet : la Série de jours atteint 30, datée du 30e jour ; pas à 29', () => {
  assert.deepEqual(surprise('mois-complet', [travail(jours('2026-12-01', 29))]), []);
  assert.deepEqual(surprise('mois-complet', [travail(jours('2026-12-01', 30))]), unique('2026-12-30'));
});

test('📆 Semaine pleine : les 7 jours du lundi au dimanche travaillés ; pas à 6, pas à cheval sur deux semaines', () => {
  // Lundi 7 décembre 2026 → dimanche 13.
  assert.deepEqual(surprise('semaine-pleine', [travail(jours('2026-12-07', 6))]), []);
  assert.deepEqual(surprise('semaine-pleine', [travail(jours('2026-12-07', 7))]), unique('2026-12-13'));
  assert.deepEqual(surprise('semaine-pleine', [travail(jours('2026-12-08', 7))]), []);
});

test('🩹 Reparti ! : une Série de jours réparée, datée du jour de la réparation', () => {
  // Lundi 7 décembre atteint ; 8, 9, 10 couverts par les Jokers ; vendredi 11 manqué ; samedi 12 : deux fois l'Objectif.
  const base = unJourDeTravail('2026-12-07');
  assert.deepEqual(surprise('reparti', [lecon({ scores: [...base, ...unJourDeTravail('2026-12-12', 2)] })]), unique('2026-12-12'));
  assert.deepEqual(surprise('reparti', [lecon({ scores: [...base, ...unJourDeTravail('2026-12-12', 1)] })]), []);
});

test('💯 Centenaire : 100 Jours travaillés, datés du 100e ; pas à 99', () => {
  const espaces = (n) => Array.from({ length: n }, (_, i) => jourLocal(minuitDu('2026-12-01', i * 2))); // un jour sur deux
  assert.deepEqual(surprise('centenaire', [travail(espaces(99))]), []);
  assert.deepEqual(surprise('centenaire', [travail(espaces(100))]), unique(espaces(100)[99]));
});

test('🎒 Rentrée : un Jour travaillé en septembre, pas en août', () => {
  assert.deepEqual(surprise('rentree', [travail(['2027-08-31'])]), []);
  assert.deepEqual(surprise('rentree', [travail(['2027-08-31', '2027-09-02', '2027-09-03'])]), unique('2027-09-02'));
});

test('Surprises du Rythme : rien avant `depuis` ; le même historique prolongé après la donne', () => {
  // Une série de 40 jours finie le 10 novembre : ni Sept d'un coup ni Mois complet pour l'Élève existant.
  const avant = travail(jours('2026-10-02', 40));
  assert.deepEqual(surprise('sept-d-un-coup', [avant]), []);
  assert.deepEqual(surprise('mois-complet', [avant]), []);
  // Rentrée en septembre 2026 : avant `depuis`.
  assert.deepEqual(surprise('rentree', [travail(['2026-09-02'])]), []);
  // Série de 6 jours finie le 10 novembre, prolongée jusqu'au 12 : elle atteint 7 le 11 novembre.
  assert.deepEqual(surprise('sept-d-un-coup', [travail(jours('2026-11-05', 8))]), unique('2026-11-11'));
  // Semaine pleine terminée le dimanche 8 novembre : avant ; celle du 9 au 15 : après.
  assert.deepEqual(surprise('semaine-pleine', [travail(jours('2026-11-02', 7))]), []);
  assert.deepEqual(surprise('semaine-pleine', [travail(jours('2026-11-09', 7))]), unique('2026-11-15'));
});

test('Surprises : une surprise trouvée porte sa phrase dans Mes badges, une non trouvée y reste absente', () => {
  const calcul = calculerBadges({ lecons: [travail(jours('2026-12-01', 7))], evenements: [], maintenant: a('2026-12-07') });
  const { fichier } = fusionnerBadges(null, calcul, a('2026-12-07'));
  const { collection } = vueMesBadges(fichier, calcul);
  const sept = collection.find((b) => b.id === 'sept-d-un-coup');
  assert.equal(sept.phrase, SURPRISES.find((s) => s.id === 'sept-d-un-coup').phrase);
  assert.equal(collection.some((b) => b.id === 'mois-complet'), false);
});

// Badges surprise du groupe « Curiosité et exploration » (#221) : même mécanisme que le Rythme (`depuis`, phrase).
const IDS_CURIOSITE = ['correspondance', 'trois-d-un-coup', 'curieux-de-tout', 'serie-pleine', 'cliche'];
const unCoupDeTravail = (jour, page, categorie) => lecon({ id: `l-${categorie}-${page}`, categorie, scores: [{ score: 50, date: iso(jour), page: `${page}-p.html` }] });
// Une Fusée : un quiz de page avec un Dépassement réussi, daté de `jour`.
const fusee = (jour, page) => ({ score: 90, date: iso(jour), page: `${page}-p.html`, bonus: { reussies: 2, total: 2 } });
const fuseesLe = (jour, n, categorie = 'Sciences') => lecon({ id: `f-${jour}-${categorie}`, categorie, scores: Array.from({ length: n }, (_, i) => fusee(jour, `${jour}-${i}`)) });
const termineeLe = (jour, questions) => ({ type: 'revision-terminee', date: iso(jour), ...(questions !== undefined && { questions }) });
const photoLe = (jour) => ({ type: 'photo-lecon', date: iso(jour), lecon: 'l' });

test('Surprises de la Curiosité : chacune a `depuis` et une phrase sans score ni pourcentage', () => {
  for (const id of IDS_CURIOSITE) {
    const s = SURPRISES.find((x) => x.id === id);
    assert.equal(s?.depuis, DEPUIS, id);
    assert.ok(s.phrase && !/%|score/i.test(s.phrase), id);
  }
});

test('🔀 Correspondance : deux Leçons de Catégories différentes travaillées le même jour ; pas deux de la même Catégorie', () => {
  assert.deepEqual(surprise('correspondance', [unCoupDeTravail('2026-12-02', 'a', 'Sciences'), unCoupDeTravail('2026-12-02', 'b', 'Sciences')]), []);
  assert.deepEqual(surprise('correspondance', [unCoupDeTravail('2026-12-02', 'a', 'Sciences'), unCoupDeTravail('2026-12-03', 'b', 'Histoire')]), []);
  assert.deepEqual(surprise('correspondance', [unCoupDeTravail('2026-12-02', 'a', 'Sciences'), unCoupDeTravail('2026-12-04', 'b', 'Sciences'), unCoupDeTravail('2026-12-04', 'c', 'Histoire')]), unique('2026-12-04'));
});

test('🚀 Trois d\'un coup : 3 Fusées gagnées le même jour ; pas 2, pas 3 sur trois jours', () => {
  assert.deepEqual(surprise('trois-d-un-coup', [fuseesLe('2026-12-02', 2)]), []);
  assert.deepEqual(surprise('trois-d-un-coup', [fuseesLe('2026-12-02', 1), fuseesLe('2026-12-03', 1), fuseesLe('2026-12-04', 1)]), []);
  assert.deepEqual(surprise('trois-d-un-coup', [fuseesLe('2026-12-02', 1), fuseesLe('2026-12-05', 2, 'Histoire')]), []);
  assert.deepEqual(surprise('trois-d-un-coup', [fuseesLe('2026-12-05', 1), fuseesLe('2026-12-05', 2, 'Histoire')]), unique('2026-12-05'));
});

test('🌍 Curieux de tout : des Fusées dans 3 Catégories différentes, datées de la Fusée qui apporte la 3e ; pas 2', () => {
  assert.deepEqual(surprise('curieux-de-tout', [fuseesLe('2026-12-02', 3, 'Sciences'), fuseesLe('2026-12-03', 1, 'Histoire')]), []);
  const lecons = [fuseesLe('2026-12-02', 1, 'Sciences'), fuseesLe('2026-12-03', 2, 'Sciences'), fuseesLe('2026-12-04', 1, 'Histoire'), fuseesLe('2026-12-06', 1, 'Maths')];
  assert.deepEqual(surprise('curieux-de-tout', lecons), unique('2026-12-06'));
});

test('🔟 Série pleine : une Révision du jour menée jusqu\'au bout avec 10 Questions servies ; pas 9, pas sans le nombre', () => {
  const avec = (e) => paliersSurprise('serie-pleine', { evenements: [e], maintenant: '2026-12-31' });
  assert.deepEqual(avec(termineeLe('2026-12-02', 9)), []);
  assert.deepEqual(avec(termineeLe('2026-12-02')), []);
  assert.deepEqual(avec(termineeLe('2026-12-02', 10)), unique('2026-12-02'));
});

test('📸 Cliché ! : l\'événement `photo-lecon`, daté de sa création ; sans événement, rien', () => {
  const avec = (...evenements) => paliersSurprise('cliche', { evenements, maintenant: '2026-12-31' });
  assert.deepEqual(avec(), []);
  assert.deepEqual(avec(photoLe('2026-12-09'), photoLe('2026-12-03')), unique('2026-12-03'));
});

test('Surprises de la Curiosité : rien avant `depuis`', () => {
  assert.deepEqual(surprise('correspondance', [unCoupDeTravail('2026-11-10', 'a', 'Sciences'), unCoupDeTravail('2026-11-10', 'b', 'Histoire')]), []);
  assert.deepEqual(surprise('trois-d-un-coup', [fuseesLe('2026-11-10', 3)]), []);
  assert.deepEqual(surprise('curieux-de-tout', [fuseesLe('2026-11-02', 1, 'Sciences'), fuseesLe('2026-11-03', 1, 'Histoire'), fuseesLe('2026-11-10', 1, 'Maths')]), []);
  assert.deepEqual(paliersSurprise('serie-pleine', { evenements: [termineeLe('2026-11-10', 10)] }), []);
  assert.deepEqual(paliersSurprise('cliche', { evenements: [photoLe('2026-11-10')] }), []);
  // Le même geste le jour de la donne compte.
  assert.deepEqual(paliersSurprise('cliche', { evenements: [photoLe('2026-11-11')] }), unique('2026-11-11'));
});
