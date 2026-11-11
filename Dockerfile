# Image Cartable : Node (version de la CI), CLI claude, plugin mattpocock-skills.
# Elle ne contient ni le code de Cartable ni les données : le dépôt est monté sur /app, eleves/ sur /app/eleves.
# Mise à jour de la CLI et du plugin : voir docker/MAJ.md (reconstruire l'image).
FROM node:26-slim

# Version du plugin attendue : le build échoue si le marketplace en propose une autre, pour que la version
# embarquée soit toujours connue. Pour la changer : docker/MAJ.md.
ARG PLUGIN_VERSION=1.3.2

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code && claude --version

# HOME commun et inscriptible par n'importe quel identifiant (PUID/PGID du compose) : config et plugin de claude.
ENV HOME=/opt/claude
RUN mkdir -p "$HOME" \
 && claude plugin marketplace add mattpocock/skills \
 && claude plugin install mattpocock-skills@mattpocock \
 && test -d "$HOME/.claude/plugins/cache/mattpocock/mattpocock-skills/$PLUGIN_VERSION" \
 && ln -s "$HOME/.claude/plugins/cache/mattpocock/mattpocock-skills/$PLUGIN_VERSION/skills/productivity/teach" /opt/teach \
 && test -f /opt/teach/GLOSSARY-FORMAT.md \
 && chmod -R a+rwX "$HOME"

ENV TEACH_SKILL_DIR=/opt/teach \
    TZ=Europe/Brussels \
    PORT=3000

WORKDIR /app
EXPOSE 3000
CMD ["node", "server.js"]
