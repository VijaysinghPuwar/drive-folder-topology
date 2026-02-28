# Google Drive Folder Topology (Apps Script Web App)

A simple **Google Apps Script Web App** that generates an accurate **Google Drive folder tree (topology)** from a folder link and lets you **copy** it or **download it as a `.txt`**.

Unlike many quick scripts, this project prints the tree in the **correct sequence** (Depth-First / DFS), so the output matches how humans expect a folder tree to look.

---

## What problem this solves

Google Drive shows folders in the UI, but it does **not** provide an easy way to:

* export a Drive folder structure to a **text file**
* share a clean, readable **folder topology** with others
* document a project’s Drive hierarchy (for teams, audits, docs, tickets)

This tool produces output like:

```
Audiobook (A)/
├── 10,000 Years In A Cultivation Sect/
│   ├── ch 1-20/
│   └── ch 21-40/
└── 80 Years Of Signing-In At The Cold Palace/
    └── ch 1-10/
```

---

## Features

* Paste a Drive **folder link**
* Options:

  * **Include files** (optional, slower)
  * **Max depth** (how deep to scan)
  * **Max items** (hard safety limit)
* Output:

  * Rendered tree on the page
  * **Copy** to clipboard
  * **Download `.txt`**
* Uses **Drive API v3** (Advanced Google Service)
* Prints in **correct tree order** (DFS), not level-by-level

---

## Limits (important)

This app uses **hard clamps** to avoid timeouts / quota issues:

* `maxDepth` is clamped to **1–50**
* `maxItems` is clamped to **100–50,000**

You *can* raise it, but Apps Script may become unreliable for very large folders (timeouts, response size limits, quota errors).

---

## Requirements

* A Google account
* Access to the folder link you paste (Viewer access is enough)
* Google Apps Script project with **Drive API (v3)** enabled

---

## Setup (step-by-step)

### 1) Create a new Apps Script project

1. Open: [https://script.google.com](https://script.google.com)
2. Click **New project**
3. Rename it (example: `Drive Topology`)

---

### 2) Create required files

In the left sidebar you will see `Code.gs`.

Now add:

1. Click **+** → **HTML**
2. Name it **Index**
   ✅ This creates `Index.html` (Apps Script displays it as `Index`)

---

### 3) Paste the code

* Replace all contents of `Code.gs` with the `Code.gs` from this repository.
* Replace all contents of `Index.html` with the `Index.html` from this repository.

> Make sure the HTML file name is exactly `Index` (Index.html).
> `doGet()` loads `HtmlService.createHtmlOutputFromFile("Index")`

---

### 4) Enable Drive API (v3)

1. Left sidebar → **Services**
2. Click **+ Add a service**
3. Choose **Drive API**
4. Ensure version is **v3**
5. Click **Save**

> If you use v2 fields (`items/title/maxResults`), you’ll get errors like:
> “Invalid field selection items”

---

### 5) Authorize permissions

1. Click **Run** in the editor (top bar)
2. Review permissions → **Allow**

> The web app also prompts authorization when used the first time.

---

### 6) Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Select **Web app**
3. Set:

   * **Execute as:** `User accessing the web app` (recommended)
   * **Who has access:** `Anyone with Google Account` (or your preference)
4. Click **Deploy**
5. Copy the **Web App URL**

---

## How to use

1. Open your **Web App URL**
2. Paste a Drive folder link like:

   ```
   https://drive.google.com/drive/folders/<FOLDER_ID>
   ```
3. Recommended settings:

   * **Include files:** OFF (fastest)
   * **Max depth:** 2–4
   * **Max items:** 1000–5000
4. Click **Generate**
5. Use **Copy** or **Download .txt**

---

## Sharing & permissions

### Recommended deployment: “User accessing the app”

* Each user sees topology only for folders they can access
* Safer and better for sharing

### Not recommended: “Execute as Me”

* Uses your Drive access
* Could expose your Drive data if misused

---

## Troubleshooting

### “Invalid field selection items” / “title” / “maxResults”

Your server code is using **Drive API v2** syntax.

Fix: ensure `listChildrenV3_()` uses v3 fields:

* `fields: "files(id,name,mimeType),nextPageToken"`
* `pageSize` (not `maxResults`)
* `res.files` (not `res.items`)

---

### “Generating…” feels slow

* Turn **Include files** OFF
* Reduce **Max depth** to 2–3
* Reduce **Max items** to 1000–5000

---

### “Quota exceeded” / “Service invoked too many times”

Apps Script quotas were hit. Try later or reduce depth/items.

---

### Web app didn’t update after code changes

Redeploy:

* Deploy → **Manage deployments** → Edit (pencil)
* Select **New version**
* Deploy

---

## GitHub safety (don’t leak personal details)

✅ Safe to publish:

* `Code.gs`
* `Index.html`

❌ Do NOT commit:

* `.clasp.json` (contains script linkage)
* any private Drive links used for testing
* screenshots that show emails or private folder names

Recomme
