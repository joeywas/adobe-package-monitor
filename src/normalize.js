function key(parts) {
  return JSON.stringify(parts);
}

/**
 * Normalize Adobe's JSON into records with stable identities.
 *
 * Bundles are identified by bundle name, version, and minimum core
 * server requirement.
 *
 * Dependencies are identified by bundle, bundle version,
 * core requirement, and dependency name.
 */
export function normalize(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Adobe JSON must contain a non-empty array of bundles"
    );
  }

  const records = new Map();

  for (const item of data) {
    if (!item || typeof item.bundle !== "string") {
      throw new Error(
        "Invalid bundle record at array index " +
          data.indexOf(item) +
          ": " +
          JSON.stringify(item)
      );
    }

    const version =
      typeof item.version === "string"
        ? item.version
        : null;

    const core =
      item.minimumcoreserverupdaterequired ?? null;

    const bundleKey = key([
      "bundle",
      item.bundle,
      version,
      core,
    ]);

    if (records.has(bundleKey)) {
      const existing = records.get(bundleKey);

      throw new Error(
        `Duplicate bundle identity: ${item.bundle}; ` +
          `minimum core update: ${JSON.stringify(core)}; ` +
          `existing version: ${existing.bundleVersion}; ` +
          `incoming version: ${version}`
      );
    }

    records.set(bundleKey, {
      type: "bundle",
      bundle: item.bundle,
      bundleVersion: version,
      itemName: item.bundle,
      itemVersion: version,
      core,
      metadata: Object.fromEntries(
        Object.entries(item).filter(
          ([field]) =>
            !["bundle", "version", "dependencies"].includes(field)
        )
      ),
    });

    if (
      item.dependencies !== undefined &&
      !Array.isArray(item.dependencies)
    ) {
      throw new Error(
        `Dependencies are invalid for ${item.bundle}; ` +
          `record: ${JSON.stringify(item)}`
      );
    }

    const dependencies = item.dependencies ?? [];

    for (const dep of dependencies) {
      if (
        !dep ||
        typeof dep.name !== "string" ||
        typeof dep.version !== "string"
      ) {
        throw new Error(
          `Invalid dependency in bundle ${item.bundle}`
        );
      }

      const depKey = key([
        "dependency",
        item.bundle,
        version,
        core,
        dep.name,
      ]);

      if (records.has(depKey)) {
        const existing = records.get(depKey);

        const existingMetadata = JSON.stringify(
          existing.metadata
        );

        const incomingMetadata = JSON.stringify({
          embedded: dep.embedded ?? null,
        });

        if (
          existing.itemVersion === dep.version &&
          existingMetadata === incomingMetadata
        ) {
          // Adobe sometimes lists the same dependency more than once.
          // Identical duplicates don't represent a change.
          continue;
        }

        throw new Error(
          `Conflicting duplicate dependency: ${dep.name}; ` +
            `bundle: ${item.bundle}; ` +
            `bundle version: ${version}; ` +
            `existing version: ${existing.itemVersion}; ` +
            `incoming version: ${dep.version}`
        );
      }

      records.set(depKey, {
        type: "dependency",
        bundle: item.bundle,
        bundleVersion: version,
        itemName: dep.name,
        itemVersion: dep.version,
        core,
        metadata: Object.fromEntries(
          Object.entries(dep).filter(
            ([field]) => !["name", "version"].includes(field)
          )
        ),
      });
    }
  }

  return records;
}

/**
 * Compare records by stable identity.
 * Versions and metadata are compared separately.
 */
export function compare(previous, current) {
  const changes = [];

  function add(type, oldItem, newItem) {
    const item = newItem || oldItem;

    changes.push({
      change_type: type,
      item_type: item.type,
      bundle: item.bundle,
      bundle_version: item.bundleVersion,
      item_name: item.itemName,
      old_version: oldItem?.itemVersion ?? null,
      new_version: newItem?.itemVersion ?? null,
      old_metadata: oldItem
        ? JSON.stringify(oldItem.metadata)
        : null,
      new_metadata: newItem
        ? JSON.stringify(newItem.metadata)
        : null,
      details: JSON.stringify({
        core: item.core,
      }),
    });
  }

  for (const [id, oldItem] of previous) {
    const newItem = current.get(id);

    if (!newItem) {
      add("removed", oldItem, null);
      continue;
    }

    if (oldItem.itemVersion !== newItem.itemVersion) {
      add("version_changed", oldItem, newItem);
    }

    if (
      JSON.stringify(oldItem.metadata) !==
      JSON.stringify(newItem.metadata)
    ) {
      add("metadata_changed", oldItem, newItem);
    }
  }

  for (const [id, newItem] of current) {
    if (!previous.has(id)) {
      add("added", null, newItem);
    }
  }

  return changes;
}