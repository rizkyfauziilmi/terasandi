<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Documentation and best practices

When you need information about a library or framework (API, configuration, migration, or best practice), resolve it in this order:

1. **Use the relevant available skill first** (for example `shadcn`, `drizzle`, `better-auth-*`, `gh`, `context7-mcp`). Load the skill and follow its rules before writing code.
2. **If no skill covers it, read the documentation already available locally** in `node_modules` (for Next.js: `node_modules/next/dist/docs/`; for other packages: their bundled docs, README, or type definitions). Prefer this for the version actually installed.
3. **If neither is available or sufficient, search the internet** (web search / official documentation) and prefer official sources. Mention the source and version you relied on when it affects the implementation.

Do not guess an API from memory when one of these sources is available.

## Commits

- **Never commit, create a pull request, or push unless the user explicitly asks for it.** Finishing work is not a request to commit. Leave changes uncommitted and report what changed instead; only run `git commit`, `gh pr create`, or `git push` after an explicit instruction.
- Follow Conventional Commits: `<type>(<optional scope>): <imperative summary>`, for example `feat(auth): add first-run admin onboarding`, `fix(proxy): redirect to setup when no users exist`, `docs: document agent rules`.
- Use types such as `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert`.
- Keep the subject lowercase, imperative, at most 72 characters, and without a trailing period. Explain **why** in the body (wrapped around 72 characters), not just what changed. Add a `BREAKING CHANGE:` footer when applicable.
- One logical change per commit. Stage only the files belonging to that change with explicit paths; never blindly use `git add -A` or `git commit -a`.
- Before committing, run the relevant checks (`pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`) and keep the tree free of secrets, `.env`, build output, and unrelated generated files.

## GitHub operations

- When asked for a pull request or any GitHub operation (issues, PRs, reviews, comments, releases), use the `gh` CLI if available (`command -v gh`). Do not hand-roll raw HTTP requests when `gh` can do the job; use `gh api` only as a fallback for data not exposed by typed commands.
- Run `gh auth status` first, use `--repo OWNER/REPO` when the current directory's repo is ambiguous, use `--json`/`--jq` for structured output, and pass an explicit `-L/--limit` to list and search commands to avoid silent truncation.
- Search for an existing issue or PR before creating a new one. Look for repository PR templates (`.github/PULL_REQUEST_TEMPLATE.md` or `pull_request_template.md`) and follow them.
- **Every PR must be complete and self-contained.** The body must include: a clear summary, motivation/context, what changed, how it was tested (commands and results), screenshots or recordings for UI changes, migration/breaking-change/rollout notes, linked issues, deploy or config requirements, and any remaining work or follow-ups. Never open an empty or placeholder PR.

## README scope

`README.md` is intentionally limited to: project title and description, overview, tech stack, prerequisites, quick start, environment variables, scripts, database and migrations, project structure, verification, and license. Do **not** add feature lists, roadmaps, or a dedicated authentication-flow section unless explicitly requested.

Change the README only when the facts it documents actually change (setup steps, commands, environment variables, stack, structure, or product description). Otherwise leave it untouched. Keep it in English and avoid speculative or aspirational claims.
