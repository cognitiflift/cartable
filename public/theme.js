// Thème de l'appli (#114) : automatique (la préférence de l'appareil), clair ou sombre, retenu sur l'appareil.
// Script classique, chargé dans <head> après les feuilles de style : il s'applique avant le premier rendu, sans flash.
// Se range dans globalThis.cartableTheme pour app.js et les tests.
(() => {
  const THEMES = ['auto', 'clair', 'sombre'];
  const CLE = 'theme'; // distincte de « pseudo » : changer d'Élève ne l'efface pas

  const lire = (stockage) => {
    try {
      const theme = stockage?.getItem(CLE);
      return THEMES.includes(theme) ? theme : 'auto';
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
  const origines = new WeakMap(); // règle @media → son texte d'origine
  const forcer = (texte, theme) => texte.replace(PREFERENCE, (_, schema) => ((schema === 'dark') === (theme === 'sombre') ? TOUJOURS : JAMAIS));

  const parcourir = (regles, theme) => {
    for (const regle of regles) {
      if (regle.styleSheet) parcourirFeuille(regle.styleSheet, theme); // @import
      if (regle.media && regle.cssRules) {
        if (!origines.has(regle)) origines.set(regle, regle.media.mediaText);
        const origine = origines.get(regle);
        const texte = theme === 'auto' ? origine : forcer(origine, theme);
        if (regle.media.mediaText !== texte) regle.media.mediaText = texte;
      }
      if (regle.cssRules) parcourir(regle.cssRules, theme);
    }
  };
  const parcourirFeuille = (feuille, theme) => {
    let regles;
    try { regles = feuille.cssRules; } catch { return; } // feuille d'une autre origine : illisible
    parcourir(regles, theme);
  };

  // color-scheme suit aussi le choix : contrôles natifs, barres de défilement, et le prefers-color-scheme des iframes.
  const appliquer = (doc, theme) => {
    doc.documentElement.style.colorScheme = { auto: '', clair: 'light', sombre: 'dark' }[theme];
    for (const feuille of doc.styleSheets) parcourirFeuille(feuille, theme);
  };

  // Le bouton de l'en-tête : un clic passe au thème suivant ; son nom dit le thème courant et l'action.
  const suivant = (theme) => THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const NOMS = { auto: 'automatique, comme l\'appareil', clair: 'clair', sombre: 'sombre' };
  const libelle = (theme) => `Thème : ${NOMS[theme]}. ${suivant(theme) === 'auto' ? 'Revenir au thème automatique' : `Passer au thème ${NOMS[suivant(theme)]}`}`;
  const ICONES = { auto: '🌗', clair: '☀️', sombre: '🌙' };

  globalThis.cartableTheme = { lire, retenir, appliquer, suivant, libelle, ICONES };

  if (typeof document === 'undefined') return;
  const stockage = (() => { try { return localStorage; } catch { return undefined; } })();
  let actuel = lire(stockage); // gardé ici aussi : sans stockage, le choix vaut au moins pour cette page
  // Les Pages de leçon et Ma fiche, en iframe de même origine : color-scheme, hérité par l'iframe, leur donne déjà le
  // bon prefers-color-scheme là où le navigateur suit la spécification ; sinon, leurs feuilles sont réécrites au chargement.
  const appliquerAuCadre = (cadre) => {
    try { if (cadre.contentDocument) appliquer(cadre.contentDocument, actuel); } catch { /* autre origine */ }
  };
  document.addEventListener('load', (ev) => { if (ev.target.tagName === 'IFRAME') appliquerAuCadre(ev.target); }, true);
  globalThis.cartableTheme.courant = () => actuel;
  globalThis.cartableTheme.choisir = (theme) => {
    actuel = theme;
    retenir(stockage, theme);
    appliquer(document, theme);
    document.querySelectorAll('iframe').forEach(appliquerAuCadre);
  };
  appliquer(document, actuel);
})();
