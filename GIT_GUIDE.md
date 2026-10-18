# Git checkpoints for StashBox

## Codex and your own commits

Commits made by Codex use the author name `Codex`. Your own local Git identity stays `Punyam Chauhan`. Authentication to GitHub is separate from the name written into a commit: pushes still use your authorized GitHub account. Author labels do not prove who authenticated or imply a verified signature.

For a Codex-authored checkpoint, use per-command settings rather than changing your personal identity:

```powershell
git -c user.name=Codex -c user.email=noreply@openai.com commit -m "Describe the change"
```

Your own `git commit` commands continue to use your configured personal name and noreply email.

Run these commands inside the `stashbox` folder. Git tracks source files. It does not automatically save a checkpoint every time you edit a file.

## Save a change

```powershell
git status
git diff
git add app/stashbox.tsx app/stashbox.css
git diff --staged
git commit -m "Improve snack card layout"
git push
```

`status` tells you which files changed. `diff` shows unsaved-to-Git edits. `add` selects changes for the next checkpoint; this is called staging. `diff --staged` lets you review that checkpoint. `commit` records it locally. `push` copies local commits to the connected GitHub repository.

Stage the files you actually changed. `git add .` stages all non-ignored changes in the current folder; review them first.

## Read history

```powershell
git log --oneline --decorate -10
git show COMMIT_ID
```

Replace `COMMIT_ID` with an actual ID from your log.

## Undo a committed change safely

```powershell
git revert COMMIT_ID
git push
```

`revert` creates a new commit that reverses the selected commit. It preserves the history and is appropriate for changes already pushed to GitHub. If an editor opens, keep or edit the revert message, save and close it. A revert can require conflict resolution if later work changed the same lines.

## Unstage without losing edits

```powershell
git restore --staged app/stashbox.tsx
```

This removes the file from the planned checkpoint. Your edits remain in the file.

## Inspect an old version without changing the current app

```powershell
git show COMMIT_ID:app/stashbox.tsx
```

## Save an experiment on a branch

```powershell
git switch -c experiment/new-homepage
```

A branch gives your experiment a separate line of history. Commit your work before switching between branches.

## What is deliberately excluded

`.dev.vars`, `.env*`, `.sites-runtime/`, `.wrangler/`, `node_modules/`, screenshots, database files and build output are ignored. The maintainer setup key stays local. Git checkpoints do not back up your database, and reverting code does not undo database changes. Database schema changes need their own migrations and backups.

Never commit a password or access token. If one accidentally reaches a commit, deleting it in a later commit does not erase the old copy; revoke or rotate it.

Avoid `git reset --hard`, `git clean -fd` and force-pushing while learning: they can discard work or rewrite shared history. Prefer reviewing changes and using `git revert` for committed mistakes.
