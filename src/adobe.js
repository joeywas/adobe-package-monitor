import { MAX_BODY_BYTES } from "./config.js";
import { normalize } from "./normalize.js";

export async function fetchAdobe(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `Adobe returned HTTP ${response.status}`
    );
  }

  const body = await response.text();

  if (
    new TextEncoder().encode(body).length > MAX_BODY_BYTES
  ) {
    throw new Error("Adobe JSON exceeds the size limit");
  }

  const data = JSON.parse(body);

  // Reject invalid or unexpected responses before storing them.
  normalize(data);

  return { body, data };
}