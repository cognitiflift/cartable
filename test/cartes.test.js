import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fusionnerCartes, reglerSon, ajouterCoutCarte, retournerCarte, commencerComposition, reprendreCompositions, terminerComposition, echouerComposition, generiquesEpuisees, prochaineAComposer, aRetourner, vueCartes, versionsDeCarte, versionActive, ajouterVersion, choisirVersion, vueParentCartes, demanderRegeneration, prochaineARegenerer, commencerRegeneration, terminerRegeneration, echouerRegeneration } from '../lib/cartes.js';

const T0 = Date.parse('2026-11-10T12:00:00.000Z');
const T1 = Date.parse('2026-11-11T12:00:00.000Z');
const T2 = Date.parse('2026-11-12T12:00:00.000Z');

// Une Leçon telle que lireLecon la renvoie, réduite à ce qui compte pour les cartes.
const lecon = (id, palier = 'bien en tête', champs = {}) => ({ id, titre: `Leçon ${id}`, categorie: 'Sciences', objectifs: [{}, {}, {}], maitrise: { pourcentage: 90, palier }, ...champs });
const badges = (paliers = {}) => ({ version: 1, badges: paliers });

test('premier calcul : les Leçons déjà Acquises sont écartées, aucune carte', () => {
  const { fichier, nouvelles } = fusionnerCartes(null, { lecons: [lecon('a', 'acquis'), lecon('b')], badges: badges(), maintenant: T0 });
  assert.deepEqual(fichier.ecartees, ['a']);
  assert.deepEqual(fichier.cartes, {});
  assert.deepEqual(nouvelles, []);
  assert.equal(fichier.livraison, '2026-11-10T12:00:00.000Z');
  assert.equal(fichier.son, false);
});

test('une Leçon qui passe à Acquise donne une carte « à composer », une seule fois', () => {
  const premier = fusionnerCartes(null, { lecons: [lecon('b')], badges: badges(), maintenant: T0 }).fichier;
  const { fichier, nouvelles } = fusionnerCartes(premier, { lecons: [lecon('b', 'acquis', { titre: 'Les volcans' })], badges: badges(), maintenant: T1 });
  assert.deepEqual(nouvelles, ['b']);
  assert.deepEqual(fichier.cartes.b, {
    lecon: 'b', titre: 'Les volcans', categorie: 'Sciences', objectifs: 3, jourAcquisition: '2026-11-11',
    etat: 'a-composer', essais: 0, calques: null, prete: null, retourne: null,
  });
  const encore = fusionnerCartes(fichier, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T2 });
  assert.deepEqual(encore.nouvelles, []);
  assert.equal(encore.fichier, fichier); // rien de nouveau : le même fichier, à ne pas réécrire
});

test('la carte reste quand la Leçon redescend ou est supprimée, et ne se refait pas', () => {
  const premier = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  const avec = fusionnerCartes(premier, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  const redescendue = fusionnerCartes(avec, { lecons: [lecon('b', 'à consolider')], badges: badges(), maintenant: T2 });
  assert.equal(redescendue.fichier.cartes.b.lecon, 'b');
  const supprimee = fusionnerCartes(redescendue.fichier, { lecons: [], badges: badges(), maintenant: T2 });
  assert.equal(supprimee.fichier.cartes.b.titre, 'Leçon b');
  const reacquise = fusionnerCartes(supprimee.fichier, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T2 });
  assert.deepEqual(reacquise.nouvelles, []);
});

test('une Leçon écartée à la livraison ne donne jamais de carte, même après être redescendue puis redevenue Acquise', () => {
  let { fichier } = fusionnerCartes(null, { lecons: [lecon('a', 'acquis')], badges: badges(), maintenant: T0 });
  ({ fichier } = fusionnerCartes(fichier, { lecons: [lecon('a', 'à revoir')], badges: badges(), maintenant: T1 }));
  const fin = fusionnerCartes(fichier, { lecons: [lecon('a', 'acquis')], badges: badges(), maintenant: T2 });
  assert.deepEqual(fin.nouvelles, []);
  assert.deepEqual(fin.fichier.cartes, {});
});

test('essais comptés, deux au plus ; une composition interrompue redevient « à composer »', () => {
  let f = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  f = commencerComposition(f, 'b');
  assert.deepEqual([f.cartes.b.etat, f.cartes.b.essais], ['en-composition', 1]);
  f = reprendreCompositions(f);
  assert.deepEqual([f.cartes.b.etat, f.cartes.b.essais], ['a-composer', 1]);
  f = commencerComposition(f, 'b');
  assert.equal(f.cartes.b.essais, 2);
  f = reprendreCompositions(f);
  assert.equal(commencerComposition(f, 'b'), f); // pas de troisième essai
  assert.equal(reprendreCompositions(f), f);
});

