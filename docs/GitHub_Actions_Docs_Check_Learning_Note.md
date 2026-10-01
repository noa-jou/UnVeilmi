# What I Learned: GitHub Actions for Documentation Checks

## Goal

I wanted GitHub to automatically check my Markdown documentation whenever I push changes or open a pull request.

At first, I tried to make the workflow do two things:

- check Markdown links, file paths, image paths, and heading anchors;
- lint Markdown formatting.

After testing it in the real repository, I learned that these two jobs were not equally useful for this project.

The link checker helped me find actual broken or unreachable links.

The Markdown linter, however, reported hundreds of style issues that did not mean the documentation was broken.

So I simplified the workflow and kept only the link checking that was useful to me.

The workflow file is:

```text
.github/workflows/docs-check.yml
```

---

## Final Workflow

Create the folder if it does not already exist:

```bash
mkdir -p .github/workflows
```

Create or edit:

```text
.github/workflows/docs-check.yml
```

The final workflow is:

```yaml
name: Docs Check

on:
  push:
  pull_request:

jobs:
  docs:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Check Markdown links
        uses: lycheeverse/lychee-action@v2
        with:
          args: --include-fragments --exclude-loopback --exclude '^https://github\.com/user-attachments/assets/' './**/*.md'
```

I can inspect the file with:

```bash
cat .github/workflows/docs-check.yml
```

---

## What the Important Options Mean

### `--include-fragments`

```text
--include-fragments
```

This allows Lychee to also check heading anchors.

For example:

```text
Security_Model.md#5-validation-sql-safety-and-cors
```

Without fragment checking, a tool might only confirm that `Security_Model.md` exists.

With `--include-fragments`, it can also check whether the linked heading anchor exists.

---

### `--exclude-loopback`

```text
--exclude-loopback
```

This excludes local addresses such as:

```text
http://127.0.0.1:5500
http://localhost:5500
```

This became necessary because my README includes the local UnVeilmi frontend address.

That address works on my Chromebook when the frontend is running.

However, GitHub Actions runs on a separate GitHub-hosted machine.

For that machine:

```text
127.0.0.1
```

means the GitHub runner itself, not my Chromebook.

So checking my local development URL from GitHub Actions would always fail unless the same service were running inside the runner.

---

### Excluding GitHub Video Attachment URLs

My README also contains a GitHub-hosted demo video:

```text
https://github.com/user-attachments/assets/...
```

That URL was useful for embedding the playable video in the README, but it also caused problems for the automated link check.

I therefore excluded GitHub attachment URLs with:

```text
--exclude '^https://github\.com/user-attachments/assets/'
```

The complete Lychee arguments became:

```yaml
args: --include-fragments --exclude-loopback --exclude '^https://github\.com/user-attachments/assets/' './**/*.md'
```

This means the workflow still checks normal documentation links while ignoring:

```text
local loopback URLs
GitHub user-attachment URLs
```

---

## Why I Removed Markdown Linting

Originally, I also used at the bottom part of the .yml:

```yaml
- name: Lint Markdown
  uses: DavidAnson/markdownlint-cli2-action@v24
  with:
    globs: |
      README.md
      docs/**/*.md
```

The linter worked, but it reported:

```text
Summary: 260 issues in 12 files
```

Many of those were formatting rules such as:

```text
MD013  line too long
MD060  table pipe spacing
MD012  multiple blank lines
MD024  duplicate headings
```

Some of those "problems" were intentional parts of my documentation.

For example, `Design_Decisions.md` deliberately repeats headings such as:

```text
Decision
Why
Trade-off
```

because every design decision follows the same structure.

The linter treated those repeated headings as errors even though the document was working exactly as intended.

I realized that my real goal was not:

```text
make every Markdown file follow a strict style guide
```

My real goal was:

```text
find broken links
find broken file paths
find broken image paths
find broken heading anchors
```

So I removed the Markdown linting step instead of rewriting many documents only to satisfy formatting rules.

This made the workflow much smaller and more useful.

---

## Git Commands I Used

After changing the workflow:

```bash
git add .github/workflows/docs-check.yml
git status
```

Then I committed it:

```bash
git commit -m "simplify documentation checks"
```

and pushed it:

```bash
git push
```

A new push triggers the GitHub Actions workflow automatically.

---

## Checking GitHub Actions from the Terminal

I can list recent workflow runs with:

```bash
gh run list --workflow docs-check.yml
```

For example, I saw:

| STATUS | TITLE | WORKFLOW | BRANCH | EVENT | ID | ELAPSED | AGE |
|---|---|---|---|---|---:|---:|---|
| * | simplify documentation checks | Docs Check | main | push | 3YYYZZZZXXX | 7s | less than a minute ago |
| X | link of video check fix | Docs Check | main | push | 3YYYZZZZXXY | 9s | about 13 minutes ago |
| X | Chinese readme | Docs Check | main | push | 36819787612 | 12s | about 22 minutes ago |
| X | add demo video | Docs Check | main | push | 3YYYZZZZXXZ | 1m0s | about 1 hour ago |
| X | add icon | Docs Check | main | push | 3ZYYZZZZXXX | 12s | about 2 hours ago |
| X | fix loopback check | Docs Check | main | push | 3YYYZYZZXXX | 10s | about 3 hours ago |
| X | add automated documentation checks | Docs Check | main | push | 3YYYYZZZXXX | 12s | about 22 hours ago |
| X | add automated documentation checks | Docs Check | main | push | 3YYYZZZZXX0 | 10s | about 22 hours ago |
| X | add automated documentation checks | Docs Check | main | push | 3YYYZZZZXX4 | 11s | about 22 hours ago |

The older red `X` entries are previous failed runs.

They do not mean the latest version is still broken.

The most important row is the newest run.

---

## Understanding the Status Symbols

While the newest run was still running, GitHub CLI showed:

```text
*
```

That meant the workflow had not finished yet.

A red:

```text
X
```

means that run failed.

After the newest run completed successfully, GitHub confirmed:

```text
Run Docs Check (...) has already completed with 'success'
```

So old failed runs can remain in the history while the current workflow is completely fine.

---

## Inspecting a Failed Run

To inspect only failed steps:

```bash
gh run view <RUN_ID> --log-failed
```

For example:

```bash
gh run view 3YYYZZZZXXX --log-failed
```

When I ran this for the newest workflow while there were no failed steps, it returned no failure log.

That was a good sign, but while the run was still in progress it was not yet enough to prove that the workflow had finished successfully.

---

## Watching a Run Until It Finishes

To wait for a specific run and see its final result:

```bash
gh run watch <RUN_ID>
```

For my final run:

```bash
gh run watch 3YYYZZZZXXX
```

GitHub CLI returned:

```text
Run Docs Check (3YYYZZZZXXX) has already completed with 'success'
```

That was the final confirmation that the simplified documentation check was working.

