import {
  SOURCES,
  MAX_CHANGES_PER_CHECK,
} from "./config.js";

import { normalize, compare } from "./normalize.js";
import { fetchAdobe } from "./adobe.js";

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function runCheck(env, version = "cf2023") {
  const sourceUrl = SOURCES[version];

  if (!sourceUrl) {
    throw new Error(`Unsupported ColdFusion version: ${version}`);
  }

  const startedAt = new Date().toISOString();

  const runResult = await env.DB.prepare(
    `INSERT INTO check_runs
       (version, started_at, status)
     VALUES (?, ?, 'running')`
  ).bind(version, startedAt).run();

  const runId = runResult.meta.last_row_id;

  try {
    const { body, data } = await fetchAdobe(sourceUrl);

    // Retrieve the previous snapshot for this version only.
    const previousRow = await env.DB.prepare(
      `SELECT raw_json
       FROM snapshots
       WHERE version = ?
       ORDER BY id DESC
       LIMIT 1`
    ).bind(version).first();

    const current = normalize(data);

    const previous = previousRow
      ? normalize(JSON.parse(previousRow.raw_json))
      : null;

    // The first successful check for each version establishes
    // its own independent baseline.
    const changes = previous
      ? compare(previous, current)
      : [];

    if (changes.length > MAX_CHANGES_PER_CHECK) {
      throw new Error(
        `Unusually large change set: ${changes.length} records`
      );
    }

    const finishedAt = new Date().toISOString();

    // Save the snapshot, changes, and successful check together.
    const statements = [
      env.DB.prepare(
        `INSERT INTO snapshots
           (version, checked_at, content_hash, raw_json)
         VALUES (?, ?, ?, ?)`
      ).bind(
        version,
        finishedAt,
        await sha256(body),
        body
      ),
    ];

    for (const c of changes) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO changes (
             version,
             detected_at,
             change_type,
             item_type,
             bundle,
             bundle_version,
             item_name,
             old_version,
             new_version,
             old_metadata,
             new_metadata,
             details
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          version,
          finishedAt,
          c.change_type,
          c.item_type,
          c.bundle,
          c.bundle_version,
          c.item_name,
          c.old_version,
          c.new_version,
          c.old_metadata,
          c.new_metadata,
          c.details
        )
      );
    }

    statements.push(
      env.DB.prepare(
        `UPDATE check_runs
         SET finished_at = ?,
             status = 'success',
             bundles_found = ?,
             changes_found = ?
         WHERE id = ?`
      ).bind(
        finishedAt,
        data.length,
        changes.length,
        runId
      )
    );

    // D1 batch operations run transactionally.
    await env.DB.batch(statements);

    console.log(JSON.stringify({
      event: "check_success",
      version,
      finished_at: finishedAt,
      bundles: data.length,
      changes: changes.length,
      baseline: !previous,
    }));

    return {
      success: true,
      version,
      finished_at: finishedAt,
      bundles: data.length,
      changes: changes.length,
      baseline: !previous,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE check_runs
       SET finished_at = ?,
           status = 'failed',
           error_message = ?
       WHERE id = ?`
    ).bind(
      finishedAt,
      String(error.message).slice(0, 2000),
      runId
    ).run();

    console.error(
      `Adobe monitor check failed for ${version}:`,
      error
    );

    throw error;
  }
}