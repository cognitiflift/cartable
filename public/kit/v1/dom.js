// Kit v1 — petit outil DOM partagé par le rendu des questions (question.js et rendus/).
export const el = (tag, attrs = {}, ...enfants) => {
  const n = Object.assign(document.createElement(tag), attrs);
  n.append(...enfants.filter((e) => e != null));
  return n;
};
