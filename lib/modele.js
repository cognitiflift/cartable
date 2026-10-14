// Modèle selon la tâche (ADR 0005) : table fermée qui associe à chaque type de tâche un Modèle et un effort
// (`--effort` de `claude -p`). `'profil'` = le Modèle choisi dans le Profil de l'Élève.
import { TACHES } from './cout.js';

const TABLE = {
  premiereSeance: { modele: 'profil', effort: 'medium' },
  page: { modele: 'profil', effort: 'medium' },
  rebond: { modele: 'profil', effort: 'medium' },
  propositions: { modele: 'haiku', effort: 'low' },
};

// Modèle de secours (`--fallback-model`) : jamais le Modèle principal (claude le refuse) ; le Modèle juste moins
// cher quand il existe (Opus → Sonnet, Sonnet → Haiku), sinon Sonnet pour Haiku.
const SECOURS = { opus: 'sonnet', sonnet: 'haiku', haiku: 'sonnet' };

export function modeleDeLaTache(tache, modeleProfil) {
  if (!TACHES.includes(tache)) throw new Error(`Type de tâche inconnu : ${tache}`);
  const { modele, effort } = TABLE[tache];
  const principal = modele === 'profil' ? modeleProfil : modele;
  return { modele: principal, effort, secours: SECOURS[principal] };
}
