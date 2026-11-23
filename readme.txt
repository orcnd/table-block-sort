=== Table Block Sort ===
Contributors: orcnd
Tags: table, sortable, table search, csv export, table block
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sorting, search, CSV download, phone cards, sticky header and more for the core Table block. Turn them on in the block toolbar or sidebar.

== Description ==

WordPress has a Table block, but visitors cannot sort, search or download it. The usual answer is a separate table plugin with its own editor and its own way of storing tables. Table Block Sort keeps the Table block you already use and adds switches to it.

Select a table. Its toolbar gets four buttons next to "Edit table": sort (two arrows), search (magnifying glass), striped rows (three bands) and download (arrow into a tray). Each stays highlighted while it is on. A "More table tools" menu after them holds phone cards, sticky header, "Show more" and the share button. The block sidebar gets a "Visitor tools" panel with all of them.

* **Sortable columns:** on the page, each header cell becomes a button. The first click sorts the column from low to high, the next click from high to low.
* **Search box:** a search field at the left above the table. It is WordPress' own Search block field, so it looks like every other search field in your theme. The matching text is highlighted in the browser's own highlight color. While visitors type, rows that do not match are hidden and the number of matching rows is shown. Upper and lower case and accents are ignored, so "cafe" finds "Café".
* **Striped rows:** every other row gets a shaded background. This is the Table block's own "Stripes" style, so the switch and the Styles panel always agree. The stripes stay correct after sorting and searching, and their shade is mixed from the theme's text color, so they also work on dark themes.
* **Download button:** a download icon at the right above the table (its label, "Download CSV", shows on hover and is read by screen readers). It uses the theme's text color. Visitors get the table as they see it: in their sort order and only the rows that match their search. The file opens in Excel, Numbers, LibreOffice and Google Sheets with accents intact, and is named after the table caption.
* **Cards on phones:** on screens narrower than 600 pixels each row becomes a card, with the column name next to each value. No more sideways scrolling. Sorting moves to a sort icon above the table: it opens a short menu with each column name and an up and a down arrow.
* **Sticky header:** the header row stays in view while visitors scroll down a long table, below the admin bar when it shows. It takes the theme's background color.
* **Show more button:** only the first rows show (you pick how many, 3 to 100), with a "Show more" button and "Showing 10 of 40 rows" under the table. Search, sorting and the download still use every row.
* **Share button:** a share icon next to the download icon. The sort and the search are kept in the page address (for example `?table1-sort=price&table1-order=desc`); the icon opens the share sheet on phones and copies that link elsewhere ("Link copied"). Opening the link shows the table the same way.

**How columns are sorted**

Each column is checked as a whole. When more than half of its cells are dates, it sorts by date; when more than half are numbers, by number; otherwise as text.

* Prices and numbers in the usual shapes: "$50", "$1,200.00", "US$ 100", "15 USD", "AED 1,200", "9,99 €", "50,- €", "1 299 kr", "-$20", "($40)", "12%", "$1.2M", "$800K", "2,5 Mio.", "12 kg", "~$40", "2+". A range such as "$50-$100" sorts by its first number. Arabic digits are read too.
* The decimal sign is worked out for the column: "€9,99" is 9.99 even on an English page, and "1.234,5" is 1234.5. Only when the cells do not show it, the site language decides.
* Dates: "2026-03-14", "2026-03-14T09:30", "14.03.2026", "3/14/2026", "14 March 2026", "Mar 3, 2026", "March 2nd, 2026", "Sat, 14 Feb 2026", "December 2025", with or without a time ("9:05 PM"), and times alone. Month names work in English and in the site language ("14. März 2026", "14 Mart 2026").
* For dates like 03/04/2026 the column decides: if any cell has a first number above 12, the column is day first; a second number above 12 means month first. Only when no cell tells, the site language decides.
* Everything else as text, in the site language's alphabetical order, with "Item 2" before "Item 10".
* In a number or date column, cells that are neither ("Free", "Contact us") come right after the values, A to Z. Empty cells and placeholders ("-", "N/A", "TBD") always go last. Rows with the same value keep their original order.

**Accessible**

The sort buttons work with the keyboard (Tab, then Enter or Space). The sorted column is announced to screen readers with `aria-sort`, following the WAI-ARIA sortable table pattern. The search field and the download icon have text labels for screen readers, and the number of matching rows is announced as it changes. The arrow follows the theme's text color and stays visible in Windows high-contrast mode.

**What it does not do**

* No column filters or numbered pages ("Show more" only). No Excel or PDF export, only CSV.
* A sticky header turns off the sideways scrolling core gives wide tables, because the two do not work together. Turn on cards on phones for wide tables.
* Tables without a header row cannot be sorted: the header cells are the buttons. The sort button tells you to turn on "Header section" first. Search works without a header row.
* Tables with merged cells are not sorted, and tables with cells that span several rows are not searched, because moving or hiding their rows would break them.
* Only the body rows move or hide. The footer row stays at the bottom, and its totals are not recalculated for a search. For the same reason the download leaves the footer out while a search is active.

**Light.** One readable JavaScript file (about 37 KB, 11 KB compressed) and a 10 KB stylesheet, loaded only on pages that have a table using one of these tools. Without JavaScript the table shows as a normal table and the search field and download button stay hidden. The CSV file is made in the visitor's browser; nothing is sent to your server or anywhere else. No jQuery, no external requests, no tracking, no settings stored in the database. The setting is saved in the block itself, so deactivating the plugin leaves your tables as normal tables.

== Installation ==

1. Install and activate Table Block Sort from the Plugins screen.
2. Edit a post or page with a Table block and make sure "Header section" is on in the block's Settings.
3. Click the sort, search, stripes or download button in the table's toolbar, or use the "Visitor tools" panel in the block sidebar, and update the post.

== Frequently Asked Questions ==

= Does it work with tables I made before installing it? =

Yes. Open the post, select the table and turn on what you need in its toolbar or sidebar. Nothing changes on any table until you do.

= Can the table be sorted by a column when the page loads? =

Not in this version. The table shows in the order you entered it until a visitor clicks a header.

= What happens when I deactivate the plugin? =

The tables stay as they are and are no longer sortable or searchable. Striped rows stay, because they are a core style. Your table content is never changed.

= Can someone put a formula into a cell and attack people who open the CSV? =

No. Cells that a spreadsheet would run as a formula (starting with "=", "+", "@", or "-" followed by text) get an apostrophe in front, so they open as plain text. Negative numbers such as "-12" are kept as numbers.

= What does the search look at? =

The text of every cell in the body rows. Header and footer rows are always shown.

= Which browsers show the search highlight? =

Browsers with the CSS Custom Highlight API: current Chrome, Edge, Safari and Firefox. Older browsers still search; they just do not mark the matching text.

= Does it work in the site editor and in templates? =

Yes. It works on any core Table block that WordPress renders on the front end.

== Screenshots ==

1. A table with search, highlighted matches, sorting by price, the download and share icons and "Show more".
2. In the editor: the sort, search, stripes and download buttons next to "Edit table", and the "Visitor tools" panel.
3. The "More table tools" menu: cards on phones, sticky header, "Show more" button and share button.
4. On a phone: rows become cards, and sorting moves to a menu of column names with up and down arrows.
5. A long table with a sticky header row.

== Changelog ==

= 0.1.0 =
* First release: sortable columns (number, date and text), search box with highlighted matches, striped rows switch, CSV download of the visible rows, cards on phones, sticky header, "Show more" button, shareable links, toolbar buttons and a "Visitor tools" sidebar panel, keyboard and screen reader support.