test('Paliers : ceux d\'avant la livraison sont visibles d\'emblée, les suivants sont à retourner, retournement idempotent', () => {
  const avant = badges({ regulier: { bronze: { jour: '2026-11-01', ajoute: '2026-11-01T10:00:00.000Z' } } });
  let { fichier } = fusionnerCartes(null, { lecons: [], badges: avant, maintenant: T0 });
  assert.deepEqual(aRetourner(fichier), []);
  const apres = badges({ regulier: { bronze: avant.badges.regulier.bronze, argent: { jour: '2026-11-11', ajoute: '2026-11-11T09:00:00.000Z' } } });
  ({ fichier } = fusionnerCartes(fichier, { lecons: [], badges: apres, maintenant: T1 }));
  assert.deepEqual(aRetourner(fichier), [{ type: 'palier', id: 'regulier', palier: 'argent' }]);
  const r = retournerCarte(fichier, { type: 'palier', id: 'regulier', palier: 'argent' }, T2);
  assert.equal(r.statut, 'retournee');
  assert.deepEqual(aRetourner(r.fichier), []);
  const encore = retournerCarte(r.fichier, { type: 'palier', id: 'regulier', palier: 'argent' }, T2 + 5000);
  assert.equal(encore.statut, 'deja');
  assert.equal(encore.fichier, r.fichier);
  assert.equal(retournerCarte(fichier, { type: 'palier', id: 'regulier', palier: 'or' }, T2).statut, 'introuvable');
});

test('carte de ligne : à retourner seulement une fois prête ou générique ; retournement idempotent', () => {
  let f = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  assert.deepEqual(aRetourner(f), []);
  assert.equal(retournerCarte(f, { type: 'ligne', id: 'b' }, T2).statut, 'pas-prete');
  f = { ...f, cartes: { b: { ...f.cartes.b, etat: 'prete', prete: '2026-11-11T12:01:00.000Z' } } };
  assert.deepEqual(aRetourner(f), [{ type: 'ligne', id: 'b' }]);
  const r = retournerCarte(f, { type: 'ligne', id: 'b' }, T2);
  assert.equal(r.fichier.cartes.b.retourne, '2026-11-12T12:00:00.000Z');
  assert.equal(retournerCarte(r.fichier, { type: 'ligne', id: 'b' }, T2 + 1).fichier, r.fichier);
});

test('vueCartes : fichier absent, réponse valide', () => {
  assert.deepEqual(vueCartes(null), { cartesLigne: [], aRetourner: [], son: false });
});

test('vueCartes : cartes de ligne de la plus récente à la plus ancienne', () => {
  let f = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('a', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('a', 'acquis'), lecon('b', 'acquis')], badges: badges(), maintenant: T2 }).fichier;
  assert.deepEqual(vueCartes(f).cartesLigne.map((c) => c.lecon), ['b', 'a']);
});

const avecCarte = (...ids) => {
  let f = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  for (const id of ids) f = fusionnerCartes(f, { lecons: [lecon(id, 'acquis', { categorie: 'Histoire' })], badges: badges(), maintenant: T1 }).fichier;
  return f;
};
const CALQUES = { l1: '<svg/>', l2: '<svg/>', heros: '<svg/>' };

test('prochaineAComposer : la plus ancienne carte « à composer », aucune sinon', () => {
  const f = avecCarte('a', 'b');
  assert.equal(prochaineAComposer(f), 'a');
  assert.equal(prochaineAComposer(commencerComposition(f, 'a')), 'b');
  assert.equal(prochaineAComposer(commencerComposition(commencerComposition(f, 'a'), 'b')), null);
  assert.equal(prochaineAComposer(null), null);
});

test('composition réussie : la carte est prête avec ses calques, datée', () => {
  const f = terminerComposition(commencerComposition(avecCarte('a'), 'a'), 'a', CALQUES, T2);
  assert.deepEqual([f.cartes.a.etat, f.cartes.a.calques, f.cartes.a.prete, f.cartes.a.essais], ['prete', CALQUES, '2026-11-12T12:00:00.000Z', 1]);
  assert.deepEqual(aRetourner(f), [{ type: 'ligne', id: 'a' }]);
});

