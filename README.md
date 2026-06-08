# oss-form-readiness

A tiny CLI that helps open-source maintainers prepare support-program application drafts from public GitHub repository signals.

It is built for forms that ask questions like:

- Why is this repository important?
- What maintainer role do you have?
- How would API credits help the project?
- What public signals show active maintenance or ecosystem impact?

## Quick start

```bash
npx oss-form-readiness owner/repo
```

You can also run it from a GitHub URL:

```bash
npx oss-form-readiness https://github.com/owner/repo
```

## Example

```bash
oss-form-readiness openai/codex
```

Output includes:

- repository summary
- readiness score
- application checklist
- draft answer for "why this repository fits"
- draft answer for "how API credits will be used"
- concrete next steps before applying

## Local usage

```bash
git clone https://github.com/YOUR_NAME/oss-form-readiness.git
cd oss-form-readiness
npm start -- owner/repo
```

For screenshots or offline demos:

```bash
npm start -- owner/repo --no-network
```

JSON output:

```bash
npm start -- owner/repo --json
```

## GitHub rate limits

The CLI uses public GitHub API endpoints. For higher rate limits, set a token:

```bash
export GITHUB_TOKEN=github_pat_xxx
oss-form-readiness owner/repo
```

The token is only sent to `api.github.com`.

## Why this exists

Maintainers often need to explain project impact, maintenance activity, release workflow, and credit usage plans in a very small text box. This tool turns public repo signals into a quick first draft so maintainers can spend more time improving the project and less time starting from a blank form.

## Roadmap

- Better README quality checks
- GitHub Sponsors and grant-form templates
- Maintainer role prompts
- Markdown export
- Optional OpenAI-powered rewrite mode

## License

MIT
