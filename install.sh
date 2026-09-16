#!/usr/bin/env bash
# Copy the AI SDLC kit (skills, flows, /sdlc command) into an existing repo.
# Does not copy sample apps or docs/sdlc/<slug>/ run artifacts.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./install.sh <existing-repo> [--force]

  Copies skills/, flows/, AGENTS.md, CLAUDE.md, and Cursor ADHD rule.
  Wires .cursor / .claude / .agents as symlinks into skills/.
  Creates docs/sdlc/ and docs/adr/. Appends .worktrees/ to .gitignore.

  --force  overwrite existing flows/*.json and always-on files
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

KIT="$(cd "$(dirname "$0")" && pwd)"
FORCE=0
DEST=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      if [[ -n "$DEST" ]]; then
        echo "Unexpected argument: $arg" >&2
        usage >&2
        exit 1
      fi
      DEST="$arg"
      ;;
  esac
done

if [[ -z "$DEST" ]]; then
  usage >&2
  exit 1
fi

mkdir -p "$DEST"
DEST="$(cd "$DEST" && pwd)"

if [[ "$DEST" == "$KIT" ]]; then
  echo "Refusing to install into the kit itself: $DEST" >&2
  exit 1
fi

if [[ ! -d "$KIT/skills" || ! -d "$KIT/flows" ]]; then
  echo "Kit incomplete. Missing skills/ or flows/ under $KIT" >&2
  exit 1
fi

copy_dir() {
  local src="$1" dst="$2"
  mkdir -p "$dst"
  cp -R "$src/." "$dst/"
}

copy_file() {
  local src="$1" dst="$2"
  if [[ -e "$dst" && "$FORCE" -eq 0 ]]; then
    echo "skip (exists): $dst"
    return
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  echo "wrote $dst"
}

# If dest already has AGENTS.md / CLAUDE.md, append the kit text once.
merge_instructions() {
  local src="$1" dst="$2"
  local needle="Invoke the SDLC orchestrator"
  if [[ -e "$dst" && "$FORCE" -eq 0 ]]; then
    append_once "$dst" "$needle" "$(cat "$src")"
    return
  fi
  copy_file "$src" "$dst"
}

append_once() {
  local file="$1" needle="$2" block="$3"
  if [[ -f "$file" ]] && grep -Fq "$needle" "$file"; then
    echo "skip (already present): $file"
    return
  fi
  if [[ -f "$file" ]]; then
    printf '\n%s\n' "$block" >> "$file"
    echo "appended $file"
  else
    printf '%s\n' "$block" > "$file"
    echo "wrote $file"
  fi
}

link_rel() {
  local dest_link="$1" target="$2"
  mkdir -p "$(dirname "$dest_link")"
  ln -sfn "$target" "$dest_link"
}

copy_dir "$KIT/skills" "$DEST/skills"
echo "copied skills/ -> $DEST/skills"

mkdir -p "$DEST/flows"
for f in "$KIT/flows"/*.json; do
  [[ -e "$f" ]] || continue
  copy_file "$f" "$DEST/flows/$(basename "$f")"
done

mkdir -p "$DEST/docs/sdlc" "$DEST/docs/adr"
merge_instructions "$KIT/AGENTS.md" "$DEST/AGENTS.md"
merge_instructions "$KIT/CLAUDE.md" "$DEST/CLAUDE.md"
copy_file "$KIT/.cursor/rules/simple.mdc" "$DEST/.cursor/rules/simple.mdc"

link_rel "$DEST/.cursor/skills" "../skills"
link_rel "$DEST/.cursor/commands/sdlc.md" "../../skills/sdlc/SKILL.md"
link_rel "$DEST/.claude/skills" "../skills"
link_rel "$DEST/.claude/commands/sdlc.md" "../../skills/sdlc/SKILL.md"
link_rel "$DEST/.agents/skills" "../skills"
echo "wired /sdlc command + skill symlinks"

append_once "$DEST/.gitignore" ".worktrees/" ".worktrees/"

echo
echo "Installed into $DEST"
echo "Open that repo and run /sdlc (Claude: /reload-skills first if already in a session)."
