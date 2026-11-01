# Copilot Instructions: create-yourname

## Project overview
This repository is an npm package: a CLI scaffolder (`npx create-yourname`) that
generates production-ready Express backends with authentication.

There are two separate codebases in this repo. Always check which one you are working in:

1. **The CLI** (`src/`, `scripts/`, `tests/`): written in TypeScript, runs on the
   user's machine, and generates projects.
2. **The templates** (`templates/`): the files that get copied into generated projects.
   These are TypeScript, are NOT compiled or linted as part of this repo's build,
   and JavaScript versions are generated from them by `scripts/build-js-templates.ts`.

## Tech stack
- CLI: TypeScript (strict), ESM, Node 20+, commander, @clack/prompts, fs-extra, execa,
  zod, tsup (build), vitest (tests).
- Generated projects: Express, TypeScript, MongoDB + Mongoose, Zod, Pino, Helmet, CORS,
  express-rate-limit, bcryptjs, jsonwebtoken, Vitest + Supertest.

## Package rules
- Never write version numbers when installing or listing dependencies. Use plain
  `npm install <package>` so the latest version is used.
- In `layer.json`, dependencies are package names only, never versions.
- Do not add a new dependency if the Node.js standard library can do the job.

## Code style (applies everywhere)
- TypeScript strict mode, no `any` (use `unknown` and narrow it).
- ESM only. Use named exports; avoid default exports except where a framework requires them.
- Relative imports must end with `.js` (NodeNext module resolution), also inside templates.
- Prefer small files with one responsibility. Prefer functions and plain objects over classes.
- No dependency injection frameworks, no generic `BaseRepository`, no over-engineering.
- Use async/await, never `.then()` chains.
- Add short comments only where the logic is non-obvious (security logic, regex, rotation logic).
- Handle errors explicitly; never swallow errors silently.

## CLI rules (src/, scripts/)
- All user-facing output goes through `src/utils/logger.ts`, not raw `console.log`.
- Handle Ctrl+C in every prompt (`isCancel`) and exit cleanly.
- If generation fails halfway, delete the partially created project folder.
- Never overwrite an existing non-empty target directory.
- Resolve the templates folder with `import.meta.url`, never with `process.cwd()`.
- Every function in `src/generator/` must be unit tested with temporary directories.

## Template architecture (templates/)
- A "layer" is a folder with `files/` (copied as-is) and `layer.json` (metadata).
- `layer.json` fields: `dependencies`, `devDependencies`, `scripts`, `env`, `inject`, `requires`.
- Files that several layers touch contain slot markers like `// @slot:NAME`.
  Layers add code through `inject` in `layer.json`. Do not duplicate whole files across layers.
- Store dotfiles with an underscore prefix (`_gitignore`, `_npmrc`) because npm strips
  dotfiles when publishing. The generator renames them.
- A generated project must contain only what the user selected: no unused files,
  imports, or dependencies.

## Generated project architecture
Request flow: `routes → controllers → services → repositories → models`

- **routes**: URL paths, validation and auth middleware wiring only.
- **controllers**: thin. Read the request, call a service, send the response. No business logic.
- **services**: business logic. Must NOT import Mongoose or touch the database directly.
- **repositories**: all database access. Plain exported objects. Always return plain
  objects (use `lean()` + `toPlain`), never Mongoose documents. IDs are returned as
  a string field named `id`.
- **models**: Mongoose schemas only.
- Related data is requested through an `include` option mapped to a whitelist inside
  the repository (never pass raw `populate` options from services).
- Use `asyncHandler` for async route handlers and throw `ApiError` for expected errors.
- Every route validates its input with a Zod schema through the `validate` middleware.
- Environment variables are validated with Zod at startup in `config/env.ts`;
  the app must exit immediately if they are invalid. Never read `process.env` anywhere else.
- Standard error response shape from the central error handler. No stack traces in production.
- API routes are mounted under `/api/v1`. A `/health` endpoint exists outside the API prefix.
- Implement graceful shutdown (SIGTERM, SIGINT) in `server.ts`.
- `app.ts` exports the Express app without starting it, so tests can import it.

## Security rules (non-negotiable)
- Hash passwords with bcryptjs using bcrypt's password-hashing algorithm and an appropriate work factor. Never use MD5, SHA-1, or plain SHA for passwords.
- Never store raw refresh tokens. Store only a SHA-256 hash.
- Refresh tokens are opaque random strings sent only in an httpOnly cookie
  (`secure` in production, `sameSite` set, path restricted), never in the response body.
- Access tokens are short-lived and contain only `id` and `role`.
- Refresh token rotation with reuse detection: reusing an already-rotated token must
  revoke the entire token family.
- Login errors must be identical for "unknown email" and "wrong password".
  Do a dummy bcrypt password comparison when the user does not exist to keep timing similar.
- Never log passwords, tokens, cookies, or secrets.
- Apply a strict rate limiter to register, login and refresh routes.
- Never build database queries by concatenating user input; validate input types with Zod first.
- Secrets in `.env` are generated randomly by the CLI; `.env` is always in `.gitignore`.
- Do not claim the generated app is "fully secure" in comments or docs. Describe what is
  configured and what the user must still do.

## Testing rules
- CLI tests: Vitest, using temp directories, no network calls.
- Generated-project tests: Vitest + Supertest + mongodb-memory-server, no external services needed.
- Auth tests must cover: register, duplicate email, login, wrong password, protected route
  with and without token, refresh rotation, refresh reuse detection, logout, role authorization.
- Before a feature is considered done, it must pass `scripts/verify-matrix.ts`
  (generate project, install, lint, build, test) for the affected option combinations.

## When generating code
- Make the smallest change that solves the task. Do not refactor unrelated files.
- If a task touches both the CLI and the templates, say so and list the files in each.
- If you are unsure about a library API, say so instead of guessing.
- After writing code, list the files created or changed and any new dependencies.