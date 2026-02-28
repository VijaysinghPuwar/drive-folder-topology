/**
 * Google Drive Folder Topology — Drive API v3 (Stable + Fast)
 *
 * Requirements:
 * 1) Apps Script > Services > add "Drive API" (v3)
 * 2) Deploy as Web App (recommended: Execute as "User accessing the app")
 *
 * Notes:
 * - Uses Drive API v3 for listing children (fast).
 * - Uses DriveApp only to read the root folder name (simple).
 * - Enforces hard server-side clamps to prevent abuse.
 */

function doGet() {
  // Must have a file named Index.html (shown as "Index" in Apps Script)
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Drive Folder Topology");
}

function buildTopologyFast(folderUrl, opts) {
  opts = opts || {};

  // Hard clamps (server-side safety)
  const includeFiles = !!opts.includeFiles;
  const maxDepth = clampInt_(opts.maxDepth, 1, 50, 4);
  const maxItems = clampInt_(opts.maxItems, 100, 50000, 5000);

  const folderId = extractFolderId_(folderUrl);
  if (!folderId) {
    throw new Error("Invalid folder link. Paste a link like https://drive.google.com/drive/folders/<ID>");
  }

  // Root name (throws if no access)
  const rootName = DriveApp.getFolderById(folderId).getName();

  const lines = [rootName + "/"];
  let itemsRendered = 0;

  // Queue entries: { id, prefix, depth }
  const queue = [{ id: folderId, prefix: "", depth: 0 }];

  while (queue.length && itemsRendered < maxItems) {
    const cur = queue.shift();
    if (cur.depth >= maxDepth) continue;

    // Remaining budget for this node; listing stops early.
    const remainingBudget = Math.min(1500, Math.max(0, maxItems - itemsRendered));

    const children = listChildrenV3_(cur.id, includeFiles, remainingBudget);
    const folders = children.folders;
    const files = children.files;

    // Render folders first
    for (let i = 0; i < folders.length && itemsRendered < maxItems; i++) {
      const f = folders[i];

      const isLastFolder =
        (i === folders.length - 1) && (!includeFiles || files.length === 0);

      const branch = isLastFolder ? "└── " : "├── ";
      lines.push(cur.prefix + branch + f.name + "/");
      itemsRendered++;

      // Enqueue folder
      queue.push({
        id: f.id,
        prefix: cur.prefix + (isLastFolder ? "    " : "│   "),
        depth: cur.depth + 1
      });
    }

    if (!includeFiles || itemsRendered >= maxItems) continue;

    // Render files
    for (let j = 0; j < files.length && itemsRendered < maxItems; j++) {
      const file = files[j];
      const isLast = j === files.length - 1;
      const branch = isLast ? "└── " : "├── ";
      lines.push(cur.prefix + branch + "📄 " + file.name);
      itemsRendered++;
    }
  }

  if (itemsRendered >= maxItems) {
    lines.push("");
    lines.push(`...stopped after ${maxItems} items (increase Max items if needed)`);
  }

  return {
    folderName: rootName,
    text: lines.join("\n"),
    stats: {
      maxDepth,
      maxItems,
      includeFiles,
      itemsRendered
    }
  };
}

/** Extract folder ID from a Google Drive folders URL */
function extractFolderId_(url) {
  const m = String(url).match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Drive API v3: list children with early-stop budget.
 * Uses Drive Advanced Service: Drive.Files.list()
 *
 * @param {string} parentId
 * @param {boolean} includeFiles
 * @param {number} budget max children to collect for this parent
 */
function listChildrenV3_(parentId, includeFiles, budget) {
  const folders = [];
  const files = [];
  let pageToken = null;

  const qParts = [`'${parentId}' in parents`, "trashed=false"];
  if (!includeFiles) qParts.push("mimeType='application/vnd.google-apps.folder'");
  const q = qParts.join(" and ");

  do {
    const res = Drive.Files.list({
      q,
      fields: "files(id,name,mimeType),nextPageToken",
      pageSize: 1000,
      pageToken
    });

    const items = res.files || [];
    for (const it of items) {
      const isFolder = it.mimeType === "application/vnd.google-apps.folder";
      if (isFolder) folders.push({ id: it.id, name: it.name });
      else if (includeFiles) files.push({ id: it.id, name: it.name });

      // Early stop
      if ((folders.length + files.length) >= budget) {
        pageToken = null;
        break;
      }
    }

    if (pageToken === null) break;
    pageToken = res.nextPageToken;
  } while (pageToken);

  folders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return { folders, files };
}

/** Clamp numeric options safely */
function clampInt_(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
}
