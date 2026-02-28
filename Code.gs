/**
 * Google Drive Folder Topology — Accurate Tree Order (DFS) + Drive API v3
 *
 * Fixes:
 * - Prints TRUE folder-tree order (depth-first), not level-by-level (BFS).
 * - Keeps Drive API v3 (files/name/pageSize).
 * - Hard clamps + early-stop to prevent hangs/abuse.
 *
 * Requirements:
 * 1) Apps Script > Services > add "Drive API" (v3) with identifier "Drive"
 * 2) Deploy as Web App (recommended: Execute as "User accessing the app")
 */

function doGet() {
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
  const state = { itemsRendered: 0, stopped: false };

  // Depth-first traversal for correct sequence
  walkFolderDFS_(folderId, "", 0, maxDepth, maxItems, includeFiles, lines, state);

  if (state.stopped) {
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
      itemsRendered: state.itemsRendered
    }
  };
}

/** Extract folder ID from a Google Drive folders URL */
function extractFolderId_(url) {
  const m = String(url).match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * DFS traversal: prints each folder then immediately prints its children (true tree order)
 *
 * @param {string} folderId
 * @param {string} prefix
 * @param {number} depth
 * @param {number} maxDepth
 * @param {number} maxItems
 * @param {boolean} includeFiles
 * @param {string[]} lines
 * @param {{itemsRendered:number, stopped:boolean}} state
 */
function walkFolderDFS_(folderId, prefix, depth, maxDepth, maxItems, includeFiles, lines, state) {
  if (state.stopped) return;
  if (depth >= maxDepth) return;

  if (state.itemsRendered >= maxItems) {
    state.stopped = true;
    return;
  }

  // Limit how much we fetch per folder to avoid hangs on massive directories
  const remaining = maxItems - state.itemsRendered;
  const perFolderBudget = Math.min(2000, Math.max(0, remaining));
  if (perFolderBudget <= 0) {
    state.stopped = true;
    return;
  }

  const { folders, files } = listChildrenV3_(folderId, includeFiles, perFolderBudget);

  // Render in the exact order we want:
  // folders (A–Z), then files (A–Z) if enabled
  const children = [];
  for (const f of folders) children.push({ type: "folder", id: f.id, name: f.name });
  if (includeFiles) for (const fi of files) children.push({ type: "file", id: fi.id, name: fi.name });

  for (let i = 0; i < children.length; i++) {
    if (state.itemsRendered >= maxItems) {
      state.stopped = true;
      return;
    }

    const child = children[i];
    const isLast = i === children.length - 1;
    const branch = isLast ? "└── " : "├── ";

    if (child.type === "folder") {
      lines.push(prefix + branch + child.name + "/");
      state.itemsRendered++;

      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      walkFolderDFS_(child.id, nextPrefix, depth + 1, maxDepth, maxItems, includeFiles, lines, state);
      if (state.stopped) return;
    } else {
      lines.push(prefix + branch + "📄 " + child.name);
      state.itemsRendered++;
    }
  }
}

/**
 * Drive API v3: list children with early-stop budget.
 * Uses Drive Advanced Service: Drive.Files.list()
 *
 * @param {string} parentId
 * @param {boolean} includeFiles
 * @param {number} budget max children to collect for this parent (folders+files)
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

      if ((folders.length + files.length) >= budget) {
        pageToken = null; // early stop
        break;
      }
    }

    if (pageToken === null) break;
    pageToken = res.nextPageToken;
  } while (pageToken);

  // Stable ordering inside each folder
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
