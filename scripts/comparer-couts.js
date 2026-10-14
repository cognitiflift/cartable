#!/usr/bin/env node
// Essai comparatif de la session neuve à chaque page (#55) : coût moyen d'une page du prof (tours « page » et
// « rebond ») avant (session reprise, prompt complet : CARTABLE_RELAIS=0) et après (session neuve, prompt allégé).
// Lit les tours enregistrés dans etat.json de chaque Leçon ; n'appelle jamais `claude`.
// Usage : node scripts/comparer-couts.js [dossier des élèves, par défaut eleves/ ou ELEVES_DIR] [--depuis AAAA-MM-JJ]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const iDepuis = args.indexOf('--depuis');
const depuis = iDepuis >= 0 ? args.splice(iDepuis, 2)[1] : '';
const eleves = args[0] || process.env.ELEVES_DIR || path.join(import.meta.dirname, '..', 'eleves');

const lireJson = (fichier) => {
  try {
    return JSON.parse(fs.readFileSync(fichier, 'utf8'));
  } catch {
    return null;
  }
};
const dossiers = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => fs.statSync(path.join(dir, n)).isDirectory()) : []);

const lignes = [];
for (const slug of dossiers(eleves)) {
  for (const id of dossiers(path.join(eleves, slug, 'lecons'))) {
    const dir = path.join(eleves, slug, 'lecons', id);
    const etat = lireJson(path.join(dir, 'etat.json'));
    const titre = lireJson(path.join(dir, 'lesson.json'))?.titre || etat?.sujet || id;
    for (const tour of etat?.couts ?? []) {
      if (!['page', 'rebond'].includes(tour.tache) || (depuis && tour.date < depuis)) continue;
      lignes.push({ lecon: `${slug} / ${titre}`, mode: tour.relais ? 'après' : 'avant', ...tour });
    }
  }
}

const moyenne = (tours, champ) => tours.reduce((s, t) => s + (Number(t[champ]) || 0), 0) / tours.length;
const resume = (tours) => ({
  tours: tours.length,
  'coût moyen ($)': Number(moyenne(tours, 'coutUsd').toFixed(4)),
  'entrée moy.': Math.round(moyenne(tours, 'entree')),
  'cache lu moy.': Math.round(moyenne(tours, 'cacheLu')),
  'cache écrit moy.': Math.round(moyenne(tours, 'cacheEcrit')),
  'sortie moy.': Math.round(moyenne(tours, 'sortie')),
  'durée moy. (s)': Number((moyenne(tours, 'dureeMs') / 1000).toFixed(1)),
});

if (!lignes.length) {
  console.log(`Aucun tour « page » ou « rebond » mesuré dans ${eleves}.`);
  process.exit(0);
}
const tableau = {};
for (const lecon of [...new Set(lignes.map((l) => l.lecon))].sort()) {
  for (const mode of ['avant', 'après']) {
    const tours = lignes.filter((l) => l.lecon === lecon && l.mode === mode);
    if (tours.length) tableau[`${lecon} — ${mode}`] = resume(tours);
  }
}
// « page » compte aussi les Retours de quiz (tant que le prof les écrit) : le détail par type de tâche les sépare.
for (const tache of ['page', 'rebond', null]) {
  for (const mode of ['avant', 'après']) {
    const tours = lignes.filter((l) => l.mode === mode && (!tache || l.tache === tache));
    if (tours.length) tableau[`${tache ? `Tâche ${tache}` : 'TOTAL'} — ${mode}`] = resume(tours);
  }
}
console.table(tableau);
