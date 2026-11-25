# Status

Updated 2026-11-25.

- Version: 0.1.0, not released on WordPress.org
- Repository: https://github.com/orcnd/table-block-sort (public, branch main)
- WordPress.org: not submitted yet as far as this repository knows. The owner uploads `dist/table-block-sort.zip` at
  https://wordpress.org/plugins/developers/add/

## Open

- `checklist.md` rows 8 and 9 still say open. Plugin Check was clean on the final code, and the readme validator had no
  errors on commit 47e2faa (notes: tag `table block` not widely used, no Upgrade Notice, no donate link). Both ran
  before the readme fix b238b60, which changed text only.
- readme.txt says view.js is about 37 KB; it is 38.1 KB (39,039 bytes).
- Row 11: the plugin was never run on a WordPress site whose language is German, only view.js in a German page.
- The CSV file name was not confirmed in the owner's own browser.
- The name no longer covers everything the plugin does. After approval it cannot change.

## Next

1. The owner uploads the zip and forwards the review email.
2. After approval: check out SVN to `../table-block-sort-svn`, run `bin/svn-stage.sh`, ask before committing.
