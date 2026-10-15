// Modèle selon la tâche (ADR 0005) : table fermée qui associe à chaque type de tâche un Modèle et un effort
// (`--effort` de `claude -p`).
import { validerTache } from './tache.js';

// À la place d'un Modèle : celui choisi dans le Profil de l'Élève (jamais confondu avec un alias de `claude --model`).
const MODELE_DU_PROFIL = Symbol('Modèle du Profil');

const TABLE = {
  premiereSeance: { modele: MODELE_DU_PROFIL, effort: 'medium' },
  page: { modele: MODELE_DU_PROFIL, effort: 'medium' },
  rebond: { modele: MODELE_DU_PROFIL, effort: 'medium' },
  propositions: { modele: 'haiku', effort: 'low' },
  variantes: { modele: 'haiku', effort: 'low' },
};

// Modèle de secours (`--fallback-model`) : jamais le Modèle principal (claude le refuse) ; le Modèle juste moins
// cher quand il existe (Opus → Sonnet, Sonnet → Haiku), sinon Sonnet pour Haiku.
const SECOURS = { opus: 'sonnet', sonnet: 'haiku', haiku: 'sonnet' };

export function modeleDeLaTache(tache, modeleProfil) {
  const { modele, effort } = TABLE[validerTache(tache)];
  const principal = modele === MODELE_DU_PROFIL ? modeleProfil : modele;
  return { modele: principal, effort, secours: SECOURS[principal] };
}