test('échec : un seul essai raté redonne « à composer » ; le second raté donne la scène générique, déterministe', () => {
  let f = echouerComposition(commencerComposition(avecCarte('a'), 'a'), 'a', T2);
  assert.equal(f.cartes.a.etat, 'a-composer');
  assert.equal(f.cartes.a.calques, null);
  f = echouerComposition(commencerComposition(f, 'a'), 'a', T2);
  assert.equal(f.cartes.a.etat, 'generique');
  assert.equal(f.cartes.a.essais, 2);
  assert.equal(f.cartes.a.prete, '2026-11-12T12:00:00.000Z');
  assert.deepEqual(Object.keys(f.cartes.a.calques), ['l1', 'l2', 'heros']);
  assert.match(f.cartes.a.calques.l1, /var\(--ligne-histoire\)/);
  // même Leçon, même carte
  const g = echouerComposition(commencerComposition(echouerComposition(commencerComposition(avecCarte('a'), 'a'), 'a', T0), 'a'), 'a', T1);
  assert.deepEqual(g.cartes.a.calques, f.cartes.a.calques);
  assert.deepEqual(aRetourner(f), [{ type: 'ligne', id: 'a' }]);
});

test('une carte dont les deux essais sont épuisés (interrompue au redémarrage) reçoit la scène générique', () => {
  let f = commencerComposition(avecCarte('a', 'b'), 'a');
  f = reprendreCompositions(commencerComposition(reprendreCompositions(f), 'a'));
  assert.equal(f.cartes.a.etat, 'a-composer');
  assert.equal(prochaineAComposer(f), 'b'); // 'a' n'a plus d'essai
  const g = generiquesEpuisees(f, T2);
  assert.deepEqual([g.cartes.a.etat, g.cartes.b.etat, g.cartes.a.prete], ['generique', 'a-composer', '2026-11-12T12:00:00.000Z']);
  assert.equal(generiquesEpuisees(g, T2), g);
});

test('terminer ou échouer une carte qui n’est pas « en composition » ne change rien', () => {
  const f = avecCarte('a');
  assert.equal(terminerComposition(f, 'a', CALQUES, T2), f);
  assert.equal(echouerComposition(f, 'a', T2), f);
  assert.equal(echouerComposition(f, 'zzz', T2), f);
});

test('le réglage du son crée un fichier sans livraison : le premier calcul la fixe et garde le son', () => {
  const regle = reglerSon(null, true);
  assert.equal(regle.livraison, null);
  assert.equal(regle.son, true);
  const { fichier } = fusionnerCartes(regle, { lecons: [lecon('a', 'acquis')], badges: badges({ x: { bronze: {} } }), maintenant: T0 });
  assert.equal(fichier.livraison, '2026-11-10T12:00:00.000Z');
  assert.equal(fichier.son, true);
  assert.deepEqual(fichier.ecartees, ['a']);
  assert.deepEqual(fichier.cartes, {});
  assert.deepEqual(fichier.paliers, { 'x/bronze': { retourne: '2026-11-10T12:00:00.000Z' } });
});

