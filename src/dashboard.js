function dashboard() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Adobe ColdFusion Bundle Monitor</title>

<style>
:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #202124;
  background: #f5f7fa;
}

* {
  box-sizing: border-box;
}

body {
  max-width: 1500px;
  margin: 0 auto;
  padding: 28px 22px 50px;
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(1.7rem, 3vw, 2.3rem);
}

h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
}

p {
  line-height: 1.5;
}

a {
  color: #175cd3;
}

.muted {
  color: #667085;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 26px;
}

.header p {
  margin: 6px 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

button,
select,
input {
  font: inherit;
  padding: 10px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 7px;
  background: white;
}

button {
  cursor: pointer;
  font-weight: 600;
}

button:hover {
  background: #f0f4ff;
}

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #175cd3;
  outline-offset: 2px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 22px 0 28px;
}

.card {
  background: white;
  border: 1px solid #e0e4ea;
  border-radius: 10px;
  padding: 18px;
  min-width: 0;
}

.card-label {
  color: #667085;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.card-value {
  font-size: clamp(1.1rem, 1.6vw, 1.5rem);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.card-note {
  color: #667085;
  font-size: 0.82rem;
  margin-top: 8px;
}

.panel {
  background: white;
  border: 1px solid #e0e4ea;
  border-radius: 10px;
  padding: 22px;
  margin-top: 22px;
}

.controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 14px;
  margin: 18px 0;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

.control input,
.control select {
  width: 100%;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.table-wrap {
  overflow-x: auto;
  margin-top: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid #eaecf0;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

th {
  background: #f8fafc;
  color: #475467;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
}

tbody tr:hover {
  background: #fafbfc;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  background: #f2f4f7;
  color: #344054;
}

.badge-added,
.badge-success {
  background: #dcfae6;
  color: #067647;
}

.badge-removed,
.badge-failed {
  background: #fee4e2;
  color: #b42318;
}

.badge-version_changed {
  background: #fef0c7;
  color: #93370d;
}

.badge-metadata_changed {
  background: #e0eaff;
  color: #3538cd;
}

.badge-running {
  background: #e0f2fe;
  color: #075985;
}

.details-button {
  padding: 6px 9px;
  font-size: 0.82rem;
  white-space: nowrap;
}

.detail-row td {
  background: #f8fafc;
  padding: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-block {
  min-width: 0;
}

.detail-block strong {
  display: block;
  margin-bottom: 8px;
}

pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  background: white;
  border: 1px solid #e0e4ea;
  border-radius: 6px;
  padding: 12px;
  font-size: 0.82rem;
  max-height: 350px;
  overflow: auto;
}

.error-text {
  color: #b42318;
  white-space: pre-wrap;
}

.empty {
  padding: 28px 12px;
  text-align: center;
  color: #667085;
}

.message {
  min-height: 24px;
  margin: 12px 0;
}

.footer-note {
  color: #667085;
  font-size: 0.82rem;
  margin-top: 16px;
}

@media (max-width: 850px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .controls {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  body {
    padding: 20px 12px 35px;
  }

  .cards,
  .controls,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 15px;
  }
}
</style>
</head>

<body>
<header class="header">
  <div>
    <h1>Adobe ColdFusion Bundle Monitor</h1>
    <p class="muted">
      Created thanks to consternation and frustration with Adobe.<br>
      Fueled by coffee-flavored tears of Coldfusion admins.<br>
      Times are shown in your browser's local time zone.<br>
    </p>
    <hr>
  </div>
</header>

<section class="cards" aria-label="Monitoring overview">
  <div class="card">
    <div class="card-label">Last check</div>
    <div class="card-value" id="lastCheck">Not checked yet</div>
    <div class="card-note" id="lastCheckNote">
      Most recent check of Adobe's bundlesdependency.json.
    </div>
  </div>

  <div class="card">
    <div class="card-label">Highest bundle version</div>
    <div class="card-value" id="highestVersion">Loading...</div>
    <div class="card-note">Highest version in the latest snapshot</div>
  </div>
</section>

<section class="panel">
  <h2>Change history</h2>
  <p class="muted">
    Search for a bundle, dependency, or version. Select a change to inspect
    its previous and current metadata.
  </p>

  <div class="controls">
    <label class="control">
      Search
      <input
        id="search"
        type="search"
        placeholder="Bundle, dependency, version..."
        autocomplete="off"
      >
    </label>

    <label class="control">
      Record type
      <select id="itemType">
        <option value="">All record types</option>
        <option value="bundle">Bundles</option>
        <option value="dependency">Dependencies</option>
      </select>
    </label>

    <label class="control">
      Change type
      <select id="changeType">
        <option value="">All changes</option>
        <option value="added">Added</option>
        <option value="removed">Removed</option>
        <option value="version_changed">Version changed</option>
        <option value="metadata_changed">Metadata changed</option>
      </select>
    </label>
  </div>

  <div class="toolbar">
    <span id="message" class="muted message" role="status">
      Loading change history...
    </span>
    <button id="clearFilters" type="button">Clear filters</button>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Detected</th>
          <th>Bundles</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody id="rows">
        <tr><td colspan="9" class="empty">Loading...</td></tr>
      </tbody>
    </table>
  </div>

  <p class="footer-note">
    The dashboard requests the most recent 200 change records from the API.
    Search and filters apply to those records.
  </p>
</section>

<section class="panel">
  <h2>Recent check attempts</h2>
  <p class="muted">
    Review scheduled and manual runs, including failed checks.
  </p>

  <div id="checksMessage" class="muted message" role="status">
    Loading check history...
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Started</th>
          <th>Finished</th>
          <th>Status</th>
          <th>Bundles found</th>
          <th>Changes found</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody id="checks">
        <tr><td colspan="6" class="empty">Loading...</td></tr>
      </tbody>
    </table>
  </div>
</section>

<script>
async function getJson(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Request failed: " + path + " (" + response.status + ")");
  }

  return response.json();
}

function cell(row, value) {
  const td = document.createElement("td");

  td.textContent =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  row.appendChild(td);
  return td;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function readableChange(value) {
  const labels = {
    added: "Added",
    removed: "Removed",
    version_changed: "Version changed",
    metadata_changed: "Metadata changed"
  };

  return labels[value] || value || "Unknown";
}

function readableType(value) {
  const labels = {
    bundle: "Bundle",
    dependency: "Dependency"
  };

  return labels[value] || value || "Unknown";
}

function makeBadge(value, label) {
  const badge = document.createElement("span");
  badge.className = "badge badge-" + String(value || "").replace(/[^a-z_]/g, "");
  badge.textContent = label || value || "Unknown";
  return badge;
}

function showJson(value) {
  if (value === null || value === undefined || value === "") {
    return "No metadata recorded.";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  return String(value);
}

function addDetailsRow(mainRow, change) {
  const detailRow = document.createElement("tr");
  detailRow.className = "detail-row";
  detailRow.hidden = true;

  const td = document.createElement("td");
  td.colSpan = 9;

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  const oldBlock = document.createElement("div");
  oldBlock.className = "detail-block";

  const oldTitle = document.createElement("strong");
  oldTitle.textContent = "Previous metadata";

  const oldPre = document.createElement("pre");
  oldPre.textContent = showJson(change.old_metadata);

  oldBlock.append(oldTitle, oldPre);

  const newBlock = document.createElement("div");
  newBlock.className = "detail-block";

  const newTitle = document.createElement("strong");
  newTitle.textContent = "Current metadata";

  const newPre = document.createElement("pre");
  newPre.textContent = showJson(change.new_metadata);

  newBlock.append(newTitle, newPre);
  grid.append(oldBlock, newBlock);

  if (change.details) {
    const extra = document.createElement("div");
    extra.className = "detail-block";

    const extraTitle = document.createElement("strong");
    extraTitle.textContent = "Additional details";

    const extraPre = document.createElement("pre");
    extraPre.textContent = showJson(change.details);

    extra.append(extraTitle, extraPre);
    grid.appendChild(extra);
  }

  td.appendChild(grid);
  detailRow.appendChild(td);

  const buttonCell = mainRow.lastElementChild;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "details-button";
  button.textContent = "View details";
  button.setAttribute("aria-expanded", "false");

  button.addEventListener("click", function () {
    const isOpen = !detailRow.hidden;
    detailRow.hidden = isOpen;
    button.textContent = isOpen ? "View details" : "Hide details";
    button.setAttribute("aria-expanded", String(!isOpen));
  });

  buttonCell.appendChild(button);

  return detailRow;
}

let allChanges = [];
let loadInProgress = false;
let dashboardStatus = null;

const cfVersion = window.location.pathname.startsWith("/cf2025")
  ? "cf2025"
  : "cf2023";

function renderChanges() {
  const searchTerm = document
    .getElementById("search")
    .value
    .trim()
    .toLowerCase();

  const selectedItemType = document.getElementById("itemType").value;
  const selectedChangeType = document.getElementById("changeType").value;

  const rows = document.getElementById("rows");
  rows.replaceChildren();

  // Apply the existing search and filters to individual changes.
  const filtered = allChanges.filter(function (change) {
    if (
      selectedItemType &&
      change.item_type !== selectedItemType
    ) {
      return false;
    }

    if (
      selectedChangeType &&
      change.change_type !== selectedChangeType
    ) {
      return false;
    }

    if (searchTerm) {
      const searchable = [
        change.bundle,
        change.bundle_version,
        change.item_name,
        change.old_version,
        change.new_version,
        change.change_type,
        change.item_type,
        change.old_metadata,
        change.new_metadata,
        change.details
      ]
        .map(function (value) {
          if (value === null || value === undefined) return "";

          return typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
        })
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  // Group all matching changes by detection timestamp.
  const groups = new Map();

  for (const change of filtered) {
    if (!groups.has(change.detected_at)) {
      groups.set(change.detected_at, []);
    }

    groups.get(change.detected_at).push(change);
  }

  document.getElementById("message").textContent =
    "Showing " + groups.size + " detection events containing " +
    filtered.length + " change records (" +
    allChanges.length + " records loaded).";

  if (filtered.length === 0) {
    // If this version has never recorded a change, show its baseline.
    if (
      allChanges.length === 0 &&
      dashboardStatus?.initial_load_at
    ) {
      const tr = document.createElement("tr");

      // Initial snapshot timestamp.
      cell(tr, formatDate(dashboardStatus.initial_load_at));

      // Initial-load description.
      cell(tr, "Initial load — baseline snapshot captured");

      // Button to view the original baseline JSON.
      const actionCell = document.createElement("td");
      const jsonButton = document.createElement("button");

      jsonButton.type = "button";
      jsonButton.className = "details-button";
      jsonButton.textContent = "View JSON";
      jsonButton.title = "View the initial baseline snapshot";

      jsonButton.addEventListener("click", function () {
        const snapshotUrl =
          "/api/snapshot?version=" +
          encodeURIComponent(cfVersion) +
          "&detected_at=" +
          encodeURIComponent(dashboardStatus.initial_load_at);

        window.open(snapshotUrl, "_blank", "noopener,noreferrer");
      });

      actionCell.appendChild(jsonButton);
      tr.appendChild(actionCell);
      rows.appendChild(tr);

      document.getElementById("message").textContent =
        "Showing the initial baseline snapshot. No bundle changes have been recorded yet.";

      return;
    }

    // Preserve the existing message when filters produce no results.
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = 3;
    td.className = "empty";
    td.textContent = "No changes match your search and filters.";

    tr.appendChild(td);
    rows.appendChild(tr);
    return;
  }

  // One summary row per detection timestamp.
  for (const [timestamp, changes] of groups) {
    const tr = document.createElement("tr");

    // Count bundle additions and removals.
    let bundlesAdded = 0;
    let bundlesRemoved = 0;
    let dependenciesChanged = 0;

    for (const change of changes) {
      if (
        change.item_type === "bundle" &&
        change.change_type === "added"
      ) {
        bundlesAdded++;
      }

      if (
        change.item_type === "bundle" &&
        change.change_type === "removed"
      ) {
        bundlesRemoved++;
      }

      if (change.item_type === "dependency") {
        dependenciesChanged++;
      }
    }

    // Detected
    cell(tr, formatDate(timestamp));

    // Bundles summary
    const bundleParts = [];

    if (bundlesAdded > 0) {
      bundleParts.push(bundlesAdded + " added");
    }

    if (bundlesRemoved > 0) {
      bundleParts.push(bundlesRemoved + " removed");
    }

    cell(tr, bundleParts.length > 0 ? bundleParts.join(", ") : "None");

    // Details button
    const detailsCell = document.createElement("td");

    // View details button
    const button = document.createElement("button");

    button.type = "button";
    button.className = "details-button";
    button.textContent = "View details";
    button.setAttribute("aria-expanded", "false");

    detailsCell.appendChild(button);

    // View JSON button
    const jsonButton = document.createElement("button");

    jsonButton.type = "button";
    jsonButton.className = "details-button";
    jsonButton.textContent = "View JSON";
    jsonButton.title = "Open the JSON snapshot captured during this check";

    jsonButton.addEventListener("click", function () {
      const snapshotUrl =
        "/api/snapshot?version=" + encodeURIComponent(cfVersion) +
        "&detected_at=" + encodeURIComponent(timestamp);

      window.open(snapshotUrl, "_blank", "noopener,noreferrer");
    });

    detailsCell.appendChild(jsonButton);
    tr.appendChild(detailsCell);

    // Expandable row containing individual changes.
    const detailRow = document.createElement("tr");
    detailRow.className = "detail-row";
    detailRow.hidden = true;

    const detailCell = document.createElement("td");
    detailCell.colSpan = 3;

    const detailGrid = document.createElement("div");
    detailGrid.className = "detail-grid";

    for (const change of changes) {
      const block = document.createElement("div");
      block.className = "detail-block";

      const title = document.createElement("strong");

      title.textContent =
        readableChange(change.change_type) +
        " — " +
        readableType(change.item_type) +
        ": " +
        (change.bundle || "(unknown bundle)") +
        (change.bundle_version
          ? " (" + change.bundle_version + ")"
          : "") +
        (change.item_name
          ? " / " + change.item_name
          : "");

      block.appendChild(title);

      // Show version information when available.
      if (change.old_version || change.new_version) {
        const versions = document.createElement("p");

        versions.textContent =
          "Version: " +
          (change.old_version || "(none)") +
          " → " +
          (change.new_version || "(none)");

        block.appendChild(versions);
      }

      // Previous metadata.
      const oldTitle = document.createElement("strong");
      oldTitle.textContent = "Previous metadata";

      const oldPre = document.createElement("pre");
      oldPre.textContent = showJson(change.old_metadata);

      block.append(oldTitle, oldPre);

      // Current metadata.
      const newTitle = document.createElement("strong");
      newTitle.textContent = "Current metadata";

      const newPre = document.createElement("pre");
      newPre.textContent = showJson(change.new_metadata);

      block.append(newTitle, newPre);

      // Additional details.
      if (change.details) {
        const extraTitle = document.createElement("strong");
        extraTitle.textContent = "Additional details";

        const extraPre = document.createElement("pre");
        extraPre.textContent = showJson(change.details);

        block.append(extraTitle, extraPre);
      }

      detailGrid.appendChild(block);
    }

    detailCell.appendChild(detailGrid);
    detailRow.appendChild(detailCell);

    button.addEventListener("click", function () {
      const opening = detailRow.hidden;

      detailRow.hidden = !opening;
      button.textContent = opening ? "Hide details" : "View details";
      button.setAttribute("aria-expanded", String(opening));
    });

    rows.appendChild(tr);
    rows.appendChild(detailRow);
  }
}

function renderChecks(checks) {
  const rows = document.getElementById("checks");
  rows.replaceChildren();

  document.getElementById("checksMessage").textContent =
    checks.length
      ? "Showing " + checks.length + " recent check attempts."
      : "No check attempts found.";

  if (!checks.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "empty";
    td.textContent = "No check attempts have been recorded.";
    tr.appendChild(td);
    rows.appendChild(tr);
    return;
  }

  for (const check of checks) {
    const tr = document.createElement("tr");

    cell(tr, formatDate(check.started_at));
    cell(tr, check.finished_at ? formatDate(check.finished_at) : "In progress");

    const statusCell = document.createElement("td");
    const status = String(check.status || "unknown").toLowerCase();

    let statusLabel = status;
    if (status === "success" || status === "successful") {
      statusLabel = "Success";
    } else if (status === "failed" || status === "error") {
      statusLabel = "Failed";
    } else if (status === "running" || status === "in_progress") {
      statusLabel = "Running";
    }

    statusCell.appendChild(makeBadge(status, statusLabel));
    tr.appendChild(statusCell);

    cell(tr, check.bundles_found);
    cell(tr, check.changes_found);

    const errorCell = cell(tr, check.error_message);
    if (check.error_message) {
      errorCell.className = "error-text";
    }

    rows.appendChild(tr);
  }
}

async function load() {
  if (loadInProgress) return;

  loadInProgress = true;

  document.getElementById("message").textContent =
    "Loading change history...";
  document.getElementById("checksMessage").textContent =
    "Loading check history...";

  try {
    const itemType = document.getElementById("itemType").value;
    const changeType = document.getElementById("changeType").value;

    const changesPath =
      "/api/changes?version=" + encodeURIComponent(cfVersion) +
      "&limit=200" +
      "&item_type=" + encodeURIComponent(itemType) +
      "&type=" + encodeURIComponent(changeType);

    const results = await Promise.all([
      getJson("/api/status?version=" + encodeURIComponent(cfVersion)),
      getJson(changesPath),
      getJson("/api/checks?version=" + encodeURIComponent(cfVersion))
    ]);

    const status = results[0];
    const changes = results[1];
    const checks = results[2];
    dashboardStatus = status;

    document.getElementById("lastCheck").textContent =
      status.last_successful_check
        ? formatDate(status.last_successful_check)
        : "Not checked yet";

    document.getElementById("highestVersion").textContent =
      status.highest_bundle_version || "No version found";

    allChanges = Array.isArray(changes) ? changes : [];
    renderChanges();
    renderChecks(Array.isArray(checks) ? checks : []);

    document.getElementById("lastCheckNote").textContent =
      "Most recent check of Adobe's " + cfVersion +
      " bundlesdependency.json. ";
  } catch (error) {
    document.getElementById("message").textContent =
      "Unable to load dashboard data: " + error.message;

    document.getElementById("checksMessage").textContent =
      "Check that the Worker and its API endpoints are available.";
  } finally {
    loadInProgress = false;
  }
}

document.getElementById("itemType").addEventListener("change", load);
document.getElementById("changeType").addEventListener("change", load);

document.getElementById("search").addEventListener("input", renderChanges);

document.getElementById("clearFilters").addEventListener("click", function () {
  document.getElementById("search").value = "";
  document.getElementById("itemType").value = "";
  document.getElementById("changeType").value = "";
  load();
});

load();

// Refresh the dashboard every 60 seconds.
setInterval(function () {
  load();
}, 60000);
</script>
</body>
</html>`;
}

export { dashboard };