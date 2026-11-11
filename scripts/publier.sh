#!/usr/bin/env bash
# Publie une nouvelle version sur le NAS : pull en avance rapide, vérifications,
# puis redémarrage du conteneur. S'arrête au premier échec. Ne touche jamais à eleves/.
#
# Variables d'environnement (remplaçables, notamment pour les tests) :
#   VERIFS_CMD   vérifications à passer (défaut : « npm run check && npm test »)
#   RESTART_CMD  redémarrage du conteneur (défaut : « docker restart cartable »)
set -e

VERIFS_CMD="${VERIFS_CMD:-npm run check && npm test}"
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
