// Carillon du retournement (spec #182, ticket #187) : synthétisé par Web Audio, aucun fichier. Éteint par défaut, joué
// seulement au retournement et seulement si l'Élève l'a activé (réglage du Profil). Plus long à mesure que le Palier
// monte : d'une note (bronze) à cinq (diamant et surprise), en gamme pentatonique.
// Une carte de ligne sonne toujours au rang 4, le plus long (voir app.js) : une Leçon Acquise est un aboutissement sans
// Palier à graduer ; ce rang fixe est un choix de conception, sans cadre, hypothèse à mesurer (docs/cadres-scientifiques.md).

const GAMME = [0, 2, 4, 7, 9]; // demi-tons depuis le do
const PAS = 0.11; // secondes entre deux notes

// Les notes du carillon pour un rang de 1 à 4 : [{ debut (s), demiTons }].
export function notesCarillon(rang) {
  const r = Math.min(Math.max(Math.round(rang) || 1, 1), 4);
  return GAMME.slice(0, r === 4 ? 5 : r).map((demiTons, i) => ({ debut: +(i * PAS).toFixed(3), demiTons }));
}

let audio = null;
// Joue le carillon du rang donné ; ne fait rien si le son est éteint ou indisponible.
export function jouerCarillon(rang, { actif }) {
  if (!actif) return;
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime + 0.02, sortie = audio.createGain();
    sortie.gain.value = 0.12;
    sortie.connect(audio.destination);
    for (const { debut, demiTons } of notesCarillon(rang)) {
      const f = 261.63 * 2 ** (demiTons / 12);
      for (const [mult, volume] of [[1, 0.6], [2.01, 0.18]]) {
        const o = audio.createOscillator(), e = audio.createGain(), d = t + debut;
        o.frequency.value = f * mult;
        e.gain.setValueAtTime(0, d);
        e.gain.linearRampToValueAtTime(volume, d + 0.012);
        e.gain.exponentialRampToValueAtTime(0.0001, d + 0.9);
        o.connect(e).connect(sortie);
        o.start(d);
        o.stop(d + 1);
      }
    }
  } catch { /* pas de son : tant pis */ }
}
