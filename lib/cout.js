// Coût d'un tour du prof : chaque appel à `claude -p` garde le coût et l'usage renvoyés dans sa réponse JSON,
// avec son type de tâche. Le coût sert d'indicateur relatif (abonnement Pro, ADR 0001).

// Types de tâche, ensemble fermé : la première Séance d'une Leçon (jusqu'à sa première Page de leçon), une page
// (Séance suivante, Retour de quiz), un Rebond (Étape suivante, Revoir, Défi, Réviser) et les Propositions.
export const TACHES = ['premiereSeance', 'page', 'rebond', 'propositions'];

const nombre = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

// Tour enregistré à partir de la réponse JSON de `claude -p` : tout champ absent ou mal formé vaut 0.
// `modeles` : Modèles réellement utilisés (plusieurs si un Modèle de secours a pris le relais).
export function coutDuTour(reponse, tache) {
  if (!TACHES.includes(tache)) throw new Error(`Type de tâche inconnu : ${tache}`);
  const usage = reponse?.usage ?? {};
  const modelUsage = reponse?.modelUsage;
  return {
    tache,
    coutUsd: nombre(reponse?.total_cost_usd),
    entree: nombre(usage.input_tokens),
    sortie: nombre(usage.output_tokens),
    cacheLu: nombre(usage.cache_read_input_tokens),
    cacheEcrit: nombre(usage.cache_creation_input_tokens),
    dureeMs: nombre(reponse?.duration_ms),
    modeles: modelUsage && typeof modelUsage === 'object' ? Object.keys(modelUsage) : [],
  };
}

const CHAMPS = ['coutUsd', 'entree', 'sortie', 'cacheLu', 'cacheEcrit', 'dureeMs'];

function additionner(tours) {
  const somme = { coutUsd: 0, tours: tours.length, entree: 0, sortie: 0, cacheLu: 0, cacheEcrit: 0, dureeMs: 0 };
  for (const tour of tours) for (const champ of CHAMPS) somme[champ] += nombre(tour[champ]);
  somme.coutUsd = Math.round(somme.coutUsd * 1e6) / 1e6; // sans bruit des additions flottantes
  return somme;
}

// Cumul de tours enregistrés : le total, et le détail par type de tâche (chaque type présent, même sans tour).
// Un tour mal formé est ignoré ; un tour d'un type inconnu compte seulement dans le total.
export function cumulerCouts(tours = []) {
  const valides = (Array.isArray(tours) ? tours : []).filter((t) => t && typeof t === 'object');
  return {
    total: additionner(valides),
    parTache: Object.fromEntries(TACHES.map((tache) => [tache, additionner(valides.filter((t) => t.tache === tache))])),
  };
}
