# Adobe Package Monitor

This project monitors Adobe ColdFusion package metadata published by Adobe for ColdFusion 2023 and ColdFusion 2025. It periodically fetches Adobe's `bundlesdependency.json` feeds, stores snapshots in a Cloudflare D1 database, detects changes between snapshots, and exposes a lightweight dashboard and JSON APIs for checking status and recent changes.

## Check it out in action

- [https://cfmodules.sqlbyjoseph.com/](https://cfmodules.sqlbyjoseph.com/)

## What the project does

- Polls Adobe's package dependency feeds for:
  - `cf2023`
  - `cf2025`
- Normalizes and validates each payload before storing it.
- Compares the newest snapshot to the previous one to identify added, removed, or updated bundle metadata.
- Stores:
  - snapshot history for each version
  - change records for each detected difference
  - check-run results and errors
- Keeps a rolling retention window for old data while preserving the earliest and newest snapshots, explicitly pinned timestamps, and snapshots for the 20 most recent detection events per version.
- Serves a browser dashboard and JSON endpoints for each monitored version.

## How it works

The Worker entrypoint is in `src/worker.js` and does two main jobs:

1. Scheduled execution
   - Runs every 2 hours using the cron trigger in `wrangler.toml`.
   - Calls `runCheck()` for each supported version.
   - Performs a nightly cleanup at midnight UTC.

2. HTTP handling
   - Serves the landing page and version dashboards.
   - Exposes status and change APIs.
   - Handles manual check execution and redirects for Adobe bundle endpoints.

The monitoring logic lives in `src/monitor.js`, while database reads and retention logic live in `src/database.js`.

## Supported versions

The project currently watches these Adobe versions:

- `cf2023` -> `https://cfmodules.adobe.com/cf2023/bundlesdependency.json`
- `cf2025` -> `https://cfmodules.adobe.com/cf2025/bundlesdependency.json`

These are defined in `src/config.js`.

## Project structure

- `src/worker.js` - Cloudflare Worker entrypoint and HTTP routes
- `src/monitor.js` - fetch + diff + snapshot persistence logic
- `src/database.js` - status, change history, and cleanup queries
- `src/config.js` - supported versions and limits
- `src/normalize.js` - normalization and comparison helpers
- `src/adobe.js` - Adobe fetch wrapper and validation
- `src/dashboard.js` - HTML dashboard renderer
- `src/landing.js` - landing page renderer
- `src/responses.js` - JSON response helper
- `migrations/0001_initial_schema.sql` - initial D1 schema
- `wrangler.toml` - Cloudflare Worker and D1 configuration

## Local setup

This repo is built for Cloudflare Workers and D1, so it is meant to run through Wrangler rather than a local Node server.

### Prerequisites

- Node.js and npm
- Cloudflare account
- Wrangler CLI installed:

```bash
npm install -g wrangler
wrangler login
```

### Create the database

Create a D1 database and then update the `database_id` in `wrangler.toml` if needed.

```bash
wrangler d1 create adobe-package-monitor-db
```

Then apply the schema:

```bash
wrangler d1 execute adobe-package-monitor-db --file migrations/0001_initial_schema.sql
```

### Configure environment values

The worker uses values from `wrangler.toml` and Cloudflare secrets.

Required runtime config:

- `CF2023_SNAPSHOT_TIMESTAMP`
- `CF2025_SNAPSHOT_TIMESTAMP`
- `APP_VERSION` for the release shown in the page footer
- `MANUAL_CHECK_TOKEN` as a secret

You can set the snapshot pin values in `wrangler.toml` under `[vars]`, and set the manual-check secret with:

```bash
wrangler secret put MANUAL_CHECK_TOKEN
```

Update `APP_VERSION` in `wrangler.toml` to the release tag (for example,
`v1.2.0`) before deploying a release. The footer links that tag to its GitHub
release page. When `APP_VERSION` is `unreleased`, the link points to the
repository's releases page.

### Automated GitHub releases

The `Release` GitHub Actions workflow runs when commits are pushed to `main`.
It uses Conventional Commit messages to determine whether to create a release:

- `fix: ...` creates a patch release.
- `feat: ...` creates a minor release.
- A commit with `BREAKING CHANGE:` in its footer creates a major release.

For squash merges, use a Conventional Commit pull request title so the squash
commit has the correct format. The workflow uses `GITHUB_TOKEN`; ensure the
repository allows Actions to have read and write access to contents under
Settings > Actions > General > Workflow permissions.

### Deploy

```bash
wrangler deploy
```

## Runtime behavior

### Scheduled checks

The worker runs every 2 hours through the cron trigger:

```toml
[triggers]
crons = ["*/60 * * * *"]
```

Each run:

- fetches Adobe JSON for each version
- stores a new snapshot if successful
- compares against the previous snapshot
- records the diff in `changes`
- updates `check_runs` with the status and error details

### Cleanup

The database cleanup runs at midnight UTC. It prunes stale snapshots and check-run rows while keeping:

- recent, earliest, latest, and explicitly pinned snapshots
- snapshots associated with the 20 most recent detection events per version
- all change-event records and their matching check runs
- check runs matching explicitly pinned snapshot timestamps

## API and routes

### Browser routes

- `GET /` - landing page with version links
- `GET /cf2023` - CF 2023 dashboard
- `GET /cf2025` - CF 2025 dashboard

### Bundle snapshot routes

- `GET /cf2023/bundlesdependency.json`
- `GET /cf2025/bundlesdependency.json`

These return the selected snapshot for that version. The response also sets an `X-Snapshot-Obtained-At` header when available.

### Short links

- `GET /go/cf2023_packages` -> Adobe CF2023 bundles dependency JSON
- `GET /go/cf2025_packages` -> Adobe CF2025 bundles dependency JSON

### JSON APIs

- `GET /api/status?version=cf2023` - latest stats for a version
- `GET /api/changes?version=cf2023&limit=25` - up to the 25 most recent detected changes
- `GET /api/checks?version=cf2023` - recent check-run history
- `GET /api/snapshot?version=cf2023&detected_at=<timestamp>` - the JSON snapshot for a detection event
- `POST /api/run-check` - manual run check endpoint, protected by `Authorization: Bearer <MANUAL_CHECK_TOKEN>`

Example:

```bash
curl -X POST "https://your-worker.example.com/api/run-check" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes on snapshot pinning

The worker includes snapshot timestamp variables for pinned versions:

- `CF2023_SNAPSHOT_TIMESTAMP`
- `CF2025_SNAPSHOT_TIMESTAMP`

These values determine which historical snapshot is served for the versioned `bundlesdependency.json` route when explicitly configured. If they are not set, the Worker selects the newest snapshot that does not have a recorded bundle removal.

## Operational considerations

- This is not a general package registry; it is a monitoring feed for Adobe ColdFusion dependencies.
- Because it uses Cloudflare D1, all persistence is tied to the Cloudflare Worker environment and database lifecycle.
- Fetch failures are recorded in `check_runs` with an error message, rather than silently disappearing.

## Deployment note

This project is configured for Cloudflare Workers Builds, and the Worker is expected to be deployed from the repository's `main` branch with the Cloudflare project settings already connected to the repo.

## License

This project is distributed under the repository license in the root of the project.