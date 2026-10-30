import { SOURCES } from "./config.js";

export async function status(env, version = "cf2023") {
  const sourceUrl = SOURCES[version];

  if (!sourceUrl) {
    throw new Error(`Unsupported ColdFusion version: ${version}`);
  }

  const latest = await env.DB.prepare(
    `SELECT checked_at, raw_json
     FROM snapshots
     WHERE version = ?
     ORDER BY id DESC
     LIMIT 1`
  ).bind(version).first();

  const initial = await env.DB.prepare(
    `SELECT checked_at
     FROM snapshots
     WHERE version = ?
     ORDER BY id ASC
     LIMIT 1`
  ).bind(version).first();

  const counts = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)
         AS successful,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)
         AS failed
     FROM check_runs
     WHERE version = ?`
  ).bind(version).first();

  let highestBundleVersion = null;

  if (latest?.raw_json) {
    try {
      const data = JSON.parse(latest.raw_json);

      // Adobe's source is expected to contain an array of bundle records.
      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.bundles)
          ? data.bundles
          : [];

      // Compare numeric version components rather than text.
      function compareVersions(a, b) {
        const partsA = a.split(".").map(Number);
        const partsB = b.split(".").map(Number);
        const length = Math.max(partsA.length, partsB.length);

        for (let i = 0; i < length; i++) {
          const numA = partsA[i] ?? 0;
          const numB = partsB[i] ?? 0;

          if (numA > numB) return 1;
          if (numA < numB) return -1;
        }

        return 0;
      }

      for (const item of records) {
        if (
          typeof item?.bundle !== "string" ||
          typeof item?.version !== "string" ||
          !/^\d+(?:\.\d+)*$/.test(item.version)
        ) {
          continue;
        }

        if (
          highestBundleVersion === null ||
          compareVersions(item.version, highestBundleVersion) > 0
        ) {
          highestBundleVersion = item.version;
        }
      }
    } catch (error) {
      console.error(
        `Unable to determine highest bundle version for ${version}:`,
        error
      );
    }
  }

  return {
    version,
    source: sourceUrl,
    last_successful_check: latest?.checked_at ?? null,
    initial_load_at: initial?.checked_at ?? null,
    highest_bundle_version: highestBundleVersion,
    total_checks: counts?.total ?? 0,
    successful_checks: counts?.successful ?? 0,
    failed_checks: counts?.failed ?? 0,
  };
}

export async function recentChanges(
  env,
  url,
  version = "cf2023"
) {
  const limit = Math.min(
    500,
    Math.max(1, Number(url.searchParams.get("limit")) || 100)
  );

  const result = await env.DB.prepare(`
    SELECT *
    FROM changes
    WHERE version = ?
      AND detected_at IN (
        SELECT detected_at
        FROM changes
        WHERE version = ?
        GROUP BY detected_at
        ORDER BY MAX(id) DESC
        LIMIT ?
      )
    ORDER BY id DESC
  `)
    .bind(version, version, limit)
    .all();

  return result.results;
}

export async function recentChecks(
  env,
  version = "cf2023"
) {
  const result = await env.DB.prepare(
    `SELECT *
     FROM check_runs
     WHERE version = ?
     ORDER BY id DESC
     LIMIT 25`
  ).bind(version).all();

  return result.results;
}

export async function cleanupOldData(env, now = new Date()) {
  const retentionDays = 7;
  const cutoff = new Date(
    now.getTime() - retentionDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const pinnedCf2023 =
    env.CF2023_SNAPSHOT_TIMESTAMP?.trim() || null;

  const pinnedCf2025 =
    env.CF2025_SNAPSHOT_TIMESTAMP?.trim() || null;

  // Preserve snapshots that are recent, initial, latest,
  // or explicitly pinned by a Worker environment variable.
  const protectedSnapshot = `
    s.checked_at >= ?
    OR s.id = (
      SELECT MIN(s0.id)
      FROM snapshots s0
      WHERE s0.version = s.version
    )
    OR s.id = (
      SELECT MAX(s1.id)
      FROM snapshots s1
      WHERE s1.version = s.version
    )
    OR (
      s.version = 'cf2023'
      AND ? IS NOT NULL
      AND s.checked_at = ?
    )
    OR (
      s.version = 'cf2025'
      AND ? IS NOT NULL
      AND s.checked_at = ?
    )
  `;

  // Delete change records associated with snapshots that will
  // not be retained. This preserves removal history for every
  // snapshot that remains available.
  const changesResult = await env.DB.prepare(
    `DELETE FROM changes
     WHERE NOT EXISTS (
       SELECT 1
       FROM snapshots s
       WHERE s.version = changes.version
         AND s.checked_at = changes.detected_at
         AND (${protectedSnapshot})
     )`
  ).bind(
    cutoff,
    pinnedCf2023,
    pinnedCf2023,
    pinnedCf2025,
    pinnedCf2025
  ).run();

  // Delete old snapshots except the initial, latest, recent,
  // and timestamp-pinned snapshots.
  const snapshotsResult = await env.DB.prepare(
    `DELETE FROM snapshots AS s
     WHERE NOT (${protectedSnapshot})`
  ).bind(
    cutoff,
    pinnedCf2023,
    pinnedCf2023,
    pinnedCf2025,
    pinnedCf2025
  ).run();

  // Keep only the last seven days of check-run history.
  const checksResult = await env.DB.prepare(
    `DELETE FROM check_runs
     WHERE started_at < ?`
  ).bind(cutoff).run();

  const summary = {
    event: "database_cleanup",
    completed_at: now.toISOString(),
    retention_days: retentionDays,
    cutoff,
    changes_deleted: changesResult.meta.changes,
    snapshots_deleted: snapshotsResult.meta.changes,
    check_runs_deleted: checksResult.meta.changes,
  };

  console.log(JSON.stringify(summary));

  return summary;
}