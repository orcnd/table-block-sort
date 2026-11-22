#!/bin/sh
# Builds dist/table-block-sort.zip with only the files the plugin needs (no verify/, scratch or build scripts).
set -eu
cd "$(dirname "$0")/.."
php -l table-block-sort.php >/dev/null
for f in assets/*.js; do node --check "$f"; done
rm -rf dist && mkdir -p dist/table-block-sort/assets
cp table-block-sort.php readme.txt dist/table-block-sort/
cp assets/editor.js assets/view.js assets/view.css dist/table-block-sort/assets/
(cd dist && zip -qr table-block-sort.zip table-block-sort)
echo "dist/table-block-sort.zip"
unzip -l dist/table-block-sort.zip | tail -n +4 | sed '$d' | sed '$d'
