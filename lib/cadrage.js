import { HttpError } from './http-error.js';

// Cadrage posé par l'appli (ADR 0002, spec #46) : deux questions fixes, à réponses fermées, sans tour du prof.
// L'écran envoie les valeurs ; le prof et les Propositions reçoivent les libellés. « Je ne sais pas » toujours possible.
export const QUESTIONS_CADRAGE = {
  pourquoi: {
    question: 'Pourquoi ?',
    reponses: {
      curiosite: 'Par curiosité',
      ecole: "Pour l'école",
      expose: 'Pour un exposé ou un projet',
      controle: 'Pour un contrôle',
      'en-parler': "Pour en parler avec quelqu'un",
      'je-ne-sais-pas': 'Je ne sais pas',
    },
  },
  deja: {
    question: 'Tu en sais déjà…',
    reponses: {
      rien: 'Rien, je découvre',
      'un-peu': 'Un peu',
      beaucoup: 'Beaucoup',
      incollable: 'Je suis incollable',
      'je-ne-sais-pas': 'Je ne sais pas',
    },
  },
};

// Les mêmes questions telles que l'écran les pose quand le sujet est connu (sujet tapé ou titre d'une Proposition, #118) :
// `{sujet}` y est remplacé par l'écran. En révision, le sujet n'est pas encore connu : l'écran pose `question`.
export const QUESTIONS_AVEC_SUJET = {
  pourquoi: 'Pourquoi veux-tu apprendre « {sujet} » ?',
  deja: 'Sur « {sujet} », tu en sais déjà…',
};

// Questions posées selon le mode : une Leçon de révision ne demande pas « Pourquoi ? » (c'est pour un contrôle).
export const questionsDuMode = (mode) => (mode === 'revision' ? ['deja'] : ['pourquoi', 'deja']);

// Cadrage envoyé avec la création d'une Leçon : null s'il est absent ou vide ; 400 pour toute valeur ou question
// inconnue, ou non posée dans ce mode.
export function validerCadrage(brut, mode) {
  if (brut === undefined || brut === null) return null;
  if (typeof brut !== 'object' || Array.isArray(brut)) throw new HttpError(400, 'Cadrage invalide');
  const posees = questionsDuMode(mode);
  const cadrage = {};
  for (const [cle, valeur] of Object.entries(brut)) {
    if (valeur === undefined || valeur === null) continue;
    if (!posees.includes(cle)) throw new HttpError(400, 'Cadrage : question inconnue');
    if (typeof valeur !== 'string' || !Object.hasOwn(QUESTIONS_CADRAGE[cle].reponses, valeur)) throw new HttpError(400, 'Cadrage : réponse inconnue');
    cadrage[cle] = valeur;
  }
  return Object.keys(cadrage).length ? cadrage : null;
}

// Libellés du Cadrage, dans l'ordre des questions : « Pourquoi ? Pour un contrôle ; Tu en sais déjà… Un peu ».
export const libellesCadrage = (cadrage) =>
  Object.keys(QUESTIONS_CADRAGE)
    .filter((cle) => cadrage?.[cle])
    .map((cle) => `${QUESTIONS_CADRAGE[cle].question} ${QUESTIONS_CADRAGE[cle].reponses[cadrage[cle]]}`)
    .join(' ; ');

// Ajout au premier prompt du prof : les réponses que l'Élève a déjà données à l'appli. Rien sans Cadrage.
export function promptCadrage(prompt, cadrage) {
  if (!cadrage) return prompt;
  return `${prompt}\n[Cadrage : l'appli a déjà posé ces questions à l'élève, ne les repose pas. ${libellesCadrage(cadrage)}.]`;
}
