# 🐶 Moose's Plant Care

A fully **offline-capable, static** plant-care website that runs anywhere — laptop, phone, or tablet. Tracks watering schedules, per-plant care guides, soil mixes, placement recommendations, todos, and an optional in-app Claude chat (bring your own API key).

This folder is **ready to publish to GitHub Pages** — it's plain HTML/CSS/JS with **no build step and no backend**.

**Live site:** `https://<your-username>.github.io/<your-repo-name>/`
*(fill in after you enable Pages — see below)*

---

## 📁 What's in here

```
.
├── index.html                 # the app (loads the css/js below)
├── css/styles.css             # all styling (light + dark themes)
├── js/
│   ├── plants-data.js         # plant database (care data, soil, placement, repot signs)
│   ├── watering.js            # watering-schedule engine + localStorage stores
│   └── app.js                 # UI, tabs, chat, import/export
├── data/
│   ├── watering-log.json      # empty starter template (your real data lives in your browser)
│   └── images/                # (kept empty in the repo — your photos stay local)
├── offline/
│   └── Mooses-Plant-Care.html          # single-file build you can save straight to a phone
├── .nojekyll                  # tells Pages to serve files as-is (no Jekyll processing)
├── .gitignore                 # keeps your personal exports/photos out of the repo
└── .github/workflows/deploy.yml   # OPTIONAL auto-deploy workflow (see Method B)
```

> **Your data is private.** The app stores everything you log (waterings, snoozes, todos, photos, chat notes, and your Claude API key) in your browser's `localStorage` on your own device. Nothing is uploaded anywhere. The repo only ships the empty `data/watering-log.json` template, and `.gitignore` is set up so your personal exports and photos never get committed by accident.

---

## 🚀 Publish to GitHub Pages

You only need to do the one-time setup once. There are two methods — **pick one**.

### First: create the repo and push this folder

The **contents of this folder must sit at the root of the repo** (so `index.html` is at the top level of the repo, not inside a subfolder).

```bash
# from inside this plant-care-site folder:
git init
git add .
git commit -m "Initial commit: Plant Care Hub static site"
git branch -M main

# create an empty repo on GitHub first (no README), then:
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

> Tip: you can also let the GitHub CLI create the repo for you in one step:
> `gh repo create <your-repo-name> --public --source=. --remote=origin --push`

### Method A — Deploy from a branch (simplest, no workflow)

1. On GitHub, go to your repo → **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to **`/ (root)`**, then **Save**.
4. Wait ~1 minute. GitHub shows the live URL at the top of the Pages settings:
   `https://<your-username>.github.io/<your-repo-name>/`

Because Method A doesn't run the workflow, you can delete `.github/workflows/deploy.yml` if you want.

### Method B — GitHub Actions (uses the included workflow)

1. On GitHub, go to your repo → **Settings** → **Pages**.
2. Under **Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab). The included
   `.github/workflows/deploy.yml` uploads the whole folder and deploys it.
4. The live URL appears in the workflow run summary and in Settings → Pages.

---

## 🔄 Updating the site later

Just edit the files and push again:

```bash
git add .
git commit -m "Update plant data / fix / feature"
git push
```

- **Method A** republishes automatically within a minute of the push.
- **Method B** re-runs the deploy workflow on every push to `main`.

If you maintain the original multi-folder project separately, see
`SYNC.md` for the one-command copy script that refreshes this folder from source.

---

## 💻 Run it locally (optional)

You don't need a server to develop — but a local server avoids the browser
`file://` restriction on loading `data/watering-log.json`:

```bash
# any one of these, from this folder:
python -m http.server 8000      # then open http://localhost:8000
npx serve .
php -S localhost:8000
```

Or, for the phone, just open `offline/Mooses-Plant-Care.html` directly —
it's a single self-contained file with everything inlined.

---

## 🔐 Note on the Claude chat feature

The **🤖 Ask Claude** tab calls Anthropic's API **directly from your browser** using
a key you paste in yourself (stored only in your browser, never committed to the repo).
This is fine for a personal, single-user, static site. **Do not** hard-code an API key
into any file in this repo — anything pushed to a public GitHub Pages site is world-readable.
