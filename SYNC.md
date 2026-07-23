# Keeping this deploy folder up to date

This `plant-care-site/` folder is a **publishable copy** of the runtime files from
the main `Plant_Care/` project (which also holds the dev tooling, docs, and the
spreadsheet importer that don't belong on a public site).

When you change plant data, styling, or app logic in the `Plant_Care` source
project, refresh this folder with the included sync script:

```bash
# from the Plant_Care source directory:
node tools/build-single-html.js   # rebuild the single-file offline bundle
node tools/build-pages.js         # copy runtime files into ../plant-care-site
```

`build-pages.js` copies only the runtime assets:

| Source (`Plant_Care/`)                   | Here (`plant-care-site/`)                |
|------------------------------------------|------------------------------------------|
| `index.html`                             | `index.html`                             |
| `css/styles.css`                         | `css/styles.css`                         |
| `js/plants-data.js`                      | `js/plants-data.js`                      |
| `js/watering.js`                         | `js/watering.js`                         |
| `js/app.js`                              | `js/app.js`                              |
| `data/watering-log.json`                 | `data/watering-log.json`                 |
| `data/images/README.md`                  | `data/images/README.md`                  |
| `dist/Mooses-Plant-Care.html`            | `offline/Mooses-Plant-Care.html`         |

It **never** overwrites the Pages-only files that live only here:
`README.md`, `.nojekyll`, `.gitignore`, `.github/workflows/deploy.yml`, this
`SYNC.md`, or the repo's `.git` history.

Then publish:

```bash
# from this plant-care-site directory:
git add .
git commit -m "Update site"
git push
```