test('le coût d\'un tour « carte » est gardé sur la carte, même si la Leçon disparaît', () => {
  const premier = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  const avec = fusionnerCartes(premier, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  const un = ajouterCoutCarte(avec, 'b', { coutUsd: 0.1 });
  const deux = ajouterCoutCarte(un, 'b', { coutUsd: 0.05 });
  assert.deepEqual(deux.cartes.b.cout, { coutUsd: 0.15, tours: 2 });
  assert.equal(ajouterCoutCarte(deux, 'absente', { coutUsd: 1 }), deux);
});

// Versions de carte (#236) : la carte existante est la version 1, active ; le parent choisit, rien ne se supprime.
const calquesDe = (n) => ({ l1: `<svg id="l1-${n}"/>`, l2: `<svg id="l2-${n}"/>`, heros: `<svg id="h-${n}"/>` });
const fichierAvecCarte = (champs = {}) => ({ version: 1, livraison: '2026-10-01T10:00:00.000Z', son: false, ecartees: [], paliers: {},
  cartes: { a: { lecon: 'a', titre: 'A', categorie: 'Sciences', objectifs: 3, jourAcquisition: '2026-11-02', etat: 'prete', essais: 1, calques: calquesDe(1), prete: '2026-11-02T10:00:00.000Z', retourne: null, ...champs } } });

test('versions : un fichier écrit avant les versions se lit sans migration, la carte est la version 1 active', () => {
  const carte = fichierAvecCarte().cartes.a;
  assert.deepEqual(versionsDeCarte(carte), [{ numero: 1, calques: calquesDe(1), creee: '2026-11-02T10:00:00.000Z', generique: false }]);
  assert.equal(versionActive(carte), 1);
  assert.equal(versionActive({ ...carte, calques: null, etat: 'en-composition' }), null);
  assert.equal(versionsDeCarte({ ...carte, etat: 'generique' })[0].generique, true);
});

test('versions : ajouter garde les précédentes et laisse l’active ; choisir remplace les calques vus, état de retournement intact', () => {
  const f0 = fichierAvecCarte({ retourne: '2026-11-03T10:00:00.000Z' });
  const f1 = ajouterVersion(f0, 'a', calquesDe(2), T1);
  assert.deepEqual(versionsDeCarte(f1.cartes.a).map((v) => v.numero), [1, 2]);
  assert.equal(versionActive(f1.cartes.a), 1);
  assert.deepEqual(f1.cartes.a.calques, calquesDe(1));
  const { fichier: f2, statut } = choisirVersion(f1, 'a', 2);
  assert.equal(statut, 'choisie');
  assert.deepEqual(f2.cartes.a.calques, calquesDe(2));
  assert.equal(f2.cartes.a.retourne, '2026-11-03T10:00:00.000Z');
  assert.equal(f2.cartes.a.etat, 'prete');
  // retour à la version 1 : rien n'a été perdu
  const f3 = choisirVersion(f2, 'a', 1).fichier;
  assert.deepEqual(f3.cartes.a.calques, calquesDe(1));
  assert.deepEqual(versionsDeCarte(f3.cartes.a).map((v) => v.numero), [1, 2]);
  assert.equal(choisirVersion(f3, 'a', 1).statut, 'deja');
  assert.equal(choisirVersion(f3, 'a', 1).fichier, f3);
});

test('versions : choisir une carte ou une version inconnue ne change rien', () => {
  const f = fichierAvecCarte();
  assert.equal(choisirVersion(f, 'zzz', 1).statut, 'introuvable');
  assert.equal(choisirVersion(f, 'a', 7).statut, 'sans-version');
  assert.equal(choisirVersion(f, 'a', 7).fichier, f);
  assert.equal(choisirVersion(null, 'a', 1).statut, 'introuvable');
  const enCours = fichierAvecCarte({ etat: 'en-composition', calques: null, prete: null });
  assert.equal(choisirVersion(enCours, 'a', 1).statut, 'sans-version');
  assert.equal(ajouterVersion(enCours, 'a', calquesDe(2), T1), enCours);
});

test('vueParentCartes : toutes les cartes, Leçon supprimée et en composition comprises, avec leur état', () => {
  const base = fichierAvecCarte();
  const f = { ...base, cartes: { ...base.cartes,
    b: { ...base.cartes.a, lecon: 'b', titre: 'B', jourAcquisition: '2026-11-05', retourne: '2026-11-06T10:00:00.000Z' },
    c: { ...base.cartes.a, lecon: 'c', titre: 'C', jourAcquisition: '2026-11-04', etat: 'generique' },
    d: { ...base.cartes.a, lecon: 'd', titre: 'D', jourAcquisition: '2026-11-01', etat: 'a-composer', calques: null, prete: null } } };
  const { lignes } = vueParentCartes(f, ['a', 'b', 'c', 'd']);
  assert.deepEqual(lignes.map((l) => [l.lecon, l.statut, l.generique]), [['b', 'retournee', false], ['c', 'face-cachee', true], ['a', 'face-cachee', false], ['d', 'en-composition', false]]);
  assert.deepEqual(lignes.find((l) => l.lecon === 'a').versions.map((v) => [v.numero, v.active]), [[1, true]]);
  assert.deepEqual(lignes.find((l) => l.lecon === 'd').versions, []);
  assert.equal(vueParentCartes(f, ['b']).lignes.find((l) => l.lecon === 'a').leconSupprimee, true);
  assert.equal(vueParentCartes(f, ['a']).lignes.find((l) => l.lecon === 'a').leconSupprimee, false);
  assert.deepEqual(vueParentCartes(null, []), { lignes: [] });
});

// Régénération (#237)
const cycle = (f, id = 'a') => commencerRegeneration(demanderRegeneration(f, id, [id]).fichier, id);

test('régénération : un tour réussi ajoute une version prête, l’active et le retournement ne bougent pas', () => {
  const f0 = fichierAvecCarte({ retourne: '2026-11-03T10:00:00.000Z' });
  const demande = demanderRegeneration(f0, 'a', ['a']);
  assert.equal(demande.statut, 'demandee');
  assert.equal(prochaineARegenerer(demande.fichier), 'a');
  assert.equal(vueParentCartes(demande.fichier, ['a']).lignes[0].regeneration, true);
  const f1 = terminerRegeneration(cycle(f0), 'a', calquesDe(2), T1);
  assert.deepEqual(versionsDeCarte(f1.cartes.a).map((v) => v.numero), [1, 2]);
  assert.equal(versionActive(f1.cartes.a), 1);
  assert.deepEqual(f1.cartes.a.calques, calquesDe(1));
  assert.equal(f1.cartes.a.retourne, '2026-11-03T10:00:00.000Z');
  assert.equal(f1.cartes.a.regeneration, undefined);
  assert.equal(prochaineARegenerer(f1), null);
  // une autre demande ajoute une troisième version : aucun plafond
  assert.equal(versionsDeCarte(terminerRegeneration(cycle(f1), 'a', calquesDe(3), T1).cartes.a).length, 3);
});

test('régénération : un seul tour à la fois par carte, redemandée seulement quand le tour est fini', () => {
  const f = fichierAvecCarte();
  const demandee = demanderRegeneration(f, 'a', ['a']).fichier;
  assert.equal(demanderRegeneration(demandee, 'a', ['a']).statut, 'deja');
  assert.equal(demanderRegeneration(demandee, 'a', ['a']).fichier, demandee);
  assert.equal(demanderRegeneration(commencerRegeneration(demandee, 'a'), 'a', ['a']).statut, 'deja');
  assert.equal(commencerRegeneration(commencerRegeneration(demandee, 'a'), 'a').cartes.a.regeneration.essais, 1);
  assert.equal(demanderRegeneration(f, 'zzz', ['a']).statut, 'introuvable');
});

test('régénération : un premier échec redemande le tour, le deuxième abandonne sans rien changer et prévient', () => {
  const f0 = fichierAvecCarte();
  const f1 = echouerRegeneration(cycle(f0), 'a', T1);
  assert.equal(f1.cartes.a.regeneration.etat, 'demandee');
  assert.equal(prochaineARegenerer(f1), 'a');
  const f2 = echouerRegeneration(commencerRegeneration(f1, 'a'), 'a', T1);
  assert.equal(f2.cartes.a.regeneration, undefined);
  assert.equal(prochaineARegenerer(f2), null);
  assert.deepEqual(versionsDeCarte(f2.cartes.a), versionsDeCarte(f0.cartes.a));
  assert.equal(f2.cartes.a.etat, 'prete');
  assert.equal(vueParentCartes(f2, ['a']).lignes[0].echecRegeneration, true);
  // la demande suivante efface l'avertissement
  assert.equal(vueParentCartes(demanderRegeneration(f2, 'a', ['a']).fichier, ['a']).lignes[0].echecRegeneration, false);
  assert.equal(echouerRegeneration(f0, 'a', T1), f0);
});

test('régénération : refusée pour une Leçon supprimée, possible pour une carte générique ou en attente de composition', () => {
  const f = fichierAvecCarte();
  assert.deepEqual([demanderRegeneration(f, 'a', []).statut, demanderRegeneration(f, 'a', []).fichier === f], ['lecon-supprimee', true]);
  const generique = fichierAvecCarte({ etat: 'generique' });
  const g = terminerRegeneration(cycle(generique), 'a', calquesDe(2), T1);
  assert.deepEqual(versionsDeCarte(g.cartes.a).map((v) => [v.numero, v.generique]), [[1, true], [2, false]]);
  assert.equal(versionActive(g.cartes.a), 1);
  const attente = fichierAvecCarte({ etat: 'a-composer', essais: 1, calques: null, prete: null });
  const p = terminerRegeneration(cycle(attente), 'a', calquesDe(2), T1);
  assert.deepEqual([p.cartes.a.etat, versionActive(p.cartes.a), p.cartes.a.calques], ['prete', 1, calquesDe(2)]);
  assert.equal(demanderRegeneration(fichierAvecCarte({ etat: 'en-composition', calques: null }), 'a', ['a']).statut, 'deja');
});

test('régénération : un tour interrompu par un redémarrage est redemandé', () => {
  const f = reprendreCompositions(cycle(fichierAvecCarte()));
  assert.deepEqual(f.cartes.a.regeneration, { etat: 'demandee', essais: 1 });
});
