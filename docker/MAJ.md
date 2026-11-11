# Mettre à jour la CLI claude et le plugin

La CLI `claude` et le plugin `mattpocock-skills` sont installés dans l'image au moment du build : les mettre à jour, c'est reconstruire l'image.

1. Si le plugin change de version, régler `ARG PLUGIN_VERSION` du `Dockerfile` (le build échoue tant que la version du marketplace ne correspond pas). Version courante : `claude plugin marketplace add mattpocock/skills`, `claude plugin install mattpocock-skills@mattpocock`, puis `ls ~/.claude/plugins/cache/mattpocock/mattpocock-skills`.
2. Reconstruire sans cache : `docker compose build --no-cache`.
3. Relancer : `docker compose up -d`.
4. Vérifier : `docker compose exec cartable claude --version` et l'accueil sur le port configuré.

Le code de Cartable et `eleves/` sont montés : une mise à jour de l'image ne touche à aucune donnée. Mettre à jour le code, c'est `git pull` dans le dossier partagé puis `docker compose restart`.
