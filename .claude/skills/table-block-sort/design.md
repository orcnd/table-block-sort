# Design of Table Block Sort

## In the product

- Everything follows the theme: text color through `currentColor`, backgrounds through the theme's base preset, theme
  fonts inherited. No colors of its own except the browser's Mark highlight.
- The search field is core's Search block markup in every sense (`wp-block-search wp-block-search__no-button`), no
  visible label, placeholder "Search", at the left above the table.
- Download and share are icon-only buttons at the right, in the theme's text color, with text labels for screen
  readers.
- On phones (under 600 px) rows become cards with the column name next to each value. Sorting is one sort icon that
  opens a menu with only the column names and an up and a down arrow.
- Stripes are mixed from the text color (`color-mix`, 6%), so they work on dark themes.
- The sort arrow follows the text color and stays visible in forced-colors mode.
- Without JavaScript the tools bar stays hidden and the table is a normal table.
- In the editor: toolbar buttons show pressed while on; a disabled button says why.

## Listing art

A dark ground with the name and a small real-looking table (search "cake", highlights, sorted by price), slightly
tilted. The icon is a striped table with an orange sort arrow.

| Part | Value |
|---|---|
| Ink | `#1d2433` |
| Paper, line, stripe | `#f7f4ee`, `#d9d3c7`, `#ece6da` |
| Accent | `#e0662f` (the sorted column only) |
| Highlight | `#ffd84d` |

Drawn in `art/art.html`, rendered with `art/render.cjs`. Stays out: generated images, gradients, glows, stock
illustrations, emoji.

## Screenshots

1. Page view with search, highlights, sorting, icons and "Show more". 2. Editor toolbar and sidebar panel. 3. "More
table tools" menu. 4. Phone cards and the sort menu. 5. Sticky header. Taken on the Playground pages from
`verify/setup.php`.

## Readme text

Each feature says what visitors get, in one or two sentences, and what it does not do has its own list. readme.txt and
README.md change together.
