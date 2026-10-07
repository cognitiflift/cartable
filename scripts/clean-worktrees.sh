#!/usr/bin/env bash
# Revient sur main, la met à jour, puis propose de supprimer :
#   1. les worktrees devenus inutiles,
#   2. les branches locales sans worktree devenues inutiles
# (déjà dans main, squash-mergées, ou dont la branche distante a été supprimée).
#
# Usage : scripts/clean-worktrees.sh
# Touches : ↑/↓ (ou j/k) déplacer · espace cocher · a tout (dé)cocher
#           entrée valider · q/échap passer l'étape
set -euo pipefail

main_branch=main

[[ -t 0 && -t 1 ]] || { echo "Ce script est interactif : lance-le dans un terminal." >&2; exit 1; }

root=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
here=$(git rev-parse --show-toplevel)
cd "$root"

echo "→ git switch $main_branch"
git switch "$main_branch"
echo "→ git fetch --prune && git pull --ff-only"
git fetch --prune --quiet
git pull --ff-only
git worktree prune

# Vrai si le contenu de la branche est déjà dans main via un squash-merge.
squash_merged() {
  local b=$1 base tmp
  base=$(git merge-base "$main_branch" "$b") || return 1
  tmp=$(git commit-tree "$(git rev-parse "$b^{tree}")" -p "$base" -m _)
  [[ $(git cherry "$main_branch" "$tmp") == -* ]]
}

# Pose `reason` et `lost` (1 si des commits de la branche ne sont pas dans main),
# ou échoue si la branche est encore utile.
classify() {
  local b=$1
  lost=0
  if git merge-base --is-ancestor "$b" "$main_branch"; then
    reason="déjà dans $main_branch"
  elif squash_merged "$b"; then
    reason="squash-mergée dans $main_branch"
  elif [[ $(git for-each-ref --format='%(upstream:track)' "refs/heads/$b") == "[gone]" ]]; then
    reason="branche distante supprimée"
    lost=1
  else
    return 1
  fi
}

# Menu à cocher sur `labels` / `warns` / `sel` ; remplit `chosen` avec les index cochés.
menu() {
  local n=${#labels[@]} cur=0 key rest i
  chosen=()
  draw() {
    local i mark ptr warn
    for ((i = 0; i < n; i++)); do
      [[ ${sel[i]} == 1 ]] && mark='[x]' || mark='[ ]'
      [[ $i == "$cur" ]] && ptr=$'\e[1;36m❯\e[0m' || ptr=' '
      [[ -n ${warns[i]} ]] && warn=$' \e[33m⚠ '"${warns[i]}"$'\e[0m' || warn=''
      printf '\e[2K%s %s %s%s\n' "$ptr" "$mark" "${labels[i]}" "$warn"
    done
    printf '\e[2K\e[2m↑/↓ déplacer · espace cocher · a tout (dé)cocher · entrée valider · q passer\e[0m\n'
  }
  toggle_all() {
    local i v=0
    for ((i = 0; i < n; i++)); do [[ ${sel[i]} == 0 ]] && v=1; done
    for ((i = 0; i < n; i++)); do sel[i]=$v; done
  }
  printf '\e[?25l'
  draw
  while true; do
    IFS= read -rsn1 key
    case $key in
      ' ') sel[cur]=$((1 - sel[cur])) ;;
      a | A) toggle_all ;;
      k) cur=$(((cur - 1 + n) % n)) ;;
      j) cur=$(((cur + 1) % n)) ;;
      q | Q) printf '\e[?25h'; echo "Étape passée."; return 0 ;;
      '') break ;;
      $'\e')
        rest=''
        IFS= read -rsn2 -t 0.05 rest || true
        case $rest in
          '[A') cur=$(((cur - 1 + n) % n)) ;;
          '[B') cur=$(((cur + 1) % n)) ;;
          '') printf '\e[?25h'; echo "Étape passée."; return 0 ;;
        esac
        ;;
    esac
    printf '\e[%dA' $((n + 1))
    draw
  done
  printf '\e[?25h'
  for ((i = 0; i < n; i++)); do [[ ${sel[i]} == 1 ]] && chosen+=("$i"); done
  return 0
}

