# WordPress.org rules and release steps

## Rules that shape the code

From https://wordpress.org/plugins/developers/ and the detailed guidelines:

- GPLv2 or later; readable code, no obfuscation, no minified-only files.
- No trialware, locked features or license checks (guideline 5).
- No external requests and no tracking (guideline 7). Whatever leaves the site is described in readme.txt.
- No links or credits on the public site (guideline 10).
- Admin notices only where they matter, only when there is something new, and dismissible (guideline 11).
- At most 5 tags in readme.txt, no competitor tags, no keyword stuffing (guideline 12).
- Use WordPress' own libraries (guideline 13).
- Bump the plugin header version, the version constant and `Stable tag` together (guideline 15).
- The slug must not start with another product's name (guideline 17). After approval neither name nor slug changes.

Code: WordPress Coding Standards, escape all output, check capability and nonce on every form handler, sanitize
every input, prefix every global name, the text domain on every string.

## First submission

1. Plugin Check with all categories, errors and warnings. Afterwards the Playground site often returns 500
   (Plugin Check's own object-cache.php drop-in); restart it.
2. Readme validator: https://wordpress.org/plugins/developers/readme-validator/ . Fill the visible box
   (`readme_visible`); the hidden `readme_contents` is overwritten on submit. 429 means wait, then retry once.
3. The owner uploads `dist/*.zip` at https://wordpress.org/plugins/developers/add/ .
4. After the approval email: `svn checkout https://plugins.svn.wordpress.org/table-block-sort ../table-block-sort-svn`.

## Every release

1. Bump the three versions, write the changelog, fix and verify in Playground, update `checklist.md`.
2. `bin/build-zip.sh`, Plugin Check, readme validator, slop check.
3. `bin/svn-stage.sh`: builds, copies to `trunk`, makes `tags/<version>`, copies images, prints `svn status`.
4. Show the owner the SVN message and file list and the git message and file list. Wait.
5. `svn commit --non-interactive --username orcnd -m "Release <version>"` in the SVN folder, then git commit and push.
6. Wait until https://api.wordpress.org/plugins/info/1.0/table-block-sort.json shows the version, download the published zip
   and compare it with `dist/`, look at the live page.
7. Fill the "Released" row in `checklist.md` and update `status.md`.

readme.txt is served from the tag named in `Stable tag`, so a text-only change must also go into that tag.

## Listing images (`.wordpress-org/`)

banner-772x250.png, banner-1544x500.png, icon-128x128.png, icon-256x256.png, screenshot-N.png with the captions under
`== Screenshots ==` in the same order. An odd last screenshot is shown full width, so put the most important one
last when the count is odd. Set `svn:mime-type image/png`. Screenshots come from a real WordPress; demo plugins and
demo data are named as such in the caption.
