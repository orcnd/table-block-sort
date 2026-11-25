---
name: table-block-sort
description: Use when working on Table Block Sort in any way - changing its code or readme, fixing a bug, adding a feature, testing it, drawing its banner, icon or screenshots, or releasing it to WordPress.org and GitHub.
---

# Table Block Sort

A WordPress plugin that adds sorting, search, CSV download, phone cards, a sticky header and more to the core Table block.

## Files next to this one

| File | Read it when |
|---|---|
| `working-rules.md` | Always (loaded through CLAUDE.md): approvals, commits, text, verification |
| `status.md` | Always (loaded through CLAUDE.md): where things stand, what comes next |
| `design.md` | Before touching the UI, the readme text or any image |
| `wordpress-org.md` | Before a release or anything that goes to WordPress.org |

## Layout

| Path | Holds |
|---|---|
| `table-block-sort.php` | Header; adds the attributes to core/table; marks tables at render, prints the tools bar and enqueues the assets on that page only |
| `assets/editor.js` | Toolbar buttons (sort, search, stripes, download), "More table tools" menu (cards, sticky, show more, share) and the "Visitor tools" sidebar panel |
| `assets/view.js` | Front end: column type detection, sorting, search, CSV, cards, show more, shareable links |
| `assets/view.css` | Header buttons, tools bar, cards, sticky header, stripes |
| `readme.txt`, `README.md` | Directory listing (must pass the readme validator) and the GitHub page |
| `verify/` | Playground blueprint, `/tables/` and `/sort-tests/` pages, sort cases, screenshots |
| `checklist.md` | Items closed with evidence |
| `bin/build-zip.sh` | Builds `dist/table-block-sort.zip` with only the files the plugin needs |
| `bin/svn-stage.sh` | Prepares the SVN folder, never commits |

Prefix `table_block_sort` / `table-block-sort`, text domain `table-block-sort`, version constant
`TABLE_BLOCK_SORT_VERSION`.

## Decisions

- No build step and no minified files: WordPress.org wants readable code, and the plugin is small.
- Plain deferred script, not the Interactivity API: without JS the table stays a normal table, and reordering rows is
  direct DOM work.
- The settings are block attributes (`sortable`, `searchable`, `downloadable`, `phoneCards`, `stickyHeader`,
  `shareLinks`, `rowsShown`). Nothing goes in the options table, so there is no uninstall.php.
- The main switches live in the toolbar because core's "Settings" panel is a closed ToolsPanel; the same switches are
  in the sidebar.
- Column type by majority: more than half dates, else more than half numbers, else text. Dates win when both reach the
  majority ("14.03.2026"). Non-value cells go after values; empty and placeholder cells last. Decimal sign and
  day/month order are decided per column; the site language only breaks ties.
- Every parsing change keeps `/sort-tests/` and `verify/sort-cases.html` at 100% in all five languages. Add a case to
  `verify/sort-cases.json` for every reported bug.
- Ties keep the order the author wrote, not the previous sort's order.
- Stripes reuse core's `is-style-stripes` class, so the switch and the Styles panel agree. Search moves hidden rows to
  the end of the body so `nth-child` stripes hold.
- Search highlights use the CSS Custom Highlight API, so cell HTML is never changed. Phone cards wrap each cell's
  content in one span (needed for the two-column grid).
- Sticky header sets the figure's overflow to visible; core's sideways scroll and a sticky header cannot coexist.
- Link params: `table{n}-sort`, `table{n}-order=desc`, `table{n}-search`; n counts link-enabled tables.
- The CSV is what the visitor sees (sorted, matching rows), with a BOM and an apostrophe before formula-like cells. It
  is made in the browser; nothing is sent anywhere.
- Demo tables in `verify/setup.php` must be exactly what core saves, or the editor shows "Attempt recovery".
- In JS, write non-ASCII characters in patterns as `\u` escapes.
