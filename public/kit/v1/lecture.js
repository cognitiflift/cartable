// Kit v1 — lecture à voix haute (#76) : un bouton « 🔊 » lit le texte de la page ou une question avec la synthèse
// vocale du navigateur, et le même bouton (« ⏹ ») l'arrête à tout moment. Seules les voix de l'appareil sont utilisées
// (choisirVoix) : aucun texte ne sort de l'appareil ; sans voix de l'appareil, aucun bouton ne s'affiche.
// Activée par le réglage du Profil, que l'appli transmet dans l'adresse de la page (lectureActivee). Le quiz du Kit
// (quiz.js) ajoute lui-même le bouton de la page et ceux des questions ; l'appli s'en sert pour les Révisions du jour.
// La logique (voix, texte d'une question, découpage) est dans lecture-logique.js.
import { choisirVoix, morceaux, texteDeBloc, FIN_DE_VERS } from './lecture-logique.js';
import { el } from './dom.js';

const synthese = globalThis.speechSynthesis ?? null;
const ECOUTER = '🔊 Écouter';
const ARRETER = '⏹ Arrêter';
let boutonActif = null; // le bouton dont la lecture est en cours : une seule lecture à la fois
let lectures = 0; // numéro de la dernière lecture lancée

// Voix de l'appareil, ou null. Les voix se chargent parfois après la page (évènement voiceschanged) : on attend un peu.
let voixPromise = null;
const voix = () => voixPromise ??= new Promise((resolve) => {
  if (!synthese) return resolve(null);
  const essayer = () => {
    const v = synthese.getVoices();
    if (!v.length) return false;
    resolve(choisirVoix(v));
    return true;
  };
  if (essayer()) return;
  synthese.addEventListener('voiceschanged', essayer);
  setTimeout(() => resolve(choisirVoix(synthese.getVoices())), 2000);
});

const remettre = (bouton) => {
  bouton.textContent = bouton.dataset.libelle;
  bouton.setAttribute('aria-pressed', 'false');
};

// Arrête la lecture en cours, s'il y en a une.
export function arreterLecture() {
  if (boutonActif) remettre(boutonActif);
  boutonActif = null;
  lectures++;
  synthese?.cancel();
}

async function lire(bouton, texte) {
  const v = await voix();
  if (!v) return;
  arreterLecture();
  const numero = ++lectures;
  boutonActif = bouton;
  bouton.textContent = ARRETER;
  bouton.setAttribute('aria-pressed', 'true');
  const parties = morceaux(texte);
  parties.forEach((partie, i) => {
    const enonce = new SpeechSynthesisUtterance(partie);
    enonce.voice = v; // toujours une voix de l'appareil, jamais celle par défaut (qui pourrait être en ligne)
    enonce.lang = v.lang;
    enonce.rate = 0.9; // un peu plus lent, pour les jeunes lecteurs
    // Fin de la dernière partie : le bouton redevient « 🔊 », sauf si une autre lecture a commencé entre-temps.
    if (i === parties.length - 1) enonce.addEventListener('end', () => numero === lectures && arreterLecture());
    synthese.speak(enonce);
  });
  if (!parties.length) arreterLecture();
}

// Bouton de lecture : `texte()` donne le texte à lire au moment du clic. Caché tant qu'on ne sait pas s'il y a une voix
// sur l'appareil, retiré s'il n'y en a pas.
export function boutonLecture(texte, { libelle = ECOUTER, titre = 'Lire à voix haute' } = {}) {
  const bouton = el('button', { type: 'button', className: 'kit-lecture', title: titre, hidden: true }, libelle);
  bouton.dataset.libelle = libelle;
  bouton.setAttribute('aria-pressed', 'false');
  bouton.addEventListener('click', () => (boutonActif === bouton ? arreterLecture() : lire(bouton, texte())));
  voix().then((v) => (v ? (bouton.hidden = false) : bouton.remove()));
  return bouton;
}

// Blocs de texte lus sur la page, dans l'ordre ; ni le quiz (ses questions ont leur propre bouton), ni les crédits
// des figures, ni le code, ni les schémas. L'extrait de texte d'une figure (<blockquote>) est lu, vers par vers.
const BLOCS = 'h1, h2, h3, h4, h5, h6, p, li, dt, dd, th, td, figcaption, blockquote, aside';
const EXCLUS = '.kit-quiz, .kit-credit, .kit-lecture, script, style, svg, template, [hidden], [aria-hidden="true"]';

function texteDeLaPage(racine) {
  const blocs = [...racine.querySelectorAll(BLOCS)]
    .filter((b) => !b.closest(EXCLUS) && !b.querySelector(BLOCS)); // un bloc qui en contient d'autres est lu par eux
  return blocs.map((b) => {
    const copie = b.cloneNode(true);
    copie.querySelectorAll(EXCLUS).forEach((n) => n.remove());
    copie.querySelectorAll('br').forEach((n) => n.replaceWith(FIN_DE_VERS)); // des vers jamais collés
    return texteDeBloc(copie.textContent);
  }).filter(Boolean).join(' ');
}

// Ajoute en haut de la page le bouton qui lit son texte.
export function ajouterLecturePage(racine = document.body) {
  const bouton = boutonLecture(() => texteDeLaPage(racine), { libelle: '🔊 Écouter la page' });
  racine.prepend(el('p', { className: 'kit-lecture-page' }, bouton));
  // Quitter la page (ou en changer dans l'appli) arrête la lecture.
  globalThis.addEventListener?.('pagehide', arreterLecture);
}
