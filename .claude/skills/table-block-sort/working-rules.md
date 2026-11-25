# Working rules

## Ask the owner first, every time

An approval covers the one action it was given for.

- Fixing a bug: show file:line, the cause and the proposed fix, then wait.
- `git commit`: show the message and the file list, then wait.
- Pushing, submitting to WordPress.org, committing to the plugin's SVN repository. An SVN commit publishes to every
  site and stays in the history.
- Anything that sends data off the site: an external request, analytics, a new email.

Free to do: read the code, run the linters and the slop checker, build the zip, start Playground, stage SVN without
committing.

## Commits

The author is the git config user. No Co-Authored-By line and no other attribution line.

## Passwords

Never type, read or print one. WordPress.org uploads need the owner's login and are done by the owner. The SVN
password sits in the system keychain, and `svn commit --non-interactive` uses it without showing it.

## Where files go

| Place | Holds |
|---|---|
| GitHub | Everything tracked, with `.claude/` and `CLAUDE.md` (public, so nothing private in them) |
| SVN and the zip | Only what `bin/build-zip.sh` copies to `dist/`, and `.wordpress-org/` images in SVN `assets/` |
| Nowhere (gitignored) | `scratch/` one-off scripts, `docs/ai/` plans, `.claude/settings.local.json` |

`bin/svn-stage.sh` prepares the SVN folder and stops if an agent file would get in. It never commits.

## Text

Use a plain hyphen, never an em dash or en dash: code comments, commit messages, readme, UI strings, replies. Avoid
the phrases in `.claude/slop/rules.txt`; hooks check edits, commit messages and replies. Rewrite the sentence plainly
instead of swapping a synonym in. For a false positive put `slop-ok` on that line. Reply in the owner's language.

## Verification

On a running WordPress in Playground (`verify/README.md`), with the files that ship. Close a checklist item only with
evidence: the URL, what was visible, which check was clean. Say which items were not repeated. An empty result page
from a validator or a check is not a pass.

## Before the session ends

Update `status.md` next to this file: version, what is open, what comes next. The next session starts from it.