trap 'printf "\e[?25h"' EXIT

# Confirme la suppression des éléments choisis ; `nrisky` = combien perdent du travail.
confirm() {
  local what=$1 nrisky=$2 msg ok
  msg="Supprimer ${#chosen[@]} $what"
  (( nrisky > 0 )) && msg+=" (dont $nrisky avec du travail qui sera perdu)"
  read -rp "$msg ? [o/N] " ok
  [[ $ok == [oOyY]* ]]
}

# --- 1. Worktrees -----------------------------------------------------------

labels=() warns=() sel=() paths=() dirty=()

consider_worktree() {
  local path=$1 branch=$2 locked=$3 d=0 warn=''
  [[ -z $path || $path == "$root" || $path == "$here" || -n $locked || -z $branch ]] && return 0
  classify "$branch" || return 0
  [[ -n $(git -C "$path" status --porcelain 2>/dev/null) ]] && d=1
  (( d )) && warn='modifs non commitées'
  (( lost )) && warn+="${warn:+, }commits absents de $main_branch"
  labels+=("$branch"$' \e[2m('"$reason · ${path#"$root"/}"$')\e[0m')
  warns+=("$warn") paths+=("$path") dirty+=("$d")
  sel+=($([[ -z $warn ]] && echo 1 || echo 0))  # pré-coché seulement sans risque
}

path='' branch='' locked=''
while IFS= read -r line; do
  case $line in
    "worktree "*) path=${line#worktree } ;;
    "branch refs/heads/"*) branch=${line#branch refs/heads/} ;;
    locked*) locked=1 ;;
    '') consider_worktree "$path" "$branch" "$locked"; path='' branch='' locked='' ;;
  esac
done < <(git worktree list --porcelain; echo)

echo
if (( ${#labels[@]} == 0 )); then
  echo "✓ Aucun worktree inutile."
else
  echo "Worktrees qui semblent inutiles :"
  menu
  nrisky=0
  for i in "${chosen[@]}"; do [[ -n ${warns[i]} ]] && nrisky=$((nrisky + 1)); done
  if (( ${#chosen[@]} > 0 )) && confirm "worktree(s)" "$nrisky"; then
    for i in "${chosen[@]}"; do
      force=()
      [[ ${dirty[i]} == 1 ]] && force=(--force)
      git worktree remove "${force[@]}" "${paths[i]}" && echo "✓ ${paths[i]#"$root"/} supprimé"
    done
  fi
fi

# --- 2. Branches locales sans worktree -------------------------------------
# (inclut celles des worktrees qu'on vient de supprimer)

labels=() warns=() sel=() names=()
checked_out=$(git worktree list --porcelain | sed -n 's/^branch refs\/heads\///p')

while IFS= read -r b; do
  [[ $b == "$main_branch" ]] && continue
  grep -qxF "$b" <<<"$checked_out" && continue
  classify "$b" || continue
  labels+=("$b"$' \e[2m('"$reason"$')\e[0m')
  if (( lost )); then warns+=("commits absents de $main_branch"); else warns+=(''); fi
  names+=("$b") sel+=($((1 - lost)))
done < <(git for-each-ref --format='%(refname:short)' refs/heads)

echo
if (( ${#labels[@]} == 0 )); then
  echo "✓ Aucune branche locale inutile."
  exit 0
fi
echo "Branches locales qui semblent inutiles :"
menu
nrisky=0
for i in "${chosen[@]}"; do [[ -n ${warns[i]} ]] && nrisky=$((nrisky + 1)); done
if (( ${#chosen[@]} > 0 )) && confirm "branche(s)" "$nrisky"; then
  for i in "${chosen[@]}"; do
    git branch -D "${names[i]}" >/dev/null && echo "✓ branche ${names[i]} supprimée"
  done
fi
