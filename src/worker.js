import { SOURCES } from "./config.js";
import { runCheck } from "./monitor.js";
import { dashboard } from "./dashboard.js";
import { landingPage } from "./landing.js";
import { responseJson } from "./responses.js";
import {
  status,
  recentChanges,
  recentChecks,
  cleanupOldData,
} from "./database.js";

export default {
  async scheduled(controller, env, ctx) {
    const versions = Object.keys(SOURCES);

    const scheduledAt = new Date(controller.scheduledTime);

    // The existing 30-minute trigger runs cleanup at midnight UTC.
    const shouldCleanUp =
      scheduledAt.getUTCHours() === 0 &&
      scheduledAt.getUTCMinutes() === 0;

    ctx.waitUntil(
      (async () => {
        // Complete both version checks before performing cleanup.
        const results = await Promise.allSettled(
          versions.map((version) => runCheck(env, version))
        );

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(
              `Scheduled monitor failed for ${versions[index]}:`,
              result.reason
            );
          }
        });

        if (shouldCleanUp) {
          try {
            await cleanupOldData(env, scheduledAt);
          } catch (error) {
            console.error("Scheduled database cleanup failed:", error);
          }
        }
      })()
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    // Short links for ColdFusion bundle JSON endpoints.
    const redirects = {
      "/go/cf2023_packages": "/cf2023/bundlesdependency.json",
      "/go/cf2025_packages": "/cf2025/bundlesdependency.json",
    };

    if (redirects[url.pathname]) {
      return Response.redirect(
        new URL(redirects[url.pathname], url.origin).toString(),
        302
      );
    }
    
    try {
      // Manually run a monitor check.
      // Requires a secret configured in Cloudflare.
      if (url.pathname === "/api/run-check") {
        if (request.method !== "POST") {
          return responseJson({ error: "Use POST for this endpoint" }, 405);
        }

        const authorization = request.headers.get("Authorization");

        if (
          !env.MANUAL_CHECK_TOKEN ||
          authorization !== `Bearer ${env.MANUAL_CHECK_TOKEN}`
        ) {
          return responseJson({ error: "Unauthorized" }, 401);
        }

        try {
          await runCheck(env);
          return responseJson({
            success: true,
            message: "Monitor check completed successfully.",
          });
        } catch (error) {
          console.error("Manual monitor check failed:", error);

          return responseJson({
            success: false,
            error: "Monitor check failed",
            message: error.message,
          }, 500);
        }
      }

      if (request.method !== "GET") {
        return responseJson({ error: "Method not allowed" }, 405);
      }

      if (url.pathname === "/") {
        return new Response(landingPage(), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      if (
        url.pathname === "/cf2023" ||
        url.pathname === "/cf2023/" ||
        url.pathname === "/cf2025" ||
        url.pathname === "/cf2025/"
      ) {
        return new Response(dashboard(), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      const version = url.searchParams.get("version") || "cf2023";

      if (!SOURCES[version]) {
        return responseJson(
          { error: "Unsupported ColdFusion version" },
          400
        );
      }

      if (url.pathname === "/api/status") {
        return responseJson(await status(env, version));
      }

      if (url.pathname === "/api/changes") {
        return responseJson(await recentChanges(env, url, version));
      }

      if (url.pathname === "/api/checks") {
        return responseJson(await recentChecks(env, version));
      }

      const bundleJsonMatch = url.pathname.match(
        /^\/(cf2023|cf2025)\/bundlesdependency\.json$/
      );

      if (bundleJsonMatch) {
        const version = bundleJsonMatch[1];

        const timestampVariable =
          version === "cf2023"
            ? "CF2023_SNAPSHOT_TIMESTAMP"
            : "CF2025_SNAPSHOT_TIMESTAMP";

        const configuredTimestamp = env[timestampVariable]?.trim();

        let selectedSnapshot = null;

        // OPTION 1: An explicitly configured timestamp takes precedence.
        if (configuredTimestamp) {
          selectedSnapshot = await env.DB.prepare(
            `SELECT id, checked_at, raw_json
            FROM snapshots
            WHERE version = ?
              AND checked_at = ?
            ORDER BY id DESC
            LIMIT 1`
          ).bind(version, configuredTimestamp).first();

          if (!selectedSnapshot) {
            return new Response(
              `No snapshot found for ${version} at ${configuredTimestamp}.`,
              {
                status: 404,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Cache-Control": "no-store",
                },
              }
            );
          }
        } else {
          // AUTOMATIC MODE: Find snapshots with no recorded bundle removals.
          const result = await env.DB.prepare(
            `SELECT s.id, s.checked_at, s.raw_json
            FROM snapshots s
            WHERE s.version = ?
              AND NOT EXISTS (
                SELECT 1
                FROM changes c
                WHERE c.version = s.version
                  AND c.detected_at = s.checked_at
                  AND c.item_type = 'bundle'
                  AND c.change_type = 'removed'
              )
            ORDER BY s.id DESC`
          ).bind(version).all();

          const snapshots = result.results;

          function compareVersions(a, b) {
            const partsA = a.split(".").map(Number);
            const partsB = b.split(".").map(Number);
            const length = Math.max(partsA.length, partsB.length);

            for (let i = 0; i < length; i++) {
              const partA = partsA[i] ?? 0;
              const partB = partsB[i] ?? 0;

              if (partA > partB) return 1;
              if (partA < partB) return -1;
            }

            return 0;
          }

          function highestBundleVersion(rawJson) {
            const data = JSON.parse(rawJson);
            let highest = null;

            for (const item of data) {
              if (
                !item ||
                typeof item.bundle !== "string" ||
                typeof item.version !== "string" ||
                !/^\d+(?:\.\d+)*$/.test(item.version)
              ) {
                continue;
              }

              if (
                highest === null ||
                compareVersions(item.version, highest) > 0
              ) {
                highest = item.version;
              }
            }

            return highest;
          }

          let selectedVersion = null;

          // Snapshots are newest first. Equal versions retain the newest snapshot.
          for (const snapshot of snapshots) {
            const highest = highestBundleVersion(snapshot.raw_json);

            if (
              highest !== null &&
              (
                selectedVersion === null ||
                compareVersions(highest, selectedVersion) > 0
              )
            ) {
              selectedSnapshot = snapshot;
              selectedVersion = highest;
            }
          }

          // Fall back to the initial snapshot if no eligible snapshot qualifies.
          if (!selectedSnapshot) {
            selectedSnapshot = await env.DB.prepare(
              `SELECT id, checked_at, raw_json
              FROM snapshots
              WHERE version = ?
              ORDER BY id ASC
              LIMIT 1`
            ).bind(version).first();
          }
        }

        if (!selectedSnapshot) {
          return new Response(
            `No snapshot has been captured for ${version} yet.`,
            {
              status: 404,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-store",
              },
            }
          );
        }

        return new Response(selectedSnapshot.raw_json, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Snapshot-Obtained-At": selectedSnapshot.checked_at,
          },
        });
      }

      return responseJson({ error: "Not found" }, 404);
    } catch (error) {
      console.error(error);

      return responseJson({
        error: "Internal server error",
        message: error.message,
      }, 500);
    }
  },
};