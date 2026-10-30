export function landingPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Adobe ColdFusion bundle dependency monitoring and snapshot history.">
  <title>Adobe ColdFusion Bundle Monitor</title>

  <style>
    :root {
      color-scheme: light dark;
      font-family: system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
    }

    body {
      max-width: 960px;
      margin: 0 auto;
      padding: 36px 20px;
      line-height: 1.6;
    }

    h1 {
      line-height: 1.2;
      margin-bottom: 12px;
    }

    .intro {
      font-size: 1.05rem;
      opacity: 0.85;
      margin-bottom: 32px;
    }

    .version-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .card {
      border: 1px solid #8886;
      border-radius: 12px;
      padding: 22px;
    }

    .card h2 {
      margin-top: 0;
    }

    .links {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      margin: 18px 0;
    }

    a {
      color: #4b9bff;
    }

    .button {
      display: inline-block;
      padding: 9px 14px;
      border: 1px solid #8888;
      border-radius: 7px;
      text-decoration: none;
    }

    .button.primary {
      background: #1769aa;
      border-color: #1769aa;
      color: white;
    }

    .snapshot {
      border-top: 1px solid #8886;
      padding-top: 14px;
      margin-top: 18px;
    }

    .snapshot time {
      overflow-wrap: anywhere;
    }

    .muted {
      opacity: 0.7;
      font-size: 0.9rem;
    }

    footer {
      border-top: 1px solid #8886;
      margin-top: 36px;
      padding-top: 16px;
      font-size: 0.9rem;
      opacity: 0.75;
    }
  </style>
</head>

<body>
  <header>
    <h1>Adobe ColdFusion Bundle Monitor</h1>

    <p class="intro">
      This system monitors Adobe ColdFusion bundle dependencies for
      ColdFusion 2023 and 2025. It periodically captures Adobe's
      published dependency data and tracks changes to bundles,
      versions, and dependency metadata over time.
    </p>
  </header>

  <main>
    <div class="version-grid">
      <section class="card">
        <h2>ColdFusion 2023</h2>

        <p>
          View monitoring status, detected changes, and recent
          check history for ColdFusion 2023.
        </p>

        <div class="links">
          <a class="button primary" href="/cf2023">
            Open CF2023 Monitor
          </a>
        </div>

        <div class="snapshot">
          <div>bundlesdependency.json obtained from Adobe
          <time id="cf2023-time">Loading timestamp...</time>
          </div>
          <p>
            Highest bundle version:
            <span id="cf2023-version">Loading...</span>
          </p>

          <div class="links">
            <a
              class="button"
              href="/cf2023/bundlesdependency.json"
              target="_blank"
              rel="noopener"
            >
              bundlesdependency.json
            </a>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>ColdFusion 2025</h2>

        <p>
          View monitoring status, detected changes, and recent
          check history for ColdFusion 2025.
        </p>

        <div class="links">
          <a class="button primary" href="/cf2025">
            Open CF2025 Monitor
          </a>
        </div>

        <div class="snapshot">
          <div>bundlesdependency.json obtained from Adobe
          <time id="cf2025-time">Loading timestamp...</time>
          </div>
          <p>
            Highest bundle version:
            <span id="cf2025-version">Loading...</span>
          </p>

          <div class="links">
            <a
              class="button"
              href="/cf2025/bundlesdependency.json"
              target="_blank"
              rel="noopener"
            >
              bundlesdependency.json
            </a>
          </div>
        </div>
      </section>
    </div>
  </main>

  <footer>
    Timestamps are displayed in your browser's local time.
    Timestamps automatically refresh every 60 seconds.
  </footer>
  <script>
  async function loadSnapshotTime(version) {
    const timeElement = document.getElementById(version + "-time");
    const versionElement = document.getElementById(version + "-version");

    try {
      const response = await fetch(
        "/" + version + "/bundlesdependency.json",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const obtainedAt = response.headers.get(
        "X-Snapshot-Obtained-At"
      );

      if (!obtainedAt) {
        throw new Error("Snapshot timestamp header is missing.");
      }

      const date = new Date(obtainedAt);

      if (Number.isNaN(date.getTime())) {
        throw new Error("Snapshot timestamp is invalid.");
      }

      const bundles = await response.json();

      if (!Array.isArray(bundles)) {
        throw new Error("Snapshot JSON is not an array.");
      }

      function isNumericVersion(value) {
        return (
          typeof value === "string" &&
          value.length > 0 &&
          value.split(".").every(function (part) {
            return (
              part.length > 0 &&
              [...part].every(function (character) {
                return character >= "0" && character <= "9";
              })
            );
          })
        );
      }

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

      let highestVersion = null;

      for (const bundle of bundles) {
        if (
          !bundle ||
          typeof bundle.bundle !== "string" ||
          !isNumericVersion(bundle.version)
        ) {
          continue;
        }

        if (
          highestVersion === null ||
          compareVersions(bundle.version, highestVersion) > 0
        ) {
          highestVersion = bundle.version;
        }
      }

      timeElement.textContent = date.toLocaleString();
      timeElement.dateTime = date.toISOString();

      versionElement.textContent =
        highestVersion ?? "Not available";

    } catch (error) {
      console.error("Failed to load " + version + " snapshot:", error);

      timeElement.textContent = "Unavailable";
      versionElement.textContent = "Unavailable";
    }
  }

  function refreshSnapshotTimes() {
    loadSnapshotTime("cf2023");
    loadSnapshotTime("cf2025");
  }

  refreshSnapshotTimes();
  setInterval(refreshSnapshotTimes, 60000);
</script>
</body>
</html>`;
}