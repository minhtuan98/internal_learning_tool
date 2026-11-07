# Learning Hub — unit tests and Quality Studio

The public dashboard is a separate static Vercel project. It publishes test names, assertions, version hashes and coverage, not the learning application or database. Local runner credentials and Claude authentication stay on the developer machine.

## Run

From `learning-hub`:

```sh
npm test                 # exits nonzero on failed assertions
npm run test:coverage    # V8 line, branch and function coverage
npm run qa:run           # real suite + JSON report + last 20 runs
npm run qa:serve -- --open
```

Keep the last process running. It opens a private connection URL in your browser. The fragment is removed from the address bar and stored in that tab's session storage. Use the private link on the same computer as the source code. Chrome may ask permission to access the local network. Other computers can read the published report, but need their own checkout and runner to execute tests.

The runner binds only to `127.0.0.1:4318`. Every API request requires a random 256-bit token; writes have fixed actions, no arbitrary command input. Allowed origins are loopback and the exact deployed dashboard origin from `.qa/deployment.json`. A link to the public dashboard grants no ability to control the developer's machine.

## Buttons

- **Chạy unit test:** the connected local runner executes the pinned Vitest binary, refreshes the live report, then deploys the static results to the separate Vercel project.
- **Sửa bằng Claude Code:** writes the selected failures to ignored `.qa/fix-request.md`, opens this workspace in VS Code and opens the installed `anthropic.claude-code` extension with a fix prompt. The prompt preserves unrelated edits and forbids deleting/skipping/weakening assertions. Claude authentication and normal IDE permissions still apply. A source hash check prevents sending failures from an older version.
- **Sinh test mới & chạy lại:** asks the authenticated local Claude CLI for structured new tests, validates filenames, adds files under `tests/generated/`, runs the full suite and publishes results. Maximum Claude generation spend is $2 per invocation. Test generation cannot modify application files or baseline tests through Claude tools; it uses no tools or MCP servers and passes source context through stdin.

`claude auth login` is needed for generation. Vercel CLI must also be logged in for publication. Failures are displayed explicitly; existing test results do not imply generation succeeded.

## Automatic behavior for Claude versions

Project `Stop` hooks are included for sessions opened either at the repo root or in `learning-hub`. Restart an existing Claude session once to load the settings. After Claude finishes a turn, the hook compares the source SHA256 with the last tested/generated version. Changed business logic is sent for test generation, then the full suite runs and the report publishes. UI-only changes are labeled and run the existing unit suite; unit tests do not replace visual/browser tests. Generated tests are never used to overwrite baseline regression tests.

The runner separately watches `src/` and `prisma/schema.prisma`, debounces changes and reruns existing tests. Generation waits for Claude's Stop event (or the explicit generate button), so intermediate edits do not create new tests or spend Claude usage on every keystroke. If the runner is stopped, the hook can still run generation/tests/publication directly. No automation runs while the computer is off, and it cannot observe Claude sessions on other machines unless this checkout and hook are present there.

To publish manually, `npm run qa:publish`. Configuration for this computer lives in ignored `.qa/deployment.json` with `{ "origin": "https://<dashboard-domain>.vercel.app" }`; Vercel linkage lives in `qa-dashboard/.vercel/`. Do not share `.qa/connection.json` or connection URLs.

The GitHub workflow runs the existing suite on pushes and pull requests and uploads reports even on failure. The workflow becomes active when these changes are pushed; it does not auto-generate tests or auto-deploy from untrusted pull requests. Local Claude hooks provide generation and publication without needing GitHub secrets.

## Coverage and source limits

Unit tests cover business logic in `src/lib`, server actions and the AI prompt, using mocked Prisma, cookies, Next navigation/cache and the Anthropic client. `db.ts` (runtime adapter), `brand.ts` (constants), and `shell.ts` (navigation presentation) are excluded from the business-logic coverage denominator. Test framework safeguards are tested separately under the `QA` group.

Figma Design System and Aurora AI were read on 2026-11-06. Notion is not connected yet; decision IDs refer to the README and source comments and have not been independently verified against the original PRD. The dashboard displays that limitation. Connecting Notion is needed to add any missing product acceptance rules.

The original regressions for cross-quiz answers, fractional answer indexes and spoofed YouTube hostnames are fixed and remain asserted. Additional system regressions cover assignment persistence, course ownership of lessons, dates and statuses, stable completion history, safe video URLs and question edits during active quizzes. Keep assertions intact; do not skip or convert failures to expected failures. Vitest exits nonzero; the reporting/publishing code preserves actual results.

Private state and raw coverage are ignored under `.qa/`. The generated public `qa-dashboard/report.json` is intentional. Source identity uses the contents of all `src` source text files (TypeScript, CSS, SVG and JSON), Prisma schema, package manifest and lockfile; Git HEAD is included only as a base revision because the working tree may contain uncommitted changes.

## Independent verification and local UI review

```sh
npm run test:integration  # separate temporary SQLite database; real Prisma and transactions
npm run test:proof        # intentionally break a temporary video parser; existing test MUST fail
npm run build
npm run preview:local    # 127.0.0.1:3001, .qa/review/preview.db (isolated persistent copy)
npm run test:browser     # Chrome: real sessions, roles, routes, responsive UI and quiz autosave
```

The preview helper uses `node:sqlite` backup (Node 22.16+), keeps an existing preview database, and binds only to loopback. Set `PREVIEW_PORT` to choose another port. It enables local quick sign-in only for that preview process. Browser QA requires installed Chrome; set `CHROME_PATH` for a non-default executable and `PREVIEW_ORIGIN` if the port differs. The browser runner only accepts a loopback origin and creates/removes its quiz fixtures in the preview database. It must target the server started by `preview:local`, never a primary-data server at that URL.

Integration tests mock the request identity and Next cache/headers boundary. They do **not** mock Prisma: foreign keys, queries, transactions, group access, shuffled answer indexes, scoring, expired-attempt handling, completion and certificate creation use an isolated real SQLite database. They do not test Google or Anthropic services.

`test:proof` mutates an isolated copy of the production video parser and requires the original spoofed-host regression to fail with exit code 1. The application source is never changed. This is a targeted sensitivity check, not a full mutation score.

Browser QA uses the real quick-login/session implementation with locked, unknown, admin and member accounts, visits admin/member routes at desktop and 390px widths, checks dashboard filters and theme persistence, and completes a quiz with delayed action requests. It verifies the final answer, score and certificate directly in the isolated SQLite database. Browser results and screenshots are saved under `.qa/review/`; they are separate from the unit-only dashboard, so that dashboard must not be interpreted as an end-to-end or visual result.

Original application data, unrelated worktrees and existing uncommitted QA tooling are retained. No deployment or report publication is performed by these commands.
