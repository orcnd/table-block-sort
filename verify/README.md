# Verification on WordPress Playground

Runs a throwaway WordPress (PHP 8.2, SQLite) with Plugin Check from WordPress.org and the built plugin
(`dist/table-block-sort`, the same files as the zip). `verify/setup.php` creates two pages:

- `/tables/`, in order: league (sortable, every column type, empty cells, a footer row), merged (sortable but has a
  merged body cell), headless (sortable but no header row), plain (not sortable), menu (sortable, searchable,
  striped, downloadable, phone cards, shareable links, 5 rows before "Show more", caption "Café menu", 8 rows), long
  (40 rows, sortable, sticky header, phone cards). The markup is exactly what core saves, so the editor opens all six as valid blocks.
- `/plain/`: only a non-sortable table.
- `/sort-tests/`: one table per case in `sort-cases.json` that runs on an English page (prices in many shapes,
  K/M/B, Gulf currencies, Arabic digits, percentages, placeholders, ranges, ISO and numeric dates both orders,
  month names, times, text). Each has a Value and an Expected column.

Sort cases in other languages run outside WordPress on `verify/sort-cases.html?lang=de-DE` (also en-US, en-GB,
tr-TR, ar-AE), served from the plugin folder (`python3 -m http.server 9402`). It loads the real `assets/view.js`
with that page language and checks every table both ways; the line at the top says how many checks pass.
`verify/sort-check.js` holds the check; on `/sort-tests/` run it in the console with
`fetch('/verify/sort-check.js').then(r => r.text()).then(eval).then(() => runSortTests())`.

```bash
bin/build-zip.sh
npx @wp-playground/cli@3.1.60 server \
  --mount=dist/table-block-sort:/wordpress/wp-content/plugins/table-block-sort \
  --mount=verify:/wordpress/verify \
  --blueprint=verify/blueprint.json --port=9401
```

1. `/tables/`: the league table has 5 header buttons, the menu table 4; the other three have none. Only the menu
   table has a search field.
2. Team ascending: alpha united, Örnek FC, Team 2, Team 10, Zebra. A second click reverses it.
3. Points ascending: -3, 0, 7, 12, 12. Budget ascending: $80, $950.50, $1,200, $15,000, then the empty cell.
   Founded ascending: 3/4/1999, 2001-07-01, 2010-12-31, 14.03.2019, 2024-01-05.
4. The sorted header has `aria-sort` (ascending / descending); the others have none. The footer stays last.
5. Ties keep the authored order: sort "Next match" twice, then Points: Örnek FC comes before alpha united.
6. Keyboard: Tab to a header button, Enter sorts, Space reverses.
7. `/plain/`: no `table-block-sort` script or stylesheet on the page.
8. Editor, Pages > Tables: no "Attempt recovery" on any table. Select each table: the sort button next to "Edit
   table" is pressed on the league table, disabled with the merged cells tooltip on the second, disabled with the
   "Header section" tooltip on the third, off on the fourth; clicking it toggles `sortable`. Publish and the front
   end sorts.
9. Menu table: search "drinks" shows Café Latte, Espresso, Iced Tea and "Matching rows: 3", still striped. Sort
   Price: Espresso, Iced Tea, Café Latte. "ornek" finds Örnek Simit. "zzz" shows "No rows match your search.".
   Clearing the field shows all 8 rows in price order.
10. Editor, menu table: the "Visitor tools" sidebar panel has Sortable columns, Search box and Striped rows, all on.
    Striped rows off removes `is-style-stripes` from the block; Search box off unpresses the toolbar search button.
11. Menu table: search "drinks", sort Price, click "Download CSV": `cafe-menu.csv` with a UTF-8 BOM, the header row
    and Espresso, Iced Tea, Café Latte in that order. Clear the search and download again: all 8 rows.
12. Editor toolbar on the menu table: sort, search, stripes and download buttons, all pressed. Each one toggles the
    same switch in the "Visitor tools" panel.
13. Menu table: 5 rows and "Showing 5 of 8 rows"; "Show more" shows all 8. Search "a": matches highlighted. Sort Price
    twice: the address gets `?table1-search=a&table1-sort=price&table1-order=desc`; open that address in a new tab and
    the same view comes back.
14. Long table: scroll into it; the header row stays at the top, under the admin bar.
15. Phone width (390px): league, menu and long tables show as cards (values all start at the same point, also
    the right-aligned Points column). No header row; the sort icon above each table opens a menu of
    column names with up and down arrows. with column names; header cells are sort chips.
16. `/sort-tests/`: every check passes (42 of 42). `sort-cases.html` for en-US, en-GB, de-DE, tr-TR and ar-AE: every
    check passes.
17. Tools > Plugin Check, Table Block Sort, all categories: no errors.
