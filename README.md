# oss-form-readiness

Check whether an open-source repository is ready for support-program forms, grants, and API credit applications.

`oss-form-readiness` reads public GitHub signals and turns them into a practical readiness report: score, checklist, repo summary, next steps, and draft application copy you can edit instead of starting from a blank form.

## Quick start

```bash
npx oss-form-readiness owner/repo
```

Examples:

```bash
npx oss-form-readiness openai/codex
npx oss-form-readiness https://github.com/openai/codex
```

## Markdown for application notes

Generate Markdown that can be pasted into `APPLICATION.md`, grant notes, or an internal review doc:

```bash
npx oss-form-readiness owner/repo --markdown > APPLICATION.md
```

The Markdown output includes:

- repository signals
- readiness checklist
- draft answer for why the repository fits
- draft API credit usage plan
- extra context paragraph
- concrete next steps before applying

## JSON output

Use `--json` when you want to script around the result:

```bash
npx oss-form-readiness owner/repo --json
```

## Offline demo mode

Use demo data for screenshots, local checks, or examples without calling GitHub:

```bash
npx oss-form-readiness owner/repo --no-network
npx oss-form-readiness owner/repo --no-network --markdown
```

## What it checks

The report currently looks at:

- public repository URL
- recent maintenance activity
- recent commits
- contributor count
- public releases
- visible ecosystem signals such as stars, forks, and contributors
- clear GitHub repository description

This is intentionally simple. It is not a judging system or a guarantee that any application will be accepted. It is a fast preflight checklist for maintainers who want their public evidence and application draft to be in better shape.

## GitHub rate limits

The CLI uses public GitHub API endpoints. For higher rate limits, set a token:

```bash
export GITHUB_TOKEN=github_pat_xxx
npx oss-form-readiness owner/repo
```

The token is only sent to `api.github.com`.

## Local development

```bash
git clone https://github.com/jadeonstudio/grant-ready.git
cd grant-ready
npm run check
node ./bin/oss-form-readiness.js owner/repo
```

Useful local commands:

```bash
node ./bin/oss-form-readiness.js owner/repo --markdown
node ./bin/oss-form-readiness.js owner/repo --json
node ./bin/oss-form-readiness.js owner/repo --no-network
```

## Why this exists

Maintainers often need to explain project impact, maintenance activity, release workflow, and credit usage plans in a very small text box. This tool turns public repo signals into a quick first draft so maintainers can spend more time improving the project and less time starting from scratch.

## Roadmap

- README and release-readiness checks
- GitHub Sponsors and grant-form templates
- Maintainer role prompts
- Optional AI-assisted rewrite mode

## License

MIT
