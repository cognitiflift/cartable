// Thème de l'appli (#114) : automatique (la préférence de l'appareil), clair ou sombre, retenu sur l'appareil.
// Script classique, chargé dans <head> après les feuilles de style : il s'applique avant le premier rendu, sans flash.
// Se range dans globalThis.cartableTheme pour app.js et les tests.
(() => {
  // Chaque thème : son nom dans le bouton, son icône et le color-scheme qu'il pose. L'ordre est celui du bouton.
  const THEMES = {
    auto: { nom: 'automatique, comme l\'appareil', icone: '🌗', schema: '' }, // '' : celui des feuilles, light dark
    clair: { nom: 'clair', icone: '☀️', schema: 'light' },
    sombre: { nom: 'sombre', icone: '🌙', schema: 'dark' },
  };
  const CLE = 'theme'; // distincte de « pseudo » : changer d'Élève ne l'efface pas

  const lire = (stockage) => {
    try {
      const theme = stockage?.getItem(CLE);
      return Object.hasOwn(THEMES, theme) ? theme : 'auto';
    } catch { return 'auto'; } // stockage indisponible (navigation privée, bloqué)
  };
  const retenir = (stockage, theme) => {
    try { stockage?.setItem(CLE, theme); } catch { /* stockage indisponible : le choix vaut pour cette page */ }
  };

  // Les feuilles (l'appli, le Kit, les Pages de leçon) écrivent leur sombre une seule fois, sous
  // @media (prefers-color-scheme: dark). Un thème forcé réécrit chacune de ces conditions en toujours vraie ou jamais
  // vraie ; l'automatique leur rend leur texte d'origine, donc la préférence de l'appareil, même changée en cours de route.
  const PREFERENCE = /\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/g;
  const TOUJOURS = '(min-width: 0)', JAMAIS = '(not (min-width: 0))';
  const origines = new WeakMap(); // porteur d'une condition → son texte d'origine
  const forcer = (texte, theme) => texte.replace(PREFERENCE, (_, schema) => ((schema === 'dark') === (theme === 'sombre') ? TOUJOURS : JAMAIS));

  // Porteurs d'une condition : règle @media, règle @import, feuille entière (<link media>, <style media>).
  const parcourir = (noeud, theme) => {
    if (noeud.media) {
      if (!origines.has(noeud)) origines.set(noeud, noeud.media.mediaText);
      const origine = origines.get(noeud);
      const texte = theme === 'auto' ? origine : forcer(origine, theme);
      if (noeud.media.mediaText !== texte) noeud.media.mediaText = texte;
    }
    if (noeud.styleSheet) parcourir(noeud.styleSheet, theme); // feuille d'un @import
    let regles;
    try { regles = noeud.cssRules; } catch { return; } // feuille d'une autre origine : illisible
    for (const regle of regles ?? []) parcourir(regle, theme);
  };

  // color-scheme suit aussi le choix : contrôles natifs, barres de défilement, et le prefers-color-scheme des iframes.
  const appliquer = (doc, theme) => {
    doc.documentElement.style.colorScheme = THEMES[theme].schema;
    for (const feuille of doc.styleSheets) parcourir(feuille, theme);
  };

  // Le bouton de l'en-tête : un clic passe au thème suivant ; son nom dit le thème courant et l'action.
  const ordre = Object.keys(THEMES);
  const suivant = (theme) => ordre[(ordre.indexOf(theme) + 1) % ordre.length];
  const libelle = (theme) => `Thème : ${THEMES[theme].nom}. ${suivant(theme) === 'auto' ? 'Revenir au thème automatique' : `Passer au thème ${THEMES[suivant(theme)].nom}`}`;
  const icone = (theme) => THEMES[theme].icone;

  globalThis.cartableTheme = { lire, retenir, appliquer, suivant, libelle, icone };

  if (typeof document === 'undefined') return;
  const stockage = (() => { try { return localStorage; } catch { return undefined; } })();
  let actuel = lire(stockage); // gardé ici aussi : sans stockage, le choix vaut au moins pour cette page
  // Les Pages de leçon et Ma fiche, en iframe de même origine : color-scheme, hérité par l'iframe, leur donne déjà le
  // bon prefers-color-scheme là où le navigateur suit la spécification ; sinon, leurs feuilles sont réécrites au chargement.
  const appliquerAuCadre = (cadre) => {
    try { if (cadre.contentDocument) appliquer(cadre.contentDocument, actuel); } catch { /* autre origine */ }
  };
  document.addEventListener('load', (ev) => { if (ev.target.tagName === 'IFRAME') appliquerAuCadre(ev.target); }, true);
  // Dans la page : le thème courant, et le passage au suivant (retenu, appliqué à la page et à ses iframes).
  globalThis.cartableTheme.courant = () => actuel;
  globalThis.cartableTheme.basculer = () => {
    actuel = suivant(actuel);
    retenir(stockage, actuel);
    appliquer(document, actuel);
    document.querySelectorAll('iframe').forEach(appliquerAuCadre);
  };
  appliquer(document, actuel);
})();
