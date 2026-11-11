#!/usr/bin/env bash
# Publie une nouvelle version sur le NAS : pull en avance rapide, vérifications,
# puis redémarrage du conteneur. S'arrête au premier échec. Ne touche jamais à eleves/.
#
# Variables d'environnement (remplaçables, notamment pour les tests) :
#   VERIFS_CMD   vérifications à passer (défaut : « npm run check && npm test » ; si npm est absent,
#                comme sur le NAS Synology, elles tournent dans le conteneur : « docker exec cartable … »)
#   RESTART_CMD  redémarrage du conteneur (défaut : « docker restart cartable »)
#   PUBLIER_PATH_EXTRA  dossier ajouté en fin de PATH (défaut : /usr/local/bin, où Synology met docker,
#                       absent du PATH d'une session SSH)
set -e

PATH="$PATH:${PUBLIER_PATH_EXTRA-/usr/local/bin}"

if [ -z "${VERIFS_CMD:-}" ]; then
  if command -v npm >/dev/null 2>&1; then
    VERIFS_CMD="npm run check && npm test"
  else
    # ELEVES_DIR temporaire : les tests ne doivent jamais voir les vrais Espaces personnels (/app/eleves).
    VERIFS_CMD="docker exec -e ELEVES_DIR=/tmp/verifs-eleves cartable sh -c 'npm run check && npm test'"
  fi
fi
RESTART_CMD="${RESTART_CMD:-docker restart cartable}"

cd "$(dirname "$0")/.."

echo "1/3 Récupération de la nouvelle version (git pull --ff-only)..."
if ! git pull --ff-only; then
  echo "ERREUR : le git pull a échoué (pas d'avance rapide ?). Rien n'est redémarré." >&2
  exit 1
fi

echo "2/3 Vérifications..."
if ! bash -c "$VERIFS_CMD"; then
  echo "ERREUR : les vérifications ont échoué. Le conteneur n'est pas redémarré." >&2
  exit 1
fi

echo "3/3 Redémarrage du conteneur..."
if ! bash -c "$RESTART_CMD"; then
  echo "ERREUR : le redémarrage du conteneur a échoué." >&2
  exit 1
fi

echo "Publication terminée."
