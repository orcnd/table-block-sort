#!/bin/sh
# Prepares the WordPress.org SVN folder for a release: builds, copies dist/ to trunk, makes the tag and copies the
# listing images. Stops if an agent file or any other unexpected file would get in. Never commits.
# Usage: bin/svn-stage.sh [svn-folder]   (default: ../table-block-sort-svn)
set -eu
slug="table-block-sort"
svn_dir=${1:-"$(dirname "$0")/../../$slug-svn"}
svn_dir=$(cd "$svn_dir" && pwd)
cd "$(dirname "$0")/.."

version=$(sed -n 's/^Stable tag:[[:space:]]*//p' readme.txt | head -1)
header=$(sed -n 's/^[[:space:]*]*Version:[[:space:]]*//p' "$slug.php" | head -1)
[ -n "$version" ] && [ "$version" = "$header" ] || { echo "Stable tag '$version' and plugin header '$header' differ" >&2; exit 1; }

# Files that belong on GitHub only.
refuse() {
	bad=$(find "$1" -path '*/.svn' -prune -o \( -name '.*' ! -name '.svn' ! -path "$1" -o -iname 'CLAUDE*.md' -o -iname 'AGENTS.md' -o -iname 'SKILL.md' -o -iname 'slop*' -o -name 'verify' -o -name 'scratch' -o -name 'checklist.md' \) -print)
	[ -z "$bad" ] || { echo "Refused, these must not go to SVN:" >&2; echo "$bad" >&2; exit 1; }
}

bin/build-zip.sh >/dev/null
refuse "dist/$slug"
svn update -q --non-interactive "$svn_dir"
[ ! -e "$svn_dir/tags/$version" ] || { echo "tags/$version already exists: bump the version" >&2; exit 1; }

rsync -a --delete --exclude .svn "dist/$slug/" "$svn_dir/trunk/"
if ls .wordpress-org/*.png >/dev/null 2>&1; then
	mkdir -p "$svn_dir/assets"
	cp .wordpress-org/*.png "$svn_dir/assets/"
fi
find "$svn_dir" -name .DS_Store -not -path '*/.svn/*' -delete
cd "$svn_dir"
# Before anything is added: the folders hold only what may be published.
for folder in trunk assets; do [ ! -d "$folder" ] || refuse "$svn_dir/$folder"; done
svn add -q --force trunk
[ ! -d assets ] || svn add -q --force assets
svn status trunk | sed -n 's/^!  *//p' | while IFS= read -r gone; do svn rm -q "$gone"; done
for image in assets/*.png; do [ ! -e "$image" ] || svn propset -q svn:mime-type image/png "$image"; done
svn cp -q trunk "tags/$version"
refuse "$svn_dir/tags/$version"
svn status
echo "Staged $version in $svn_dir. Nothing is committed."
