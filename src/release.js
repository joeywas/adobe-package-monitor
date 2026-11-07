const RELEASES_URL = "https://github.com/joeywas/adobe-package-monitor/releases";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

export function releaseLink(version) {
  const releaseVersion = version || "unreleased";
  const releaseUrl = releaseVersion === "unreleased"
    ? RELEASES_URL
    : RELEASES_URL + "/tag/" + encodeURIComponent(releaseVersion);

  return '<a href="' + escapeHtml(releaseUrl) + '" target="_blank" rel="noopener">' +
    escapeHtml(releaseVersion) +
    "</a>";
}