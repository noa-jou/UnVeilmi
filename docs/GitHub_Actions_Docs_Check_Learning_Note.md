# What I Learned: GitHub Actions for Documentation Checks

## Goal

I wanted GitHub to automatically check my Markdown documentation whenever I push changes or open a pull request.

The idea was to use a GitHub Actions workflow to:

- check Markdown links, file paths, image paths, and heading anchors;
- lint Markdown formatting.

The workflow file was created at:

```text
.github/workflows/docs-check.yml
```

---

## Workflow

Create folder

```bash
mkdir -p .github/workflows
```
Create file:
```bash
cat > .github/workflows/docs-check.yml <<'EOF'
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

      - name: Lint Markdown
        uses: DavidAnson/markdownlint-cli2-action@v24
        with:
          globs: |
            README.md
            docs/**/*.md
EOF
```
Check the file exit:

```bash
cat .github/workflows/docs-check.yml
```

should return:

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

      - name: Lint Markdown
        uses: DavidAnson/markdownlint-cli2-action@v24
        with:
          globs: |
            README.md
            docs/**/*.md
```

The important part for heading links is:

```text
--include-fragments
```

This allows the link checker to also inspect links such as:

```text
Security_Model.md#5-validation-sql-safety-and-cors
```

instead of checking only whether the Markdown file itself exists.

---

## Git Commands I Used

After creating the workflow:

```bash
git add .github/workflows/docs-check.yml
git status
```

Then I committed it:

```bash
git commit -m "add automated documentation checks"
```

and pushed it:

```bash
git push
```

A new push triggered the GitHub Actions workflow automatically.

I could check the workflow from the terminal with:

```bash
gh run list
```

or:

```bash
gh run list --workflow docs-check.yml
```

To inspect a failed run:

```bash
gh run view <RUN_ID> --log-failed
```

---

## The Scary Part

GitHub showed:

```text
X  Docs Check
```

At first, I thought the workflow itself was broken.

It was not.

The link checker reported:

```text
Total:      80
Successful: 79
Errors:      1
```

The only failing link was:

```text
http://127.0.0.1:5500/
```

The error was:

```text
Connection refused
```

---

## Why It Failed

`127.0.0.1` means **the computer running the command**.

When I open:

```text
http://127.0.0.1:5500
```

on my Chromebook, it points to the local UnVeilmi frontend running on my Chromebook.

But GitHub Actions runs on a separate GitHub-hosted machine.

For that machine:

```text
127.0.0.1
```

means the GitHub runner itself, not my Chromebook.

Since UnVeilmi was not running on port `5500` inside that runner, the connection failed.

So the `X` did **not** mean that all my documentation links were broken.

It only meant that at least one workflow step returned an error, so GitHub marked the whole run as failed.

---

## Another Thing I Learned About `git push`

Running:

```bash
git push
```

again without creating a new commit produced:

```text
Everything up-to-date
```

This does not trigger a new workflow run.

The important sequence is:

```text
new commit
    ↓
git push
    ↓
GitHub receives the new commit
    ↓
GitHub Actions runs automatically
```

If there is no new commit, there is nothing new for GitHub to process.

---

## If I Want to Remove the Workflow

Because the workflow file is tracked by Git, the safest way to remove it is:

```bash
git rm .github/workflows/docs-check.yml
```

Then:

```bash
git commit -m "remove docs check workflow"
git push
```

This is safer than deleting the entire `.github/` directory because that directory may later contain other workflows, issue templates, or pull request templates.

---

## Main Lesson

The most important thing I learned is that a failed GitHub Actions run does not automatically mean the project is broken.

A red `X` means:

```text
At least one automated check did not pass.
```

The next step is to read the failed step and understand **why** it failed.

In this case, the workflow actually worked correctly: it checked my documentation and found one local-only URL that a GitHub-hosted runner could not access.

That was a useful result, not a broken system.
